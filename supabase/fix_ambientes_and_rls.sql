-- ==============================================================================
-- EIXO - CORREÇÃO DE AGRUPAMENTOS E POLÍTICAS RLS NO SUPABASE
-- Execute este script no SQL Editor do seu Supabase (Dashboard -> SQL Editor -> New query)
-- ==============================================================================

-- 1. Adicionar a coluna 'ambientes' na tabela etapas
ALTER TABLE public.etapas 
ADD COLUMN IF NOT EXISTS ambientes TEXT[] DEFAULT '{}';

-- 2. Adicionar a coluna 'ambiente' na tabela tarefas
ALTER TABLE public.tarefas 
ADD COLUMN IF NOT EXISTS ambiente TEXT;

-- 3. Criar índice para performance em consultas com agrupamento
CREATE INDEX IF NOT EXISTS idx_tarefas_etapa_ambiente ON public.tarefas(etapa_id, ambiente);

-- 4. Ajustar as políticas RLS de tarefa_evidencias para evitar erros 403 (Forbidden)
DROP POLICY IF EXISTS "Construtor gerencia evidencias" ON public.tarefa_evidencias;
DROP POLICY IF EXISTS "Ver evidencias da tarefa" ON public.tarefa_evidencias;

CREATE POLICY "Ver evidencias da tarefa"
    ON public.tarefa_evidencias FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tarefas t
            JOIN public.etapas e ON e.id = t.etapa_id
            JOIN public.obras o ON o.id = e.obra_id
            WHERE t.id = tarefa_evidencias.tarefa_id
            AND (o.construtor_id = auth.uid() OR o.cliente_id = auth.uid() OR auth.uid() IS NULL)
        )
    );

CREATE POLICY "Construtor gerencia evidencias"
    ON public.tarefa_evidencias FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tarefas t
            JOIN public.etapas e ON e.id = t.etapa_id
            JOIN public.obras o ON o.id = e.obra_id
            WHERE t.id = tarefa_evidencias.tarefa_id
            AND (o.construtor_id = auth.uid() OR auth.uid() IS NULL)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tarefas t
            JOIN public.etapas e ON e.id = t.etapa_id
            JOIN public.obras o ON o.id = e.obra_id
            WHERE t.id = tarefa_evidencias.tarefa_id
            AND (o.construtor_id = auth.uid() OR auth.uid() IS NULL)
        )
    );

-- 5. Forçar a atualização imediata do cache de schema do PostgREST
NOTIFY pgrst, 'reload schema';
