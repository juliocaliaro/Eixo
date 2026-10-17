-- ==============================================================================
-- EIXO - MIGRACAO: BANCO COMO FONTE UNICA DA VERDADE (sem cache local, sem tombstones)
-- Idempotente: pode ser executada mais de uma vez. Execute no SQL Editor do Supabase.
--
-- O que faz:
--  1. Garante as colunas que o app passa a exigir (ambientes, ambiente, ordem,
--     quantidade, periodo) -- o frontend nao mescla mais agrupamentos do cache local.
--  2. Migra o legado: ambiente codificado como pseudo-evidencia '__AMBIENTE__:' vira
--     a coluna tarefas.ambiente; evidencias/assinaturas duplicadas sao deduplicadas.
--  3. Garante ON DELETE CASCADE nas FKs filhas (exclusoes reconciliadas por diff).
--  4. Triggers de updated_at (o app nao envia updated_at).
--  5. Templates por usuario (chave composta criado_por + id).
--  6. Funcoes auxiliares de acesso e reescrita das politicas RLS (AGENTS.md sec. 23):
--     construtor = CRUD nas suas obras; cliente = SELECT nas obras associadas e
--     INSERT/UPDATE somente em decisoes e decisao_assinaturas.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. COLUNAS
-- ------------------------------------------------------------------------------
ALTER TABLE public.etapas ADD COLUMN IF NOT EXISTS ambientes TEXT[] DEFAULT '{}';
ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS ambiente TEXT;
ALTER TABLE public.tarefa_evidencias ADD COLUMN IF NOT EXISTS ordem INT NOT NULL DEFAULT 0;
ALTER TABLE public.punch_list_items ADD COLUMN IF NOT EXISTS ordem INT NOT NULL DEFAULT 0;
ALTER TABLE public.registro_locacoes ADD COLUMN IF NOT EXISTS quantidade INTEGER;
ALTER TABLE public.registro_locacoes ADD COLUMN IF NOT EXISTS periodo VARCHAR(50);
ALTER TABLE public.registro_locacoes ADD COLUMN IF NOT EXISTS fotos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS cliente_email VARCHAR(255);
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS emails_clientes TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_tarefas_etapa_ambiente ON public.tarefas(etapa_id, ambiente);
CREATE INDEX IF NOT EXISTS idx_obras_cliente_email ON public.obras(cliente_email);
CREATE INDEX IF NOT EXISTS idx_obras_emails_clientes ON public.obras USING GIN(emails_clientes);

-- ------------------------------------------------------------------------------
-- 2. MIGRACAO DE DADOS LEGADOS
-- ------------------------------------------------------------------------------
-- 2a. ambiente que vivia como pseudo-evidencia '__AMBIENTE__:<nome>'
UPDATE public.tarefas t
SET ambiente = btrim(substr(ev.conteudo, length('__AMBIENTE__:') + 1))
FROM (
    SELECT DISTINCT ON (tarefa_id) tarefa_id, conteudo
    FROM public.tarefa_evidencias
    WHERE tipo = 'anotacao'
      AND conteudo LIKE '\_\_AMBIENTE\_\_:%'
      AND conteudo <> '__AMBIENTE__:__NONE__'
    ORDER BY tarefa_id, created_at DESC
) ev
WHERE ev.tarefa_id = t.id
  AND (t.ambiente IS NULL OR btrim(t.ambiente) = '');

DELETE FROM public.tarefa_evidencias WHERE conteudo LIKE '\_\_AMBIENTE\_\_:%';

-- 2b. etapas.ambientes a partir dos ambientes das tarefas (apenas quando vazio)
DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'etapas' AND column_name = 'ambientes') = 'ARRAY' THEN
        UPDATE public.etapas e
        SET ambientes = sub.amb
        FROM (
            SELECT t.etapa_id, array_agg(DISTINCT btrim(t.ambiente)) AS amb
            FROM public.tarefas t
            WHERE t.ambiente IS NOT NULL AND btrim(t.ambiente) <> ''
            GROUP BY t.etapa_id
        ) sub
        WHERE sub.etapa_id = e.id
          AND COALESCE(cardinality(e.ambientes), 0) = 0;
    END IF;
