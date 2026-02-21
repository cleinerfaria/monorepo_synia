-- =====================================================
-- SUPERADMIN MANAGEMENT - Permite múltiplos superadmins
-- =====================================================

-- Atualiza a policy para superadmins verem todos os system_users
DROP POLICY IF EXISTS "system_user_self_read" ON public.system_user;
DROP POLICY IF EXISTS "system_user_superadmin_read" ON public.system_user;

-- Superadmins podem ver todos; usuários normais veem apenas a si mesmos
CREATE POLICY "system_user_read"
  ON public.system_user
  FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR public.is_superadmin()
  );

-- Superadmins podem atualizar qualquer system_user
DROP POLICY IF EXISTS "system_user_superadmin_update" ON public.system_user;

CREATE POLICY "system_user_superadmin_update"
  ON public.system_user
  FOR UPDATE
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- Superadmins podem inserir novos system_users (via Service Role na Edge Function,
-- mas esta policy é para casos onde usamos RLS diretamente)
DROP POLICY IF EXISTS "system_user_superadmin_insert" ON public.system_user;

CREATE POLICY "system_user_superadmin_insert"
  ON public.system_user
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Primeiro superadmin pode ser criado se não existir nenhum
    NOT EXISTS (SELECT 1 FROM public.system_user WHERE is_superadmin = TRUE)
    -- Ou um superadmin existente pode criar
    OR public.is_superadmin()
  );

-- Superadmins podem remover superadmin status (mas não deletar o registro para manter histórico)
DROP POLICY IF EXISTS "system_user_superadmin_delete" ON public.system_user;

CREATE POLICY "system_user_superadmin_delete"
  ON public.system_user
  FOR DELETE
  TO authenticated
  USING (public.is_superadmin());

-- =====================================================
-- FUNÇÃO AUXILIAR: Contar superadmins
-- =====================================================

CREATE OR REPLACE FUNCTION public.count_superadmins()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.system_user
  WHERE is_superadmin = TRUE;
$$;

REVOKE ALL ON FUNCTION public.count_superadmins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_superadmins() TO authenticated;

-- =====================================================
-- FUNÇÃO AUXILIAR: Listar superadmins (para UI de admin)
-- =====================================================

CREATE OR REPLACE FUNCTION public.list_superadmins()
RETURNS TABLE (
  auth_user_id UUID,
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT su.auth_user_id, su.name, su.email, su.created_at
  FROM public.system_user su
  WHERE su.is_superadmin = TRUE
  ORDER BY su.created_at;
$$;

REVOKE ALL ON FUNCTION public.list_superadmins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_superadmins() TO authenticated;
