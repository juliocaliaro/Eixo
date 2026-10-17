-- ==============================================================================
-- EIXO - MIGRACAO: HARDENING DE RLS, INTEGRIDADE DE DECISOES, PERFIS E STORAGE
-- Idempotente. Execute no SQL Editor do Supabase APOS 20261017120000_eixo_banco_fonte_unica.sql.
--
-- O que faz:
--  1. Schema `private` (nao exposto pelo PostgREST) com helpers SECURITY DEFINER
--     (can_access_obra / can_write_obra e auxiliares), search_path vazio.
--  2. Normaliza emails (minusculos) e faz backfill de assinaturas do criador.
--  3. Constraints (emails minusculos, valores >= 0, construtor_id NOT NULL guardado) e indices.
--  4. Triggers de integridade das decisoes e das assinaturas.
--  5. Perfis: role/email imutaveis para o usuario, SELECT restrito, handle_new_user endurecido.
--  6. Reescrita de TODAS as politicas (TO authenticated, (select auth.uid()), WITH CHECK explicito).
--  7. Politicas de storage.objects por obra (primeira pasta do caminho = obra_id).
--
-- Regras (AGENTS.md secao 23): construtor = CRUD nas suas obras; cliente = SELECT nas obras
-- associadas e INSERT/UPDATE somente em decisoes e decisao_assinaturas.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SCHEMA PRIVATE
-- ------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
-- Funcoes novas no schema private nao ficam executaveis por PUBLIC/anon por padrao.
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- ------------------------------------------------------------------------------
-- 2. DADOS: emails minusculos + backfill de assinaturas do criador
-- ------------------------------------------------------------------------------
UPDATE public.obras o
SET emails_clientes = COALESCE(
        (SELECT array_agg(DISTINCT lower(btrim(x))) FROM unnest(o.emails_clientes) AS x WHERE btrim(x) <> ''),
        '{}'::text[]),
    cliente_email = NULLIF(lower(btrim(o.cliente_email)), '')
WHERE o.emails_clientes IS NULL
   OR o.emails_clientes::text <> lower(o.emails_clientes::text)
   OR o.cliente_email IS DISTINCT FROM NULLIF(lower(btrim(o.cliente_email)), '');

-- Decisoes legadas sem linha de assinatura do criador: cria a linha. Sem isso, a assinatura sintetica
-- do app seria inserida por qualquer parte na proxima gravacao e o trigger de integridade a recusaria.
INSERT INTO public.decisao_assinaturas (decisao_id, user_id, papel, autor_perfil, nome_signatario, assinado_em)
SELECT d.id, d.criador_id, 'criador', d.criada_por, d.criador_nome, d.created_at
FROM public.decisoes d
WHERE NOT EXISTS (
    SELECT 1 FROM public.decisao_assinaturas a WHERE a.decisao_id = d.id AND a.papel = 'criador'
);

-- ------------------------------------------------------------------------------
-- 3. HELPERS DE ACESSO (private) - SECURITY DEFINER, STABLE, search_path vazio, nomes qualificados
-- ------------------------------------------------------------------------------
-- Cast seguro de texto para uuid (NULL se invalido): evita erro de cast em politicas de storage.
CREATE OR REPLACE FUNCTION private.safe_uuid(p_text text)
RETURNS uuid LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
    SELECT CASE
        WHEN p_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN p_text::uuid
        ELSE NULL
    END;
$$;

-- Email do usuario autenticado, em minusculas, SOMENTE se confirmado. Sem a confirmacao, qualquer pessoa
-- poderia criar conta com o email de um cliente convidado e herdar o acesso as obras dele.
CREATE OR REPLACE FUNCTION private.caller_email()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT lower(u.email)
    FROM auth.users u
    WHERE u.id = (SELECT auth.uid())
      AND u.email IS NOT NULL
      AND u.email_confirmed_at IS NOT NULL;
$$;

-- Leitura da obra: construtor, cliente vinculado por id, ou email convidado (cliente_email / emails_clientes).
CREATE OR REPLACE FUNCTION private.can_access_obra(p_obra_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.obras o
        WHERE o.id = p_obra_id
          AND (
              o.construtor_id = (SELECT auth.uid())
              OR o.cliente_id = (SELECT auth.uid())
              OR (
                  (SELECT private.caller_email()) IS NOT NULL
                  AND (
                      lower(o.cliente_email) = (SELECT private.caller_email())
                      OR o.emails_clientes @> ARRAY[(SELECT private.caller_email())]
                  )
              )
          )
    );
