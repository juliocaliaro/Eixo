-- private.is_construtor(): comparação case-insensitive do papel.
-- Evita 42501 (permission denied) ao inserir obras quando profiles.role
-- estiver gravado como 'Construtor' (ou outra variação de capitalização).

CREATE OR REPLACE FUNCTION private.is_construtor()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND lower(coalesce(p.role, '')) = 'construtor'
    );
$$;
