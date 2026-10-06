-- ==============================================================================
-- EIXO - SCHEMA COMPLETO DE BANCO DE DADOS POSTGRESQL (SUPABASE)
-- Sistema de Acompanhamento de Canteiro, Decisões Bilaterais e Gestão de Obras
-- ==============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabela de Perfis de Usuário (vinculada ao auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    nome VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('construtor', 'cliente')),
    empresa VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Trigger para atualizar profiles automaticamente no signup do auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, nome, role, empresa)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
        LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'construtor')),
        NEW.raw_user_meta_data->>'empresa'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        nome = EXCLUDED.nome,
        role = EXCLUDED.role,
        empresa = EXCLUDED.empresa,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Tabela de Obras
CREATE TABLE IF NOT EXISTS public.obras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    cliente_nome VARCHAR(255) NOT NULL,
    cliente_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    construtor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    endereco TEXT NOT NULL,
    data_prevista DATE NOT NULL,
    orcamento_inicial NUMERIC(14,2) DEFAULT 0,
    empresa_responsavel VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_obras_construtor ON public.obras(construtor_id);
CREATE INDEX IF NOT EXISTS idx_obras_cliente ON public.obras(cliente_id);

-- 4. Tabela de Etapas do Cronograma
CREATE TABLE IF NOT EXISTS public.etapas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    ordem INT NOT NULL DEFAULT 0,
    tipo_origem VARCHAR(100) DEFAULT 'Personalizada',
    status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido')),
    concluida BOOLEAN DEFAULT false NOT NULL,
    concluida_em TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_etapas_obra_ordem ON public.etapas(obra_id, ordem);

-- 5. Tabela de Tarefas / Serviços Técnicos
CREATE TABLE IF NOT EXISTS public.tarefas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    etapa_id UUID NOT NULL REFERENCES public.etapas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    ordem INT NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido')),
    concluida BOOLEAN DEFAULT false NOT NULL,
    concluida_em TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tarefas_etapa_ordem ON public.tarefas(etapa_id, ordem);

-- 6. Tabela de Evidências da Tarefa (Fotos e Anotações do Diário)
CREATE TABLE IF NOT EXISTS public.tarefa_evidencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tarefa_id UUID NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('foto', 'anotacao')),
    conteudo TEXT NOT NULL, -- URL pública da foto ou texto da observação
    autor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_evidencias_tarefa ON public.tarefa_evidencias(tarefa_id);

-- 7. Tabela de Decisões & Aprovações Bilaterais
CREATE TABLE IF NOT EXISTS public.decisoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    categoria VARCHAR(100) DEFAULT 'outro',
    tipo_impacto VARCHAR(50) DEFAULT 'nenhum' CHECK (tipo_impacto IN ('nenhum', 'aditivo', 'supressivo', 'ambos')),
    valor_aditivo NUMERIC(12,2) DEFAULT 0,
    valor_supressivo NUMERIC(12,2) DEFAULT 0,
    impacto_financeiro NUMERIC(12,2) DEFAULT 0,
    impacto_prazo_dias INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'recusada')),
    criada_por VARCHAR(50) NOT NULL CHECK (criada_por IN ('construtor', 'cliente')),
    criador_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    criador_nome VARCHAR(255) NOT NULL,
    fotos JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_decisoes_obra_status ON public.decisoes(obra_id, status);

-- 8. Tabela de Assinaturas Digitais Auditáveis
CREATE TABLE IF NOT EXISTS public.decisao_assinaturas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    decisao_id UUID NOT NULL REFERENCES public.decisoes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    papel VARCHAR(50) NOT NULL CHECK (papel IN ('criador', 'contraparte')),
    autor_perfil VARCHAR(50) NOT NULL CHECK (autor_perfil IN ('construtor', 'cliente')),
    nome_signatario VARCHAR(255) NOT NULL,
    comentario TEXT,
    assinado_em TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assinaturas_decisao ON public.decisao_assinaturas(decisao_id);

-- 9. Tabela de Projetos Técnicos e Documentos PDF
CREATE TABLE IF NOT EXISTS public.projetos_pdf (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    disciplina VARCHAR(100) NOT NULL,
    disciplina_customizada VARCHAR(100),
    arquivo_nome VARCHAR(255) NOT NULL,
    tamanho_bytes BIGINT NOT NULL,
    url TEXT NOT NULL,
    storage_path TEXT,
    versao VARCHAR(100) DEFAULT 'Rev. 01',
    descricao TEXT,
    enviado_por VARCHAR(50) NOT NULL CHECK (enviado_por IN ('construtor', 'cliente', 'externo')),
    enviado_por_nome VARCHAR(255) NOT NULL,
    enviado_por_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projetos_obra ON public.projetos_pdf(obra_id);

-- 10. Tabela de Registro de Notas Fiscais e Comprovantes
CREATE TABLE IF NOT EXISTS public.registro_notas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
    titulo VARCHAR(255),
    valor NUMERIC(12,2),
    observacoes TEXT,
    fotos JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notas_obra ON public.registro_notas(obra_id);

-- 11. Tabela de Checklist de Vistoria Final (Punch List)
CREATE TABLE IF NOT EXISTS public.punch_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
    item VARCHAR(255) NOT NULL,
    ambiente VARCHAR(100) DEFAULT 'Geral',
    concluido BOOLEAN DEFAULT false NOT NULL,
    concluido_em TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_punch_list_obra ON public.punch_list_items(obra_id);

-- 12. Tabela de Templates de Modelos de Obra
CREATE TABLE IF NOT EXISTS public.modelos_etapas_templates (
    id VARCHAR(100) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    etapas_json JSONB NOT NULL,
    customizado BOOLEAN DEFAULT false,
    criado_por UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - CONTROLE DE ACESSO CONSTRUTOR VS CLIENTE
-- ==============================================================================

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
ALTER TABLE public.modelos_etapas_templates ENABLE ROW LEVEL SECURITY;

-- Políticas de Profiles
CREATE POLICY "Profiles são visíveis por usuários autenticados"
    ON public.profiles FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários podem editar seu próprio perfil"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Políticas de Obras
CREATE POLICY "Construtores podem gerenciar suas próprias obras"
    ON public.obras FOR ALL
    USING (auth.uid() = construtor_id);

CREATE POLICY "Clientes podem visualizar obras atribuídas a eles"
    ON public.obras FOR SELECT
    USING (auth.uid() = cliente_id);

-- Políticas de Etapas e Tarefas (Read-only para Cliente, CRUD para Construtor)
CREATE POLICY "Ver etapas da obra"
    ON public.etapas FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.obras o
            WHERE o.id = etapas.obra_id
            AND (o.construtor_id = auth.uid() OR o.cliente_id = auth.uid())
        )
    );

