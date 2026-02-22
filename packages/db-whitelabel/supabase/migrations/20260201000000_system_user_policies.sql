-- =====================================================
-- SYSTEM USER POLICIES UPDATE
-- Permite que superadmins gerenciem todos os system_users
-- =====================================================

-- Função auxiliar para verificar se é admin multi-tenant
CREATE OR REPLACE FUNCTION public.is_multitenant_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.system_user su
    WHERE su.auth_user_id = auth.uid()
      AND su.is_superadmin = FALSE
  );
$$;

REVOKE ALL ON FUNCTION public.is_multitenant_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_multitenant_admin() TO authenticated;

-- Função auxiliar para verificar se é qualquer tipo de system_user
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

-- Superadmins podem ver TODOS os system_users
-- Multi-tenant admins só podem ver o próprio registro
CREATE POLICY "system_user_read_policy"
  ON public.system_user
  FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin()
    OR auth_user_id = auth.uid()
  );

-- Apenas superadmins podem inserir novos system_users

CREATE POLICY "system_user_insert_policy"
  ON public.system_user
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_superadmin());

-- Superadmins podem atualizar qualquer system_user
-- Cada usuário pode atualizar seu próprio registro (exceto is_superadmin)

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
      -- Se não é superadmin, não pode alterar o campo is_superadmin
      AND is_superadmin = (
        SELECT su.is_superadmin 
        FROM public.system_user su 
        WHERE su.auth_user_id = auth.uid()
      )
    )
  );

-- Apenas superadmins podem deletar system_users

CREATE POLICY "system_user_delete_policy"
  ON public.system_user
  FOR DELETE
  TO authenticated
  USING (
    public.is_superadmin()
    -- Não pode deletar a si mesmo (proteção extra via edge function)
    AND auth_user_id != auth.uid()
  );

-- =====================================================
-- COMPANY: permitir admin multi-tenant também gerenciar empresas
-- =====================================================

-- Atualizar política de SELECT para incluir multi-tenant admins
DROP POLICY IF EXISTS "Users can view their own company" ON public.company;

CREATE POLICY "Users can view their own company"
  ON public.company
  FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin()
    OR public.is_multitenant_admin()
    OR id = public.get_user_company_id()
  );

-- Multi-tenant admins podem criar empresas
DROP POLICY IF EXISTS "Superadmin can insert company" ON public.company;

CREATE POLICY "System admins can insert company"
  ON public.company
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_superadmin() 
    OR public.is_multitenant_admin()
  );

-- Multi-tenant admins podem atualizar empresas
DROP POLICY IF EXISTS "Admins can update their company" ON public.company;

CREATE POLICY "Admins can update company"
  ON public.company
  FOR UPDATE
  TO authenticated
  USING (
    public.is_superadmin()
    OR public.is_multitenant_admin()
    OR (id = public.get_user_company_id() AND public.is_user_admin())
  )
  WITH CHECK (
    public.is_superadmin()
    OR public.is_multitenant_admin()
    OR (id = public.get_user_company_id() AND public.is_user_admin())
  );

-- Apenas superadmins podem deletar empresas (mantém mais restritivo)
DROP POLICY IF EXISTS "Superadmin can delete company" ON public.company;

CREATE POLICY "Superadmin can delete company"
  ON public.company
  FOR DELETE
  TO authenticated
  USING (public.is_superadmin());

-- =====================================================
-- APP_USER: permitir admin multi-tenant gerenciar usuários de empresas
-- =====================================================

DROP POLICY IF EXISTS "Users can view users in their company" ON public.app_user;

CREATE POLICY "Users can view users in their company"
  ON public.app_user
  FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin()
    OR public.is_multitenant_admin()
    OR auth_user_id = auth.uid()
    OR company_id = public.get_user_company_id()
  );

DROP POLICY IF EXISTS "Admins can insert users in their company" ON public.app_user;

CREATE POLICY "Admins can insert users in their company"
  ON public.app_user
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_superadmin()
    OR public.is_multitenant_admin()
    OR (company_id = public.get_user_company_id() AND public.is_user_admin())
  );
