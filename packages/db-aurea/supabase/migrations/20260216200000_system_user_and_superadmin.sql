-- =====================================================
-- SYSTEM USER + SUPERADMIN
-- Tabela para controle de acesso global ao sistema
-- =====================================================

-- 1) TABELA SYSTEM_USER
CREATE TABLE IF NOT EXISTS public.system_user (
  auth_user_id UUID PRIMARY KEY,
  is_superadmin BOOLEAN NOT NULL DEFAULT FALSE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.system_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_user FORCE ROW LEVEL SECURITY;

-- =====================================================
-- 2) FUNÇÕES AUXILIARES
-- =====================================================

-- Verifica se o usuário atual é superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.system_user su
    WHERE su.auth_user_id = auth.uid()
      AND su.is_superadmin = TRUE
  );
$$;

REVOKE ALL ON FUNCTION public.is_superadmin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;

-- Verifica se o usuário atual é um system_user (qualquer tipo)
CREATE OR REPLACE FUNCTION public.is_system_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.system_user su
    WHERE su.auth_user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_system_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_system_user() TO authenticated;

-- Conta quantos system_users existem (para lógica de bootstrap no frontend)
CREATE OR REPLACE FUNCTION public.count_system_users()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.system_user;
$$;

REVOKE ALL ON FUNCTION public.count_system_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_system_users() TO authenticated;

-- =====================================================
-- 3) RLS PARA SYSTEM_USER
-- =====================================================

-- SELECT: superadmin vê todos; demais veem apenas seu próprio registro
CREATE POLICY "system_user_select_policy"
  ON public.system_user
  FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin()
    OR auth_user_id = auth.uid()
  );

-- INSERT: superadmin pode inserir; ou bootstrap (quando não há nenhum superadmin)
CREATE POLICY "system_user_insert_policy"
  ON public.system_user
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM public.system_user WHERE is_superadmin = TRUE)
    OR public.is_superadmin()
  );

-- UPDATE: superadmin pode atualizar qualquer; usuário pode atualizar próprio (sem alterar is_superadmin)
CREATE POLICY "system_user_update_policy"
  ON public.system_user
  FOR UPDATE
  TO authenticated
  USING (
    public.is_superadmin()
    OR auth_user_id = auth.uid()
  )
  WITH CHECK (
    public.is_superadmin()
    OR (
      auth_user_id = auth.uid()
      AND is_superadmin = (
        SELECT su.is_superadmin
        FROM public.system_user su
        WHERE su.auth_user_id = auth.uid()
      )
    )
  );

-- DELETE: apenas superadmin, e não pode deletar a si mesmo
CREATE POLICY "system_user_delete_policy"
  ON public.system_user
  FOR DELETE
  TO authenticated
  USING (
    public.is_superadmin()
    AND auth_user_id != auth.uid()
  );

-- =====================================================
-- 4) ATUALIZAR RLS DE COMPANY
-- Superadmin pode ver/gerenciar todas as empresas
-- =====================================================

DROP POLICY IF EXISTS "company_select_policy" ON public.company;
CREATE POLICY "company_select_policy"
  ON public.company
  FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin()
    OR public.is_system_user()
    OR id = public.get_user_company_id()
  );

DROP POLICY IF EXISTS "company_insert_policy" ON public.company;
CREATE POLICY "company_insert_policy"
  ON public.company
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_superadmin()
  );

DROP POLICY IF EXISTS "company_update_policy" ON public.company;
CREATE POLICY "company_update_policy"
  ON public.company
  FOR UPDATE
  TO authenticated
  USING (
    public.is_superadmin()
    OR (id = public.get_user_company_id() AND public.is_user_admin())
  )
  WITH CHECK (
    public.is_superadmin()
    OR (id = public.get_user_company_id() AND public.is_user_admin())
  );

DROP POLICY IF EXISTS "company_delete_policy" ON public.company;
CREATE POLICY "company_delete_policy"
  ON public.company
  FOR DELETE
  TO authenticated
  USING (public.is_superadmin());

-- =====================================================
-- 5) ATUALIZAR RLS DE APP_USER
-- Superadmin pode ver/gerenciar todos os usuários
-- =====================================================

DROP POLICY IF EXISTS "app_user_select_policy" ON public.app_user;
CREATE POLICY "app_user_select_policy"
  ON public.app_user
  FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin()
    OR public.is_system_user()
    OR auth_user_id = auth.uid()
    OR company_id = public.get_user_company_id()
  );

DROP POLICY IF EXISTS "app_user_insert_policy" ON public.app_user;
CREATE POLICY "app_user_insert_policy"
  ON public.app_user
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_superadmin()
    OR (company_id = public.get_user_company_id() AND public.is_user_admin())
    -- Bootstrap: quando não há system_users, autenticados podem criar (onboarding)
    OR NOT EXISTS (SELECT 1 FROM public.system_user WHERE is_superadmin = TRUE)
  );

DROP POLICY IF EXISTS "app_user_update_policy" ON public.app_user;
CREATE POLICY "app_user_update_policy"
  ON public.app_user
  FOR UPDATE
  TO authenticated
  USING (
    public.is_superadmin()
    OR auth_user_id = auth.uid()
    OR (company_id = public.get_user_company_id() AND public.is_user_admin())
  )
  WITH CHECK (
    public.is_superadmin()
    OR (
      auth_user_id = auth.uid()
      AND company_id = (SELECT au.company_id FROM public.app_user au WHERE au.auth_user_id = auth.uid())
      AND access_profile_id IS NOT DISTINCT FROM (
        SELECT au.access_profile_id FROM public.app_user au WHERE au.auth_user_id = auth.uid()
      )
    )
    OR (
      company_id = public.get_user_company_id()
      AND public.is_user_admin()
    )
  );

DROP POLICY IF EXISTS "app_user_delete_policy" ON public.app_user;
CREATE POLICY "app_user_delete_policy"
  ON public.app_user
  FOR DELETE
  TO authenticated
  USING (
    public.is_superadmin()
    OR (company_id = public.get_user_company_id() AND public.is_user_admin())
  );

-- =====================================================
-- 6) ATUALIZAR RLS DE ACCESS_PROFILE
-- Superadmin pode ver todos os perfis
-- =====================================================

DROP POLICY IF EXISTS "access_profile_select_policy" ON public.access_profile;
CREATE POLICY "access_profile_select_policy"
  ON public.access_profile
  FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin()
    OR public.is_system_user()
    OR company_id IS NULL
    OR company_id = public.get_user_company_id()
  );
