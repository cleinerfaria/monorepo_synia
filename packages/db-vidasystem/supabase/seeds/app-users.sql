-- =====================================================
-- App Users & System User Seed - VidaSystem
-- =====================================================
-- Este arquivo vincula auth users aos registros em:
-- - public.system_user (superadmin bootstrap)
-- - public.app_user (admin, manager, viewer)
--
-- Comportamento:
-- - idempotente
-- - não falha o reset quando auth users ainda não existem
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
  SELECT id INTO v_company_id
  FROM public.company
  WHERE document = '00.000.000/0001-00'
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Empresa inicial não encontrada.';
  END IF;

  -- Buscar access profiles da empresa
  SELECT id INTO v_admin_profile_id
  FROM public.access_profile
  WHERE code = 'admin' AND company_id = v_company_id
  LIMIT 1;

  SELECT id INTO v_manager_profile_id
  FROM public.access_profile
  WHERE code = 'manager' AND company_id = v_company_id
  LIMIT 1;

  SELECT id INTO v_viewer_profile_id
  FROM public.access_profile
  WHERE code = 'viewer' AND company_id = v_company_id
  LIMIT 1;

  IF v_admin_profile_id IS NULL OR v_manager_profile_id IS NULL OR v_viewer_profile_id IS NULL THEN
    RAISE EXCEPTION 'Perfis de acesso da empresa não encontrados (admin/manager/viewer).';
  END IF;

  -- Buscar auth users já criados
  SELECT id INTO v_system_admin_auth_id FROM auth.users WHERE email = 'superadmin@vidasystem.com' LIMIT 1;
  SELECT id INTO v_admin_auth_id FROM auth.users WHERE email = 'admin@vidasystem.com' LIMIT 1;
  SELECT id INTO v_manager_auth_id FROM auth.users WHERE email = 'manager@vidasystem.com' LIMIT 1;
  SELECT id INTO v_user_auth_id FROM auth.users WHERE email = 'user@vidasystem.com' LIMIT 1;

  -- 1) SYSTEM USER (Superadmin Bootstrap)
  IF v_system_admin_auth_id IS NOT NULL THEN
    INSERT INTO public.system_user (auth_user_id, is_superadmin, name, email)
    VALUES (v_system_admin_auth_id, TRUE, 'Super Admin', 'superadmin@vidasystem.com')
    ON CONFLICT (auth_user_id) DO NOTHING;
  ELSE
    RAISE NOTICE 'Auth user superadmin@vidasystem.com não encontrado. Pulando system_user.';
  END IF;

  -- 2) APP USERS (vinculação condicional)
  IF v_system_admin_auth_id IS NOT NULL THEN
    INSERT INTO public.app_user (company_id, auth_user_id, name, email, is_active, access_profile_id)
    VALUES (v_company_id, v_system_admin_auth_id, 'Super Admin', 'superadmin@vidasystem.com', TRUE, v_admin_profile_id)
    ON CONFLICT (auth_user_id, company_id) DO NOTHING;
  END IF;

  IF v_admin_auth_id IS NOT NULL THEN
    INSERT INTO public.app_user (company_id, auth_user_id, name, email, is_active, access_profile_id)
    VALUES (v_company_id, v_admin_auth_id, 'Admin', 'admin@vidasystem.com', TRUE, v_admin_profile_id)
    ON CONFLICT (auth_user_id, company_id) DO NOTHING;
  ELSE
    RAISE NOTICE 'Auth user admin@vidasystem.com não encontrado. Pulando app_user admin.';
  END IF;

  IF v_manager_auth_id IS NOT NULL THEN
    INSERT INTO public.app_user (company_id, auth_user_id, name, email, is_active, access_profile_id)
    VALUES (v_company_id, v_manager_auth_id, 'Manager', 'manager@vidasystem.com', TRUE, v_manager_profile_id)
    ON CONFLICT (auth_user_id, company_id) DO NOTHING;
  ELSE
    RAISE NOTICE 'Auth user manager@vidasystem.com não encontrado. Pulando app_user manager.';
  END IF;

  IF v_user_auth_id IS NOT NULL THEN
    INSERT INTO public.app_user (company_id, auth_user_id, name, email, is_active, access_profile_id)
    VALUES (v_company_id, v_user_auth_id, 'User', 'user@vidasystem.com', TRUE, v_viewer_profile_id)
    ON CONFLICT (auth_user_id, company_id) DO NOTHING;
  ELSE
    RAISE NOTICE 'Auth user user@vidasystem.com não encontrado. Pulando app_user user.';
  END IF;

  RAISE NOTICE 'Seed de usuários de aplicação executado (modo tolerante).';
  RAISE NOTICE 'Company: %', v_company_id;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erro ao aplicar seed de usuários: %', SQLERRM;
END $$;

COMMIT;
