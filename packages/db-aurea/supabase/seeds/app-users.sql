-- =====================================================
-- App Users & System User Seed - Aurea
-- =====================================================
-- Este arquivo vincula os auth users aos registros em:
-- - public.system_user (superadmin bootstrap)
-- - public.app_user (admin, manager, viewer)
--
-- PRÉ-REQUISITOS:
-- Os seguintes auth users devem já existir em auth.users:
--   - admin@aurea.local (system admin)
--   - e2e.admin@aurea.local (app admin)
--   - e2e.manager@aurea.local (app manager)
--   - e2e.user@aurea.local (app viewer)
-- =====================================================

BEGIN;

DO $$
DECLARE
  v_company_id UUID;
  v_system_admin_auth_id UUID;
  v_admin_auth_id UUID;
  v_manager_auth_id UUID;
  v_user_auth_id UUID;
  v_admin_profile_id UUID;
  v_manager_profile_id UUID;
  v_viewer_profile_id UUID;
BEGIN
  -- Buscar empresa criada pela migration
  SELECT id INTO v_company_id FROM public.company 
  WHERE document = '00.000.000/0001-00' LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Empresa inicial não encontrada.';
  END IF;

  -- Buscar access profiles do sistema
  SELECT id INTO v_admin_profile_id FROM public.access_profile 
  WHERE code = 'admin' AND is_system = true LIMIT 1;
  
  SELECT id INTO v_manager_profile_id FROM public.access_profile 
  WHERE code = 'manager' AND is_system = true LIMIT 1;
  
  SELECT id INTO v_viewer_profile_id FROM public.access_profile 
  WHERE code = 'viewer' AND is_system = true LIMIT 1;

  -- Buscar auth users já criados
  SELECT id INTO v_system_admin_auth_id FROM auth.users 
  WHERE email = 'superadmin@aurea.com' LIMIT 1;
  
  SELECT id INTO v_admin_auth_id FROM auth.users 
  WHERE email = 'admin@aurea.com' LIMIT 1;
  
  SELECT id INTO v_manager_auth_id FROM auth.users 
  WHERE email = 'manager@aurea.com' LIMIT 1;
  
  SELECT id INTO v_user_auth_id FROM auth.users 
  WHERE email = 'user@aurea.com' LIMIT 1;

  -- Validar se todos os auth users existem
  IF v_system_admin_auth_id IS NULL THEN
    RAISE EXCEPTION 'Auth user superadmin@aurea.com não encontrado. Execute npm run db:seed:dev:aurea primeiro.';
  END IF;
  IF v_admin_auth_id IS NULL THEN
    RAISE EXCEPTION 'Auth user admin@aurea.com não encontrado.';
  END IF;
  IF v_manager_auth_id IS NULL THEN
    RAISE EXCEPTION 'Auth user manager@aurea.com não encontrado.';
  END IF;
  IF v_user_auth_id IS NULL THEN
    RAISE EXCEPTION 'Auth user user@aurea.com não encontrado.';
  END IF;

  -- =====================================================
  -- 1) SYSTEM USER (Superadmin Bootstrap)
  -- =====================================================
  INSERT INTO public.system_user (auth_user_id, is_superadmin, name, email)
  VALUES (
    v_system_admin_auth_id,
    TRUE,
    'Super Admin',
    'superadmin@aurea.com'
  )
  ON CONFLICT (auth_user_id) DO NOTHING;

  -- =====================================================
  -- 2) APP USERS (4 usuários de aplicação)
  -- =====================================================
  INSERT INTO public.app_user 
    (company_id, auth_user_id, name, email, role, active, access_profile_id)
  VALUES 
    -- System Admin (também em app_user para acesso via interface)
    (v_company_id, v_system_admin_auth_id, 'Super Admin', 'superadmin@aurea.com', 'admin', true, v_admin_profile_id),
    -- App Users
    (v_company_id, v_admin_auth_id, 'Admin', 'admin@aurea.com', 'admin', true, v_admin_profile_id),
    (v_company_id, v_manager_auth_id, 'Manager', 'manager@aurea.com', 'manager', true, v_manager_profile_id),
    (v_company_id, v_user_auth_id, 'User', 'user@aurea.com', 'viewer', true, v_viewer_profile_id)
  ON CONFLICT (auth_user_id) DO NOTHING;

  RAISE NOTICE 'App users seed applied: 1 system admin + 3 app users';
  RAISE NOTICE 'Company: %', v_company_id;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'App users seed warning: %', SQLERRM;
END $$;

COMMIT;