END $$;

-- 2c. evidencias duplicadas (o salvamento antigo regravava ids aleatorios a cada save)
DELETE FROM public.tarefa_evidencias a
USING public.tarefa_evidencias b
WHERE a.tarefa_id = b.tarefa_id
  AND a.tipo = b.tipo
  AND a.conteudo = b.conteudo
  AND a.ctid > b.ctid;

-- 2d. assinaturas duplicadas + unicidade (uma assinatura por papel em cada decisao)
DELETE FROM public.decisao_assinaturas a
USING public.decisao_assinaturas b
WHERE a.decisao_id = b.decisao_id
  AND a.papel = b.papel
  AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS ux_assinaturas_decisao_papel
    ON public.decisao_assinaturas(decisao_id, papel);

-- 2e. ordem inicial dos itens de vistoria (por data de criacao)
UPDATE public.punch_list_items p
SET ordem = r.rn
FROM (
    SELECT id, row_number() OVER (PARTITION BY obra_id ORDER BY created_at, id) AS rn
    FROM public.punch_list_items
) r
WHERE r.id = p.id AND p.ordem = 0;

-- ------------------------------------------------------------------------------
-- 3. ON DELETE CASCADE NAS FKs FILHAS
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
    c RECORD;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('etapas', 'obra_id', 'obras'),
            ('tarefas', 'etapa_id', 'etapas'),
            ('tarefa_evidencias', 'tarefa_id', 'tarefas'),
            ('decisoes', 'obra_id', 'obras'),
            ('decisao_assinaturas', 'decisao_id', 'decisoes'),
            ('projetos_pdf', 'obra_id', 'obras'),
            ('registro_notas', 'obra_id', 'obras'),
            ('punch_list_items', 'obra_id', 'obras'),
            ('registro_locacoes', 'obra_id', 'obras')
        ) AS v(tbl, col, ref)
    LOOP
        FOR c IN
            SELECT con.conname
            FROM pg_constraint con
            JOIN pg_class cl ON cl.oid = con.conrelid
            JOIN pg_namespace n ON n.oid = cl.relnamespace
            JOIN pg_attribute a ON a.attrelid = cl.oid AND a.attnum = ANY (con.conkey)
            WHERE con.contype = 'f'
              AND n.nspname = 'public'
              AND cl.relname = r.tbl
              AND a.attname = r.col
              AND con.confdeltype <> 'c'
        LOOP
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tbl, c.conname);
            EXECUTE format(
                'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(id) ON DELETE CASCADE',
                r.tbl, c.conname, r.col, r.ref
            );
        END LOOP;
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 4. TRIGGER DE updated_at (o app nao envia updated_at)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.eixo_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_obras_updated_at ON public.obras;
CREATE TRIGGER trg_obras_updated_at BEFORE UPDATE ON public.obras
    FOR EACH ROW EXECUTE PROCEDURE public.eixo_touch_updated_at();

DROP TRIGGER IF EXISTS trg_decisoes_updated_at ON public.decisoes;
CREATE TRIGGER trg_decisoes_updated_at BEFORE UPDATE ON public.decisoes
    FOR EACH ROW EXECUTE PROCEDURE public.eixo_touch_updated_at();

-- ------------------------------------------------------------------------------
-- 5. TEMPLATES POR USUARIO (chave composta criado_por + id)
-- ------------------------------------------------------------------------------
ALTER TABLE public.modelos_etapas_templates DROP CONSTRAINT IF EXISTS modelos_etapas_templates_pkey;
CREATE UNIQUE INDEX IF NOT EXISTS ux_templates_owner_id
    ON public.modelos_etapas_templates(criado_por, id);

