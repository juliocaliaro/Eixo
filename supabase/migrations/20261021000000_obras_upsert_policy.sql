-- Corrige permissao de INSERT/UPSERT em public.obras:
-- Ao executar ON CONFLICT DO UPDATE (upsert), o Postgres avalia tambem a policy
-- de UPDATE. Esta migracao garante que o construtor possa fazer upsert de obras
-- sem violar a verificacao de RLS caso a linha ainda nao exista.

DROP POLICY IF EXISTS eixo_obras_update ON public.obras;
CREATE POLICY eixo_obras_update ON public.obras FOR UPDATE TO authenticated
    USING ((SELECT private.can_write_obra(id)) OR (construtor_id = (SELECT auth.uid()) AND (SELECT private.is_construtor())))
    WITH CHECK (construtor_id = (SELECT auth.uid()) AND (SELECT private.is_construtor()));