$$;

-- Escrita da obra: somente o construtor dono.
CREATE OR REPLACE FUNCTION private.can_write_obra(p_obra_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.obras o
        WHERE o.id = p_obra_id AND o.construtor_id = (SELECT auth.uid())
    );
$$;

-- Conta com papel de construtor (profiles.role, imutavel para o usuario).
CREATE OR REPLACE FUNCTION private.is_construtor()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'construtor');
$$;

-- Obra de cada nivel filho (evita recursao de RLS entre tabelas).
CREATE OR REPLACE FUNCTION private.etapa_obra(p_etapa_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT e.obra_id FROM public.etapas e WHERE e.id = p_etapa_id;
$$;

CREATE OR REPLACE FUNCTION private.tarefa_obra(p_tarefa_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT e.obra_id FROM public.tarefas t JOIN public.etapas e ON e.id = t.etapa_id WHERE t.id = p_tarefa_id;
$$;

CREATE OR REPLACE FUNCTION private.decisao_obra(p_decisao_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT d.obra_id FROM public.decisoes d WHERE d.id = p_decisao_id;
$$;

CREATE OR REPLACE FUNCTION private.decisao_status(p_decisao_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT d.status FROM public.decisoes d WHERE d.id = p_decisao_id;
$$;

-- Papel do usuario em uma obra: 'construtor' (dono) ou 'cliente' (demais com acesso). Quem e dono
-- conta sempre como construtor, mesmo se tambem constar na lista de emails de clientes.
CREATE OR REPLACE FUNCTION private.papel_na_obra(p_obra_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT CASE WHEN private.can_write_obra(p_obra_id) THEN 'construtor' ELSE 'cliente' END;
$$;

-- Perfil visivel: o proprio, ou quem compartilha obra (construtor <-> clientes das suas obras).
CREATE OR REPLACE FUNCTION private.can_view_profile(p_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT p_profile_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.obras o
            WHERE (
                o.construtor_id = (SELECT auth.uid())
                AND (
                    o.cliente_id = p_profile_id
                    OR EXISTS (
                        SELECT 1 FROM public.profiles pr
                        WHERE pr.id = p_profile_id
                          AND (lower(pr.email) = lower(o.cliente_email) OR o.emails_clientes @> ARRAY[lower(pr.email)])
                    )
                )
            )
            OR (o.construtor_id = p_profile_id AND private.can_access_obra(o.id))
        );
$$;

-- Obra de um objeto de storage a partir do caminho. Convencao do app: '<obra_id>/<tipo>/<arquivo>'.
-- Excecao legada: 'diario/<tarefa_id>_<evidencia_id>.<ext>' (obra obtida pela tarefa).
CREATE OR REPLACE FUNCTION private.storage_obra_id(p_name text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT CASE
        WHEN private.safe_uuid(split_part(p_name, '/', 1)) IS NOT NULL
            THEN private.safe_uuid(split_part(p_name, '/', 1))
        WHEN split_part(p_name, '/', 1) = 'diario'
            THEN (
                SELECT e.obra_id
                FROM public.tarefas t JOIN public.etapas e ON e.id = t.etapa_id
                WHERE t.id = private.safe_uuid(substring(split_part(p_name, '/', 2) FROM '^[0-9a-fA-F-]{36}'))
            )
        ELSE NULL
    END;
$$;

REVOKE ALL ON FUNCTION
    private.safe_uuid(text), private.caller_email(), private.can_access_obra(uuid), private.can_write_obra(uuid),
    private.is_construtor(), private.etapa_obra(uuid), private.tarefa_obra(uuid), private.decisao_obra(uuid),
    private.decisao_status(uuid), private.papel_na_obra(uuid), private.can_view_profile(uuid),
    private.storage_obra_id(text)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
    private.safe_uuid(text), private.caller_email(), private.can_access_obra(uuid), private.can_write_obra(uuid),
    private.is_construtor(), private.etapa_obra(uuid), private.tarefa_obra(uuid), private.decisao_obra(uuid),
    private.decisao_status(uuid), private.papel_na_obra(uuid), private.can_view_profile(uuid),
    private.storage_obra_id(text)
TO authenticated;

-- ------------------------------------------------------------------------------
-- 4. CONSTRAINTS E INDICES
-- ------------------------------------------------------------------------------
-- obras.construtor_id NOT NULL somente se nao houver linhas orfas.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.obras WHERE construtor_id IS NULL) THEN
        RAISE NOTICE 'obras.construtor_id continua anulavel: existem obras sem construtor. Corrija e repita.';
    ELSE
        ALTER TABLE public.obras ALTER COLUMN construtor_id SET NOT NULL;
    END IF;
END $$;

-- CHECKs adicionados NOT VALID (valem para novas gravacoes) e validados quando os dados atuais permitem.
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('obras', 'ck_obras_emails_clientes_lower',
                'emails_clientes IS NULL OR emails_clientes::text = lower(emails_clientes::text)'),
            ('obras', 'ck_obras_cliente_email_lower', 'cliente_email IS NULL OR cliente_email = lower(cliente_email)'),
            ('obras', 'ck_obras_orcamento_nao_negativo', 'orcamento_inicial IS NULL OR orcamento_inicial >= 0'),
            ('decisoes', 'ck_decisoes_valor_aditivo_nao_negativo', 'valor_aditivo IS NULL OR valor_aditivo >= 0'),
            ('decisoes', 'ck_decisoes_valor_supressivo_nao_negativo',
                'valor_supressivo IS NULL OR valor_supressivo >= 0'),
            ('registro_notas', 'ck_notas_valor_nao_negativo', 'valor IS NULL OR valor >= 0'),
            ('registro_locacoes', 'ck_locacoes_valor_nao_negativo', 'valor IS NULL OR valor >= 0'),
            ('registro_locacoes', 'ck_locacoes_quantidade_nao_negativa', 'quantidade IS NULL OR quantidade >= 0'),
            ('projetos_pdf', 'ck_projetos_tamanho_nao_negativo', 'tamanho_bytes >= 0')
        ) AS v(tbl, cname, expr)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = r.cname AND conrelid = format('public.%I', r.tbl)::regclass
        ) THEN
            EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%s) NOT VALID', r.tbl, r.cname, r.expr);
        END IF;
        BEGIN
            EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I', r.tbl, r.cname);
        EXCEPTION WHEN check_violation THEN
            RAISE NOTICE 'Constraint % nao validada: ha linhas antigas fora da regra (novas gravacoes ja sao checadas).', r.cname;
        END;
    END LOOP;
END $$;

-- Indices de FKs sem cobertura + padroes de consulta do app.
CREATE INDEX IF NOT EXISTS idx_evidencias_autor ON public.tarefa_evidencias(autor_id);
CREATE INDEX IF NOT EXISTS idx_decisoes_criador ON public.decisoes(criador_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_user ON public.decisao_assinaturas(user_id);
CREATE INDEX IF NOT EXISTS idx_projetos_enviado_por ON public.projetos_pdf(enviado_por_id);
CREATE INDEX IF NOT EXISTS idx_templates_criado_por ON public.modelos_etapas_templates(criado_por);
CREATE INDEX IF NOT EXISTS idx_obras_cliente_email_lower ON public.obras (lower(cliente_email));
CREATE INDEX IF NOT EXISTS idx_obras_emails_clientes ON public.obras USING GIN (emails_clientes);
CREATE INDEX IF NOT EXISTS idx_decisoes_obra_created ON public.decisoes (obra_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projetos_obra_created ON public.projetos_pdf (obra_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notas_obra_created ON public.registro_notas (obra_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_locacoes_obra_vencimento ON public.registro_locacoes (obra_id, data_vencimento);
-- Indices simples agora cobertos pelos compostos acima.
DROP INDEX IF EXISTS public.idx_projetos_obra;
DROP INDEX IF EXISTS public.idx_notas_obra;
DROP INDEX IF EXISTS public.idx_locacoes_obra;

-- ------------------------------------------------------------------------------
-- 5. TRIGGERS DE INTEGRIDADE
-- Todos ignoram chamadas sem usuario autenticado (auth.uid() nulo: service_role, SQL Editor, migracoes);
-- usuarios finais sempre tem auth.uid() e nao conseguem anula-lo.
-- ------------------------------------------------------------------------------

-- 5a. Emails de obras sempre minusculos e aparados (a lista e usada para conceder acesso).
CREATE OR REPLACE FUNCTION private.obras_normaliza_emails()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    NEW.cliente_email := NULLIF(lower(btrim(NEW.cliente_email)), '');
    NEW.emails_clientes := COALESCE(
        (SELECT array_agg(DISTINCT lower(btrim(x))) FROM unnest(NEW.emails_clientes) AS x WHERE btrim(x) <> ''),
        '{}'::text[]);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_obras_normaliza_emails ON public.obras;
CREATE TRIGGER trg_obras_normaliza_emails BEFORE INSERT OR UPDATE OF cliente_email, emails_clientes ON public.obras
    FOR EACH ROW EXECUTE PROCEDURE private.obras_normaliza_emails();

-- 5b. Decisoes - criacao.
-- Quem cria define o papel pelo vinculo real com a obra (nunca pelo payload): criada_por, criador_id e
-- status inicial 'pendente' sao forcados. Se a linha ja existe (caminho ON CONFLICT DO UPDATE do upsert,
-- cujo BEFORE INSERT roda antes da deteccao do conflito) nada e alterado aqui: o trigger de UPDATE valida.
CREATE OR REPLACE FUNCTION private.decisoes_guard_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := (SELECT auth.uid());
BEGIN
    IF v_uid IS NULL THEN RETURN NEW; END IF;
    IF EXISTS (SELECT 1 FROM public.decisoes d WHERE d.id = NEW.id) THEN RETURN NEW; END IF;
    NEW.criada_por := private.papel_na_obra(NEW.obra_id);
    NEW.criador_id := v_uid;
    NEW.status := 'pendente';
    RETURN NEW;
END;
$$;

-- 5c. Decisoes - atualizacao.
-- Pode editar: nada de conteudo. Campos de contrato (obra, titulo, descricao, categoria, tipo_impacto,
-- valores, prazo, criada_por, criador_id) sao imutaveis para TODOS, inclusive o construtor: senao uma
-- proposta do cliente poderia ser alterada pelo construtor antes de aprovar (e vice-versa).
-- Fotos de amostra: somente o criador, e apenas enquanto pendente.
-- Status: somente pendente -> aprovada|recusada, e somente pela CONTRAPARTE do criador.
-- criador_nome e created_at sao mantidos (nao falham o upsert do app).
CREATE OR REPLACE FUNCTION private.decisoes_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_papel text;
    v_criador boolean;
BEGIN
    IF v_uid IS NULL THEN RETURN NEW; END IF;

    NEW.criador_nome := OLD.criador_nome;
    NEW.created_at := OLD.created_at;

    IF NEW.obra_id IS DISTINCT FROM OLD.obra_id
       OR NEW.titulo IS DISTINCT FROM OLD.titulo
       OR NEW.descricao IS DISTINCT FROM OLD.descricao
       OR COALESCE(NEW.categoria, 'outro') IS DISTINCT FROM COALESCE(OLD.categoria, 'outro')
       OR COALESCE(NEW.tipo_impacto, 'nenhum') IS DISTINCT FROM COALESCE(OLD.tipo_impacto, 'nenhum')
       OR COALESCE(NEW.valor_aditivo, 0) IS DISTINCT FROM COALESCE(OLD.valor_aditivo, 0)
       OR COALESCE(NEW.valor_supressivo, 0) IS DISTINCT FROM COALESCE(OLD.valor_supressivo, 0)
       OR COALESCE(NEW.impacto_financeiro, 0) IS DISTINCT FROM COALESCE(OLD.impacto_financeiro, 0)
       OR COALESCE(NEW.impacto_prazo_dias, 0) IS DISTINCT FROM COALESCE(OLD.impacto_prazo_dias, 0)
       OR NEW.criada_por IS DISTINCT FROM OLD.criada_por
       OR NEW.criador_id IS DISTINCT FROM OLD.criador_id THEN
        RAISE EXCEPTION 'Decisao imutavel: titulo, descricao, valores e prazo nao podem ser alterados apos a criacao.'
            USING ERRCODE = '42501';
    END IF;

    v_papel := private.papel_na_obra(OLD.obra_id);
    v_criador := (OLD.criador_id IS NOT NULL AND OLD.criador_id = v_uid)
              OR (OLD.criador_id IS NULL AND v_papel = OLD.criada_por);

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF OLD.status <> 'pendente' OR NEW.status NOT IN ('aprovada', 'recusada') THEN
            RAISE EXCEPTION 'Transicao de status invalida: so e possivel de pendente para aprovada ou recusada.'
                USING ERRCODE = '42501';
        END IF;
        IF v_criador OR v_papel = OLD.criada_por THEN
            RAISE EXCEPTION 'Apenas a contraparte pode aprovar ou recusar a decisao.' USING ERRCODE = '42501';
        END IF;
    END IF;

    IF COALESCE(NEW.fotos, '[]'::jsonb) IS DISTINCT FROM COALESCE(OLD.fotos, '[]'::jsonb) AND (OLD.status <> 'pendente' OR NOT v_criador) THEN
        RAISE EXCEPTION 'Fotos da decisao so podem ser alteradas pelo criador enquanto ela estiver pendente.'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_decisoes_guard_insert ON public.decisoes;
CREATE TRIGGER trg_decisoes_guard_insert BEFORE INSERT ON public.decisoes
    FOR EACH ROW EXECUTE PROCEDURE private.decisoes_guard_insert();
DROP TRIGGER IF EXISTS trg_decisoes_guard_update ON public.decisoes;
CREATE TRIGGER trg_decisoes_guard_update BEFORE UPDATE ON public.decisoes
    FOR EACH ROW EXECUTE PROCEDURE private.decisoes_guard_update();

-- 5d. Assinaturas.
-- user_id e autor_perfil sao forcados (identidade real). 'criador' so pelo criador da decisao;
-- 'contraparte' so pela contraparte e somente apos a decisao estar aprovada. Linhas existentes
-- (conflito de decisao_id+papel no upsert) sao imutaveis: o UPDATE devolve a linha antiga.
CREATE OR REPLACE FUNCTION private.assinaturas_guard_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_dec public.decisoes%ROWTYPE;
    v_papel text;
BEGIN
    IF v_uid IS NULL THEN RETURN NEW; END IF;
    SELECT * INTO v_dec FROM public.decisoes d WHERE d.id = NEW.decisao_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Decisao inexistente.' USING ERRCODE = '42501';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.decisao_assinaturas a WHERE a.decisao_id = NEW.decisao_id AND a.papel = NEW.papel
    ) THEN
        RETURN NEW;
    END IF;

    v_papel := private.papel_na_obra(v_dec.obra_id);
    NEW.user_id := v_uid;
    NEW.autor_perfil := v_papel;

    IF NEW.papel = 'criador' THEN
        IF v_papel <> v_dec.criada_por OR (v_dec.criador_id IS NOT NULL AND v_dec.criador_id <> v_uid) THEN
            RAISE EXCEPTION 'Apenas o criador da decisao pode registrar a assinatura do criador.' USING ERRCODE = '42501';
        END IF;
    ELSE
        IF v_papel = v_dec.criada_por OR v_dec.criador_id = v_uid THEN
            RAISE EXCEPTION 'A assinatura da contraparte nao pode ser feita pelo criador.' USING ERRCODE = '42501';
        END IF;
        IF v_dec.status <> 'aprovada' THEN
            RAISE EXCEPTION 'A decisao precisa estar aprovada para registrar a assinatura da contraparte.'
                USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.assinaturas_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF (SELECT auth.uid()) IS NULL THEN RETURN NEW; END IF;
    RETURN OLD; -- carimbo digital auditavel: nao se reescreve
END;
$$;

DROP TRIGGER IF EXISTS trg_assinaturas_guard_insert ON public.decisao_assinaturas;
CREATE TRIGGER trg_assinaturas_guard_insert BEFORE INSERT ON public.decisao_assinaturas
    FOR EACH ROW EXECUTE PROCEDURE private.assinaturas_guard_insert();
DROP TRIGGER IF EXISTS trg_assinaturas_guard_update ON public.decisao_assinaturas;
CREATE TRIGGER trg_assinaturas_guard_update BEFORE UPDATE ON public.decisao_assinaturas
    FOR EACH ROW EXECUTE PROCEDURE private.assinaturas_guard_update();

-- ------------------------------------------------------------------------------
-- 6. PERFIS
-- ------------------------------------------------------------------------------
-- Usuario final nunca altera id, email ou role (current_user e 'authenticated'/'anon' via PostgREST;
-- service_role e o SQL Editor continuam livres).
CREATE OR REPLACE FUNCTION private.profiles_guard_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF current_user IN ('authenticated', 'anon') THEN
        IF NEW.role IS DISTINCT FROM OLD.role
           OR NEW.email IS DISTINCT FROM OLD.email
           OR NEW.id IS DISTINCT FROM OLD.id THEN
            RAISE EXCEPTION 'Perfil: id, email e papel nao podem ser alterados.' USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard_update ON public.profiles;
CREATE TRIGGER trg_profiles_guard_update BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE private.profiles_guard_update();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.eixo_touch_updated_at();

-- Criacao do perfil no signup: papel restrito a construtor/cliente (invalido ou ausente vira 'cliente',
-- o menor privilegio), sem sobrescrever perfil existente (nada de ON CONFLICT ... role = EXCLUDED.role).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_role text := lower(COALESCE(NEW.raw_user_meta_data ->> 'role', ''));
BEGIN
    IF v_role NOT IN ('construtor', 'cliente') THEN
        v_role := 'cliente';
    END IF;
    INSERT INTO public.profiles (id, email, nome, role, empresa)
    VALUES (
        NEW.id,
        COALESCE(lower(NEW.email), NEW.id::text || '@sem-email.invalid'),
        left(COALESCE(
            NULLIF(btrim(NEW.raw_user_meta_data ->> 'nome'), ''),
            NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
            'Usuario'
        ), 255),
        v_role,
        left(NULLIF(btrim(NEW.raw_user_meta_data ->> 'empresa'), ''), 255)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Privilegios de tabela: anon sem acesso; perfis sem INSERT/DELETE pelo cliente da API e UPDATE so em
-- colunas editaveis (defesa em profundidade junto do trigger acima).
REVOKE ALL ON TABLE public.profiles, public.obras, public.etapas, public.tarefas, public.tarefa_evidencias,
    public.decisoes, public.decisao_assinaturas, public.projetos_pdf, public.registro_notas,
    public.punch_list_items, public.registro_locacoes, public.modelos_etapas_templates FROM anon;
REVOKE INSERT, DELETE, TRUNCATE ON TABLE public.profiles FROM authenticated;
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (nome, empresa, avatar_url, updated_at) ON TABLE public.profiles TO authenticated;

-- ------------------------------------------------------------------------------
-- 7. POLITICAS RLS (reescritas por completo)
-- ------------------------------------------------------------------------------
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

-- Perfis: le o proprio e quem divide obra; atualiza apenas o proprio (colunas limitadas por GRANT/trigger).
-- Sem INSERT (o trigger handle_new_user cria) e sem DELETE.
CREATE POLICY eixo_profiles_select ON public.profiles FOR SELECT TO authenticated
    USING ((SELECT private.can_view_profile(id)));
CREATE POLICY eixo_profiles_update ON public.profiles FOR UPDATE TO authenticated
    USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

-- Obras: criar exige conta construtor e ser o proprio construtor_id.
CREATE POLICY eixo_obras_select ON public.obras FOR SELECT TO authenticated
    USING ((SELECT private.can_access_obra(id)));
CREATE POLICY eixo_obras_insert ON public.obras FOR INSERT TO authenticated
    WITH CHECK (construtor_id = (SELECT auth.uid()) AND (SELECT private.is_construtor()));
CREATE POLICY eixo_obras_update ON public.obras FOR UPDATE TO authenticated
    USING ((SELECT private.can_write_obra(id))) WITH CHECK (construtor_id = (SELECT auth.uid()));
CREATE POLICY eixo_obras_delete ON public.obras FOR DELETE TO authenticated
    USING ((SELECT private.can_write_obra(id)));

-- Tabelas com obra_id: todos com acesso leem; so o construtor escreve.
DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['etapas', 'projetos_pdf', 'registro_notas', 'punch_list_items', 'registro_locacoes']
    LOOP
        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((SELECT private.can_access_obra(obra_id)))', 'eixo_' || t || '_select', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT private.can_write_obra(obra_id)))', 'eixo_' || t || '_insert', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((SELECT private.can_write_obra(obra_id))) WITH CHECK ((SELECT private.can_write_obra(obra_id)))', 'eixo_' || t || '_update', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((SELECT private.can_write_obra(obra_id)))', 'eixo_' || t || '_delete', t);
    END LOOP;
END $$;

-- Tarefas (obra via etapa)
CREATE POLICY eixo_tarefas_select ON public.tarefas FOR SELECT TO authenticated
    USING ((SELECT private.can_access_obra(private.etapa_obra(etapa_id))));
CREATE POLICY eixo_tarefas_insert ON public.tarefas FOR INSERT TO authenticated
    WITH CHECK ((SELECT private.can_write_obra(private.etapa_obra(etapa_id))));
CREATE POLICY eixo_tarefas_update ON public.tarefas FOR UPDATE TO authenticated
    USING ((SELECT private.can_write_obra(private.etapa_obra(etapa_id))))
    WITH CHECK ((SELECT private.can_write_obra(private.etapa_obra(etapa_id))));
CREATE POLICY eixo_tarefas_delete ON public.tarefas FOR DELETE TO authenticated
    USING ((SELECT private.can_write_obra(private.etapa_obra(etapa_id))));

-- Evidencias (obra via tarefa)
CREATE POLICY eixo_evidencias_select ON public.tarefa_evidencias FOR SELECT TO authenticated
    USING ((SELECT private.can_access_obra(private.tarefa_obra(tarefa_id))));
CREATE POLICY eixo_evidencias_insert ON public.tarefa_evidencias FOR INSERT TO authenticated
    WITH CHECK ((SELECT private.can_write_obra(private.tarefa_obra(tarefa_id))));
CREATE POLICY eixo_evidencias_update ON public.tarefa_evidencias FOR UPDATE TO authenticated
    USING ((SELECT private.can_write_obra(private.tarefa_obra(tarefa_id))))
    WITH CHECK ((SELECT private.can_write_obra(private.tarefa_obra(tarefa_id))));
CREATE POLICY eixo_evidencias_delete ON public.tarefa_evidencias FOR DELETE TO authenticated
    USING ((SELECT private.can_write_obra(private.tarefa_obra(tarefa_id))));

-- Decisoes: construtor e cliente propoem/atualizam (regras finas nos triggers da secao 5).
-- Exclusao: so o construtor e apenas enquanto nao aprovada (aprovada e registro bilateral auditavel;
-- a exclusao em cascata da obra inteira nao passa por esta politica).
CREATE POLICY eixo_decisoes_select ON public.decisoes FOR SELECT TO authenticated
    USING ((SELECT private.can_access_obra(obra_id)));
CREATE POLICY eixo_decisoes_insert ON public.decisoes FOR INSERT TO authenticated
    WITH CHECK ((SELECT private.can_access_obra(obra_id)));
CREATE POLICY eixo_decisoes_update ON public.decisoes FOR UPDATE TO authenticated
    USING ((SELECT private.can_access_obra(obra_id))) WITH CHECK ((SELECT private.can_access_obra(obra_id)));
CREATE POLICY eixo_decisoes_delete ON public.decisoes FOR DELETE TO authenticated
    USING ((SELECT private.can_write_obra(obra_id)) AND status <> 'aprovada');

-- Assinaturas: mesmo acesso das decisoes; exclusao direta so do construtor e so de decisao nao aprovada.
CREATE POLICY eixo_assinaturas_select ON public.decisao_assinaturas FOR SELECT TO authenticated
    USING ((SELECT private.can_access_obra(private.decisao_obra(decisao_id))));
CREATE POLICY eixo_assinaturas_insert ON public.decisao_assinaturas FOR INSERT TO authenticated
    WITH CHECK ((SELECT private.can_access_obra(private.decisao_obra(decisao_id))));
CREATE POLICY eixo_assinaturas_update ON public.decisao_assinaturas FOR UPDATE TO authenticated
    USING ((SELECT private.can_access_obra(private.decisao_obra(decisao_id))))
    WITH CHECK ((SELECT private.can_access_obra(private.decisao_obra(decisao_id))));
CREATE POLICY eixo_assinaturas_delete ON public.decisao_assinaturas FOR DELETE TO authenticated
    USING ((SELECT private.can_write_obra(private.decisao_obra(decisao_id)))
           AND (SELECT private.decisao_status(decisao_id)) <> 'aprovada');

-- Modelos de obra: le os de fabrica (criado_por nulo) e os proprios; escreve apenas os proprios.
CREATE POLICY eixo_modelos_select ON public.modelos_etapas_templates FOR SELECT TO authenticated
    USING (criado_por IS NULL OR criado_por = (SELECT auth.uid()));
CREATE POLICY eixo_modelos_insert ON public.modelos_etapas_templates FOR INSERT TO authenticated
    WITH CHECK (criado_por = (SELECT auth.uid()));
CREATE POLICY eixo_modelos_update ON public.modelos_etapas_templates FOR UPDATE TO authenticated
    USING (criado_por = (SELECT auth.uid())) WITH CHECK (criado_por = (SELECT auth.uid()));
CREATE POLICY eixo_modelos_delete ON public.modelos_etapas_templates FOR DELETE TO authenticated
    USING (criado_por = (SELECT auth.uid()));

-- ------------------------------------------------------------------------------
-- 8. STORAGE (storage.objects) - buckets: evidencias-diario, registro-notas, projetos-pdf
-- Convencao de caminho do app: '<obra_id>/<tipo>/<arquivo>'. Construtor da obra escreve; qualquer
-- pessoa com acesso a obra le; o cliente envia somente fotos de decisao ('<obra_id>/decisoes/...').
-- NAO altera o flag public dos buckets (URLs publicas continuam funcionando).
-- IMPORTANTE: politicas sao OR. Audite politicas antigas em storage.objects e remova as permissivas:
--   SELECT policyname, cmd, roles, qual, with_check FROM pg_policies
--   WHERE schemaname = 'storage' AND tablename = 'objects';
-- (o upload publico anonimo de projetos usa politica propria que esta migracao NAO toca.)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    DROP POLICY IF EXISTS eixo_storage_select ON storage.objects;
    DROP POLICY IF EXISTS eixo_storage_insert ON storage.objects;
    DROP POLICY IF EXISTS eixo_storage_update ON storage.objects;
    DROP POLICY IF EXISTS eixo_storage_delete ON storage.objects;

    CREATE POLICY eixo_storage_select ON storage.objects FOR SELECT TO authenticated
        USING (
            bucket_id IN ('evidencias-diario', 'registro-notas', 'projetos-pdf')
            AND (SELECT private.can_access_obra(private.storage_obra_id(name)))
        );

    CREATE POLICY eixo_storage_insert ON storage.objects FOR INSERT TO authenticated
        WITH CHECK (
            bucket_id IN ('evidencias-diario', 'registro-notas', 'projetos-pdf')
            AND (
                (SELECT private.can_write_obra(private.storage_obra_id(name)))
                OR (
                    bucket_id = 'evidencias-diario'
                    AND split_part(name, '/', 2) = 'decisoes'
                    AND private.safe_uuid(split_part(name, '/', 1)) IS NOT NULL
                    AND (SELECT private.can_access_obra(private.safe_uuid(split_part(name, '/', 1))))
                )
            )
        );

    -- UPDATE e necessario para upload com upsert:true (sobrescrita do mesmo caminho).
    CREATE POLICY eixo_storage_update ON storage.objects FOR UPDATE TO authenticated
        USING (
            bucket_id IN ('evidencias-diario', 'registro-notas', 'projetos-pdf')
            AND (
                (SELECT private.can_write_obra(private.storage_obra_id(name)))
                OR (
                    bucket_id = 'evidencias-diario'
                    AND split_part(name, '/', 2) = 'decisoes'
                    AND private.safe_uuid(split_part(name, '/', 1)) IS NOT NULL
                    AND (SELECT private.can_access_obra(private.safe_uuid(split_part(name, '/', 1))))
                )
            )
        )
        WITH CHECK (
            bucket_id IN ('evidencias-diario', 'registro-notas', 'projetos-pdf')
            AND (
                (SELECT private.can_write_obra(private.storage_obra_id(name)))
                OR (
                    bucket_id = 'evidencias-diario'
                    AND split_part(name, '/', 2) = 'decisoes'
                    AND private.safe_uuid(split_part(name, '/', 1)) IS NOT NULL
                    AND (SELECT private.can_access_obra(private.safe_uuid(split_part(name, '/', 1))))
                )
            )
        );

    CREATE POLICY eixo_storage_delete ON storage.objects FOR DELETE TO authenticated
        USING (
            bucket_id IN ('evidencias-diario', 'registro-notas', 'projetos-pdf')
            AND (SELECT private.can_write_obra(private.storage_obra_id(name)))
        );
EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Sem permissao para criar politicas em storage.objects; crie-as pelo painel Storage > Policies.';
END $$;

-- ------------------------------------------------------------------------------
-- 9. LIMPEZA: helpers antigos do schema public (as politicas que os usavam ja foram recriadas)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    DROP FUNCTION IF EXISTS public.eixo_obra_visivel(uuid);
    DROP FUNCTION IF EXISTS public.eixo_obra_do_construtor(uuid);
    DROP FUNCTION IF EXISTS public.eixo_etapa_obra(uuid);
    DROP FUNCTION IF EXISTS public.eixo_tarefa_obra(uuid);
    DROP FUNCTION IF EXISTS public.eixo_decisao_obra(uuid);
EXCEPTION WHEN dependent_objects_still_exist THEN
    RAISE NOTICE 'Helpers public.eixo_* ainda referenciados por objetos externos; mantidos.';
END $$;

NOTIFY pgrst, 'reload schema';
