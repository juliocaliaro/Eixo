-- ==============================================================================
-- MIGRAÇÃO SUPABASE: SUPORTE AO FLUXO DE ACESSO DO CLIENTE POR LISTA DE E-MAILS
-- Permite que múltiplos clientes autorizados (por e-mail) acessem a obra
-- e reforça políticas RLS de segurança (Read-only + Decisões)
-- ==============================================================================

-- 1. Adicionar colunas de suporte a e-mails de clientes na tabela 'public.obras'
ALTER TABLE public.obras 
ADD COLUMN IF NOT EXISTS emails_clientes TEXT[] DEFAULT '{}' NOT NULL;

ALTER TABLE public.obras 
ADD COLUMN IF NOT EXISTS cliente_email VARCHAR(255);

-- 2. Índice GIN para busca ultra-rápida de arrays de e-mails em queries com .contains / operador @>
CREATE INDEX IF NOT EXISTS idx_obras_emails_clientes 
ON public.obras USING GIN (emails_clientes);

CREATE INDEX IF NOT EXISTS idx_obras_cliente_email 
ON public.obras (cliente_email);

-- 3. Atualizar política RLS para que clientes vejam suas obras pelo e-mail autenticado
-- (Seja por auth.uid() = cliente_id, ou se o e-mail do auth.jwt() estiver em emails_clientes)
DROP POLICY IF EXISTS "Clientes podem visualizar obras atribuídas a eles" ON public.obras;

CREATE POLICY "Clientes podem visualizar obras atribuídas a eles"
    ON public.obras FOR SELECT
    USING (
        auth.uid() = cliente_id 
        OR (auth.jwt() ->> 'email') = ANY(emails_clientes)
        OR LOWER(auth.jwt() ->> 'email') = LOWER(cliente_email)
    );

-- 4. Atualizar políticas RLS das entidades filhas para contemplar emails_clientes
-- Etapas
DROP POLICY IF EXISTS "Ver etapas da obra" ON public.etapas;
CREATE POLICY "Ver etapas da obra"
    ON public.etapas FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.obras o
            WHERE o.id = etapas.obra_id
            AND (
                o.construtor_id = auth.uid() 
                OR o.cliente_id = auth.uid()
                OR (auth.jwt() ->> 'email') = ANY(o.emails_clientes)
                OR LOWER(auth.jwt() ->> 'email') = LOWER(o.cliente_email)
            )
        )
    );

-- Tarefas
DROP POLICY IF EXISTS "Ver tarefas" ON public.tarefas;
CREATE POLICY "Ver tarefas"
    ON public.tarefas FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.etapas e
            JOIN public.obras o ON o.id = e.obra_id
            WHERE e.id = tarefas.etapa_id
            AND (
                o.construtor_id = auth.uid() 
                OR o.cliente_id = auth.uid()
                OR (auth.jwt() ->> 'email') = ANY(o.emails_clientes)
                OR LOWER(auth.jwt() ->> 'email') = LOWER(o.cliente_email)
            )
        )
    );

-- Decisões (Cliente pode visualizar e atualizar/assinar)
DROP POLICY IF EXISTS "Ver decisoes da obra" ON public.decisoes;
CREATE POLICY "Ver decisoes da obra"
    ON public.decisoes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.obras o
            WHERE o.id = decisoes.obra_id
            AND (
                o.construtor_id = auth.uid() 
                OR o.cliente_id = auth.uid()
                OR (auth.jwt() ->> 'email') = ANY(o.emails_clientes)
                OR LOWER(auth.jwt() ->> 'email') = LOWER(o.cliente_email)
            )
        )
    );

-- Projetos / Documentos (Cliente pode visualizar)
DROP POLICY IF EXISTS "Ver projetos da obra" ON public.projetos_pdf;
CREATE POLICY "Ver projetos da obra"
    ON public.projetos_pdf FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.obras o
            WHERE o.id = projetos_pdf.obra_id
            AND (
                o.construtor_id = auth.uid() 
                OR o.cliente_id = auth.uid()
                OR (auth.jwt() ->> 'email') = ANY(o.emails_clientes)
                OR LOWER(auth.jwt() ->> 'email') = LOWER(o.cliente_email)
            )
        )
    );
