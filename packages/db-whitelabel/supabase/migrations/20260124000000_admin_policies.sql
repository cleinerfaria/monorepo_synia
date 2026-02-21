-- =============================================
-- ADMIN POLICIES (AJUSTADO PARA MULTI-TENANT SEGURO)
-- Objetivo:
-- - NÃO enfraquecer RLS
-- - Remover policies permissivas antigas
-- - Garantir policies seguras para company e app_user
-- =============================================

-- =============================================
-- 1) GARANTIR RLS + FORCE RLS
-- =============================================
ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company FORCE ROW LEVEL SECURITY;

ALTER TABLE public.app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_user FORCE ROW LEVEL SECURITY;

-- =============================================
-- 2) REMOVER POLICIES PERMISSIVAS ANTIGAS (se existirem)
-- =============================================

-- company (antigas)

-- app_user (antigas)

-- =============================================
-- 3) GARANTIR POLICIES SEGURAS (sem duplicar)
--    (Postgres não tem CREATE POLICY IF NOT EXISTS,
--     então usamos um DO para criar só se não existir.)
-- =============================================

DO $$
BEGIN
  -- COMPANY: SELECT (usuário vê apenas a própria empresa)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'company'
      AND policyname = 'Users can view their own company'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Users can view their own company"
        ON public.company
        FOR SELECT
        TO authenticated
        USING (id = public.get_user_company_id())
    $sql$;
  END IF;

  -- COMPANY: UPDATE (somente admin da empresa)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'company'
      AND policyname = 'Admins can update their company'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Admins can update their company"
        ON public.company
        FOR UPDATE
        TO authenticated
        USING (id = public.get_user_company_id() AND public.is_user_admin())
        WITH CHECK (id = public.get_user_company_id() AND public.is_user_admin())
    $sql$;
  END IF;

  -- APP_USER: SELECT (usuário vê a si mesmo e usuários do tenant)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'app_user'
      AND policyname = 'Users can view users in their company'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Users can view users in their company"
        ON public.app_user
        FOR SELECT
        TO authenticated
        USING (
          auth_user_id = auth.uid()
          OR company_id = public.get_user_company_id()
        )
    $sql$;
  END IF;

  -- APP_USER: INSERT (somente admin do tenant)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'app_user'
      AND policyname = 'Admins can insert users in their company'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Admins can insert users in their company"
        ON public.app_user
        FOR INSERT
        TO authenticated
        WITH CHECK (
          company_id = public.get_user_company_id()
          AND public.is_user_admin()
        )
    $sql$;
  END IF;

  -- APP_USER: UPDATE (self sem trocar company, ou admin no tenant)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'app_user'
      AND policyname = 'Users can update own record or admins can update'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Users can update own record or admins can update"
        ON public.app_user
        FOR UPDATE
        TO authenticated
        USING (
          auth_user_id = auth.uid()
          OR (company_id = public.get_user_company_id() AND public.is_user_admin())
        )
        WITH CHECK (
          (
            auth_user_id = auth.uid()
            AND company_id = (SELECT au.company_id FROM public.app_user au WHERE au.auth_user_id = auth.uid())
          )
          OR
          (
            company_id = public.get_user_company_id()
            AND public.is_user_admin()
          )
        )
    $sql$;
  END IF;

  -- APP_USER: DELETE (somente admin do tenant)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'app_user'
      AND policyname = 'Admins can delete users'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Admins can delete users"
        ON public.app_user
        FOR DELETE
        TO authenticated
        USING (
          company_id = public.get_user_company_id()
          AND public.is_user_admin()
        )
    $sql$;
  END IF;
END
$$;
