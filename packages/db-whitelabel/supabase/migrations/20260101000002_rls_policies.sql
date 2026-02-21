-- =====================================================
-- BASE MULTI-TENANT (GENÉRICA) - Migration 02
-- Row Level Security (RLS) Policies
-- Escopo atual: SOMENTE public.company e public.app_user
-- Regras:
-- - Nunca usar varchar -> sempre TEXT
-- - FORÇAR RLS para evitar bypass acidental
-- - app_user: não permitir INSERT por usuário comum (onboarding via RPC/Service Role)
-- =====================================================

-- =====================================================
-- 1) HABILITAR RLS
-- =====================================================

ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company FORCE ROW LEVEL SECURITY;

ALTER TABLE public.app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_user FORCE ROW LEVEL SECURITY;

-- =====================================================
-- 2) LIMPAR POLICIES EXISTENTES (IDEMPOTENTE)
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own company" ON public.company;
DROP POLICY IF EXISTS "Admins can update their company" ON public.company;

DROP POLICY IF EXISTS "Users can view users in their company" ON public.app_user;
DROP POLICY IF EXISTS "Admins can insert users in their company" ON public.app_user;
DROP POLICY IF EXISTS "Users can update own record or admins can update" ON public.app_user;
DROP POLICY IF EXISTS "Admins can delete users" ON public.app_user;

-- =====================================================
-- 3) POLICIES: COMPANY
-- =====================================================

-- SELECT: usuário autenticado só enxerga a sua própria empresa
CREATE POLICY "Users can view their own company"
  ON public.company
  FOR SELECT
  TO authenticated
  USING (id = public.get_user_company_id());

-- UPDATE: somente admin da empresa
CREATE POLICY "Admins can update their company"
  ON public.company
  FOR UPDATE
  TO authenticated
  USING (id = public.get_user_company_id() AND public.is_user_admin())
  WITH CHECK (id = public.get_user_company_id() AND public.is_user_admin());

-- (Sem INSERT/DELETE por RLS)
-- A criação do tenant deve ser via onboarding (RPC/Service Role).

-- =====================================================
-- 4) POLICIES: APP_USER
-- =====================================================

-- SELECT: usuário vê seu próprio registro e os usuários da mesma empresa
CREATE POLICY "Users can view users in their company"
  ON public.app_user
  FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR company_id = public.get_user_company_id()
  );

-- INSERT: somente admin da empresa
-- (Onboarding do primeiro usuário geralmente é via RPC/Service Role)
CREATE POLICY "Admins can insert users in their company"
  ON public.app_user
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = public.get_user_company_id() AND public.is_user_admin());

-- UPDATE:
-- - usuário pode atualizar o próprio registro, mas NÃO pode alterar company_id
-- - admin pode atualizar qualquer usuário da empresa
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
      -- Self-update: trava company_id para não escalar privilégios nem trocar de tenant
      auth_user_id = auth.uid()
      AND company_id = (SELECT au.company_id FROM public.app_user au WHERE au.auth_user_id = auth.uid())
    )
    OR
    (
      -- Admin: pode atualizar dentro do próprio tenant
      company_id = public.get_user_company_id()
      AND public.is_user_admin()
    )
  );

-- DELETE: somente admin da empresa
CREATE POLICY "Admins can delete users"
  ON public.app_user
  FOR DELETE
  TO authenticated
  USING (company_id = public.get_user_company_id() AND public.is_user_admin());