CREATE POLICY "Construtor gerencia etapas"
    ON public.etapas FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.obras o
            WHERE o.id = etapas.obra_id
            AND o.construtor_id = auth.uid()
        )
    );

CREATE POLICY "Ver tarefas"
    ON public.tarefas FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.etapas e
            JOIN public.obras o ON o.id = e.obra_id
            WHERE e.id = tarefas.etapa_id
            AND (o.construtor_id = auth.uid() OR o.cliente_id = auth.uid())
        )
    );

CREATE POLICY "Construtor gerencia tarefas"
    ON public.tarefas FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.etapas e
            JOIN public.obras o ON o.id = e.obra_id
            WHERE e.id = tarefas.etapa_id
            AND o.construtor_id = auth.uid()
        )
    );

-- Políticas de Decisões (Bilateral: Cliente E Construtor podem interagir ativamente)
CREATE POLICY "Ver decisões da obra"
    ON public.decisoes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.obras o
            WHERE o.id = decisoes.obra_id
            AND (o.construtor_id = auth.uid() OR o.cliente_id = auth.uid())
        )
    );

CREATE POLICY "Construtor ou Cliente podem propor decisões"
    ON public.decisoes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.obras o
            WHERE o.id = decisoes.obra_id
            AND (o.construtor_id = auth.uid() OR o.cliente_id = auth.uid())
        )
    );

CREATE POLICY "Construtor ou Cliente podem assinar/atualizar decisões"
    ON public.decisoes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.obras o
            WHERE o.id = decisoes.obra_id
            AND (o.construtor_id = auth.uid() OR o.cliente_id = auth.uid())
        )
    );

-- Políticas de Assinaturas
CREATE POLICY "Ver assinaturas"
    ON public.decisao_assinaturas FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.decisoes d
            JOIN public.obras o ON o.id = d.obra_id
            WHERE d.id = decisao_assinaturas.decisao_id
            AND (o.construtor_id = auth.uid() OR o.cliente_id = auth.uid())
        )
    );

CREATE POLICY "Inserir assinatura digital"
    ON public.decisao_assinaturas FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.role() = 'authenticated');

-- Políticas de Projetos PDF (Construtor adiciona, Cliente visualiza, suporte a anônimo com token)
CREATE POLICY "Ver projetos anexados"
    ON public.projetos_pdf FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.obras o
            WHERE o.id = projetos_pdf.obra_id
            AND (o.construtor_id = auth.uid() OR o.cliente_id = auth.uid())
        )
    );

CREATE POLICY "Construtor gerencia projetos"
    ON public.projetos_pdf FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.obras o
            WHERE o.id = projetos_pdf.obra_id
            AND o.construtor_id = auth.uid()
        )
    );

-- Políticas de Registro de Notas
CREATE POLICY "Ver registro de notas"
    ON public.registro_notas FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.obras o
            WHERE o.id = registro_notas.obra_id
            AND (o.construtor_id = auth.uid() OR o.cliente_id = auth.uid())
        )
    );

CREATE POLICY "Construtor gerencia notas"
    ON public.registro_notas FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.obras o
            WHERE o.id = registro_notas.obra_id
            AND o.construtor_id = auth.uid()
        )
    );

-- Políticas de Punch List
CREATE POLICY "Ver itens da vistoria final"
    ON public.punch_list_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.obras o
            WHERE o.id = punch_list_items.obra_id
            AND (o.construtor_id = auth.uid() OR o.cliente_id = auth.uid())
        )
    );

CREATE POLICY "Construtor gerencia vistoria final"
    ON public.punch_list_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.obras o
            WHERE o.id = punch_list_items.obra_id
            AND o.construtor_id = auth.uid()
        )
    );

-- Políticas de Templates
CREATE POLICY "Qualquer autenticado pode ler templates"
    ON public.modelos_etapas_templates FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Usuário gerencia seus templates customizados"
    ON public.modelos_etapas_templates FOR ALL
    USING (auth.uid() = criado_por);

-- ==============================================================================
-- STORAGE BUCKETS (INSTRUÇÕES PARA CONFIGURAÇÃO NO SUPABASE)
-- ==============================================================================
-- Execute no Supabase Storage:
-- 1. Bucket 'projetos-pdf' (privado ou público conforme necessidade de visualização)
-- 2. Bucket 'evidencias-diario' (público para fotos de canteiro)
-- 3. Bucket 'registro-notas' (privado para notas fiscais e recibos)