-- ------------------------------------------------------------------------------
-- 6. FUNCOES DE ACESSO E POLITICAS RLS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.eixo_obra_visivel(p_obra_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.obras o
        WHERE o.id = p_obra_id
          AND (
              o.construtor_id = auth.uid()
              OR o.cliente_id = auth.uid()
              OR LOWER(auth.jwt() ->> 'email') = LOWER(o.cliente_email)
              OR LOWER(auth.jwt() ->> 'email') = ANY (
                  SELECT LOWER(x) FROM unnest(COALESCE(o.emails_clientes, '{}')) AS x
              )
          )
    );
$$;

CREATE OR REPLACE FUNCTION public.eixo_obra_do_construtor(p_obra_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.obras o WHERE o.id = p_obra_id AND o.construtor_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.eixo_etapa_obra(p_etapa_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT obra_id FROM public.etapas WHERE id = p_etapa_id;
$$;

CREATE OR REPLACE FUNCTION public.eixo_tarefa_obra(p_tarefa_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT e.obra_id FROM public.tarefas t JOIN public.etapas e ON e.id = t.etapa_id WHERE t.id = p_tarefa_id;
$$;

CREATE OR REPLACE FUNCTION public.eixo_decisao_obra(p_decisao_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT obra_id FROM public.decisoes WHERE id = p_decisao_id;
$$;

REVOKE ALL ON FUNCTION public.eixo_obra_visivel(UUID), public.eixo_obra_do_construtor(UUID),
    public.eixo_etapa_obra(UUID), public.eixo_tarefa_obra(UUID), public.eixo_decisao_obra(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eixo_obra_visivel(UUID), public.eixo_obra_do_construtor(UUID),
    public.eixo_etapa_obra(UUID), public.eixo_tarefa_obra(UUID), public.eixo_decisao_obra(UUID) TO authenticated;

-- Remove TODAS as politicas anteriores das tabelas do Eixo (inclusive as que permitiam auth.uid() IS NULL)
DO $$
DECLARE p RECORD;
BEGIN
    FOR p IN
        SELECT schemaname, tablename, policyname FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('profiles', 'obras', 'etapas', 'tarefas', 'tarefa_evidencias', 'decisoes',
                            'decisao_assinaturas', 'projetos_pdf', 'registro_notas', 'punch_list_items',
                            'registro_locacoes', 'modelos_etapas_templates')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefa_evidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisao_assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projetos_pdf ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registro_notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.punch_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registro_locacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modelos_etapas_templates ENABLE ROW LEVEL SECURITY;

-- Perfis
CREATE POLICY "Perfis visiveis a usuarios autenticados" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Usuario cria o proprio perfil" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Usuario edita o proprio perfil" ON public.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Obras
CREATE POLICY "Construtor gerencia suas obras" ON public.obras
    FOR ALL USING (auth.uid() = construtor_id) WITH CHECK (auth.uid() = construtor_id);
CREATE POLICY "Cliente visualiza obras atribuidas" ON public.obras
    FOR SELECT USING (
        auth.uid() = cliente_id
        OR LOWER(auth.jwt() ->> 'email') = LOWER(cliente_email)
        OR LOWER(auth.jwt() ->> 'email') = ANY (SELECT LOWER(x) FROM unnest(COALESCE(emails_clientes, '{}')) AS x)
    );

-- Etapas
CREATE POLICY "Ver etapas" ON public.etapas FOR SELECT USING (public.eixo_obra_visivel(obra_id));
CREATE POLICY "Construtor gerencia etapas" ON public.etapas
    FOR ALL USING (public.eixo_obra_do_construtor(obra_id)) WITH CHECK (public.eixo_obra_do_construtor(obra_id));

-- Tarefas
CREATE POLICY "Ver tarefas" ON public.tarefas
    FOR SELECT USING (public.eixo_obra_visivel(public.eixo_etapa_obra(etapa_id)));
CREATE POLICY "Construtor gerencia tarefas" ON public.tarefas
    FOR ALL USING (public.eixo_obra_do_construtor(public.eixo_etapa_obra(etapa_id)))
    WITH CHECK (public.eixo_obra_do_construtor(public.eixo_etapa_obra(etapa_id)));

-- Evidencias
CREATE POLICY "Ver evidencias" ON public.tarefa_evidencias
    FOR SELECT USING (public.eixo_obra_visivel(public.eixo_tarefa_obra(tarefa_id)));
CREATE POLICY "Construtor gerencia evidencias" ON public.tarefa_evidencias
    FOR ALL USING (public.eixo_obra_do_construtor(public.eixo_tarefa_obra(tarefa_id)))
    WITH CHECK (public.eixo_obra_do_construtor(public.eixo_tarefa_obra(tarefa_id)));

-- Decisoes (bilateral: construtor E cliente propoem/assinam; exclusao apenas do construtor)
CREATE POLICY "Ver decisoes" ON public.decisoes FOR SELECT USING (public.eixo_obra_visivel(obra_id));
CREATE POLICY "Propor decisoes" ON public.decisoes FOR INSERT WITH CHECK (public.eixo_obra_visivel(obra_id));
CREATE POLICY "Assinar ou atualizar decisoes" ON public.decisoes
    FOR UPDATE USING (public.eixo_obra_visivel(obra_id)) WITH CHECK (public.eixo_obra_visivel(obra_id));
CREATE POLICY "Construtor exclui decisoes" ON public.decisoes
    FOR DELETE USING (public.eixo_obra_do_construtor(obra_id));

-- Assinaturas
CREATE POLICY "Ver assinaturas" ON public.decisao_assinaturas
    FOR SELECT USING (public.eixo_obra_visivel(public.eixo_decisao_obra(decisao_id)));
CREATE POLICY "Inserir assinatura" ON public.decisao_assinaturas
    FOR INSERT WITH CHECK (public.eixo_obra_visivel(public.eixo_decisao_obra(decisao_id)));
CREATE POLICY "Atualizar assinatura" ON public.decisao_assinaturas
    FOR UPDATE USING (public.eixo_obra_visivel(public.eixo_decisao_obra(decisao_id)))
    WITH CHECK (public.eixo_obra_visivel(public.eixo_decisao_obra(decisao_id)));
CREATE POLICY "Construtor exclui assinaturas" ON public.decisao_assinaturas
    FOR DELETE USING (public.eixo_obra_do_construtor(public.eixo_decisao_obra(decisao_id)));

-- Projetos, notas, vistoria e locacoes (cliente apenas le)
CREATE POLICY "Ver projetos" ON public.projetos_pdf FOR SELECT USING (public.eixo_obra_visivel(obra_id));
CREATE POLICY "Construtor gerencia projetos" ON public.projetos_pdf
    FOR ALL USING (public.eixo_obra_do_construtor(obra_id)) WITH CHECK (public.eixo_obra_do_construtor(obra_id));

CREATE POLICY "Ver notas" ON public.registro_notas FOR SELECT USING (public.eixo_obra_visivel(obra_id));
CREATE POLICY "Construtor gerencia notas" ON public.registro_notas
    FOR ALL USING (public.eixo_obra_do_construtor(obra_id)) WITH CHECK (public.eixo_obra_do_construtor(obra_id));

CREATE POLICY "Ver vistoria final" ON public.punch_list_items FOR SELECT USING (public.eixo_obra_visivel(obra_id));
CREATE POLICY "Construtor gerencia vistoria final" ON public.punch_list_items
    FOR ALL USING (public.eixo_obra_do_construtor(obra_id)) WITH CHECK (public.eixo_obra_do_construtor(obra_id));

CREATE POLICY "Ver locacoes" ON public.registro_locacoes FOR SELECT USING (public.eixo_obra_visivel(obra_id));
CREATE POLICY "Construtor gerencia locacoes" ON public.registro_locacoes
    FOR ALL USING (public.eixo_obra_do_construtor(obra_id)) WITH CHECK (public.eixo_obra_do_construtor(obra_id));

-- Templates: cada usuario le e gerencia apenas os proprios modelos
CREATE POLICY "Usuario gerencia seus modelos" ON public.modelos_etapas_templates
    FOR ALL USING (auth.uid() = criado_por) WITH CHECK (auth.uid() = criado_por);

-- Recarrega o cache de schema do PostgREST
NOTIFY pgrst, 'reload schema';
