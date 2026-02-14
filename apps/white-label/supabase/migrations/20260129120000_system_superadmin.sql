-- =====================================================
-- SYSTEM SUPERADMIN (global)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.system_user (
  auth_user_id UUID PRIMARY KEY,
  is_superadmin BOOLEAN NOT NULL DEFAULT FALSE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.system_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_user FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_user_self_read" ON public.system_user;

-- cada usuário só enxerga seu próprio registro (não é essencial, mas ok)
CREATE POLICY "system_user_self_read"
  ON public.system_user
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- Função: é superadmin?
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

-- ACCESS_PROFILE: permitir superadmin ver todos os perfis
DROP POLICY IF EXISTS "access_profile_select_policy" ON public.access_profile;

CREATE POLICY "access_profile_select_policy"
  ON public.access_profile
  FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin()
    OR company_id IS NULL
    OR company_id = public.get_user_company_id()
  );


-- COMPANY: permitir superadmin ver tudo
DROP POLICY IF EXISTS "Users can view their own company" ON public.company;

CREATE POLICY "Users can view their own company"
  ON public.company
  FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin()
    OR id = public.get_user_company_id()
  );

-- COMPANY: permitir superadmin criar/atualizar/apagar qualquer company
DROP POLICY IF EXISTS "Admins can update their company" ON public.company;

CREATE POLICY "Admins can update their company"
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

-- Opcional: permitir INSERT/DELETE de company só para superadmin
DROP POLICY IF EXISTS "Superadmin can insert company" ON public.company;
DROP POLICY IF EXISTS "Superadmin can delete company" ON public.company;

CREATE POLICY "Superadmin can insert company"
  ON public.company
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_superadmin());

CREATE POLICY "Superadmin can delete company"
  ON public.company
  FOR DELETE
  TO authenticated
  USING (public.is_superadmin());


-- APP_USER: superadmin pode ver todos usuários
DROP POLICY IF EXISTS "Users can view users in their company" ON public.app_user;

CREATE POLICY "Users can view users in their company"
  ON public.app_user
  FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin()
    OR auth_user_id = auth.uid()
    OR company_id = public.get_user_company_id()
  );

-- APP_USER: superadmin pode inserir em qualquer company
DROP POLICY IF EXISTS "Admins can insert users in their company" ON public.app_user;

CREATE POLICY "Admins can insert users in their company"
  ON public.app_user
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_superadmin()
    OR (company_id = public.get_user_company_id() AND public.is_user_admin())
  );

-- APP_USER: superadmin pode atualizar/deletar qualquer usuário
DROP POLICY IF EXISTS "Users can update own record or admins can update" ON public.app_user;

CREATE POLICY "Users can update own record or admins can update"
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
        SELECT au.access_profile_id
        FROM public.app_user au
        WHERE au.auth_user_id = auth.uid()
      )
    )
    OR (
      company_id = public.get_user_company_id()
      AND public.is_user_admin()
    )
  );

DROP POLICY IF EXISTS "Admins can delete users" ON public.app_user;

CREATE POLICY "Admins can delete users"
  ON public.app_user
  FOR DELETE
  TO authenticated
  USING (
    public.is_superadmin()
    OR (company_id = public.get_user_company_id() AND public.is_user_admin())
  );
