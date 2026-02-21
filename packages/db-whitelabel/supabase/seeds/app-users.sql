-- =====================================================
-- App Users & System User Seed - White Label
-- =====================================================
-- This seed links auth users created in seed script to:
-- - public.system_user (admin bootstrap)
-- - public.app_user (admin, manager, user)
--
-- Behavior:
-- - idempotent
-- - tolerant: does not fail reset when users/company are missing
-- - role-driven: resolves auth users by raw_user_meta_data.seed_role
-- =====================================================

BEGIN;

DO $$
DECLARE
  v_company_id UUID;
  v_system_admin_auth_id UUID;
  v_system_admin_email text;
  v_admin_auth_id UUID;
  v_admin_email text;
  v_manager_auth_id UUID;
  v_manager_email text;
  v_user_auth_id UUID;
  v_user_email text;
  v_admin_profile_id UUID;
  v_manager_profile_id UUID;
  v_user_profile_id UUID;
BEGIN
  SELECT id INTO v_company_id
  FROM public.company
  WHERE btrim(document) = '22.222.222/0001-22'
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE NOTICE '[APP-USERS] Company with document 22.222.222/0001-22 not found. Skipping app-user seed.';
    RETURN;
  END IF;

  SELECT id INTO v_admin_profile_id
  FROM public.access_profile
  WHERE company_id = v_company_id AND code = 'admin'
  LIMIT 1;

  SELECT id INTO v_manager_profile_id
  FROM public.access_profile
  WHERE company_id = v_company_id AND code = 'manager'
  LIMIT 1;

  SELECT id INTO v_user_profile_id
  FROM public.access_profile
  WHERE company_id = v_company_id AND code = 'user'
  LIMIT 1;

  IF v_admin_profile_id IS NULL OR v_manager_profile_id IS NULL OR v_user_profile_id IS NULL THEN
    RAISE NOTICE '[APP-USERS] Access profiles (admin/manager/user) not found for company %. Skipping app-user seed.', v_company_id;
    RETURN;
  END IF;

  SELECT id, email INTO v_system_admin_auth_id, v_system_admin_email
  FROM auth.users
  WHERE raw_user_meta_data->>'seed_role' = 'system_admin'
  LIMIT 1;

  SELECT id, email INTO v_admin_auth_id, v_admin_email
  FROM auth.users
  WHERE raw_user_meta_data->>'seed_role' = 'admin'
  LIMIT 1;

  SELECT id, email INTO v_manager_auth_id, v_manager_email
  FROM auth.users
  WHERE raw_user_meta_data->>'seed_role' = 'manager'
  LIMIT 1;

  SELECT id, email INTO v_user_auth_id, v_user_email
  FROM auth.users
  WHERE raw_user_meta_data->>'seed_role' = 'user'
  LIMIT 1;

  IF v_system_admin_auth_id IS NOT NULL THEN
    INSERT INTO public.system_user (auth_user_id, is_superadmin, name, email)
    VALUES (
      v_system_admin_auth_id,
      true,
      'E2E System Admin White Label',
      v_system_admin_email
    )
    ON CONFLICT (auth_user_id) DO UPDATE SET
      is_superadmin = EXCLUDED.is_superadmin,
      name = EXCLUDED.name,
      email = EXCLUDED.email;
  ELSE
    RAISE NOTICE '[APP-USERS] Auth user with seed_role=system_admin not found. Skipping system_user.';
  END IF;

  IF v_system_admin_auth_id IS NOT NULL THEN
    INSERT INTO public.app_user (
      company_id, auth_user_id, name, email, active, access_profile_id
    )
    VALUES (
      v_company_id, v_system_admin_auth_id, 'E2E System Admin White Label', v_system_admin_email, true, v_admin_profile_id
    )
    ON CONFLICT (auth_user_id, company_id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      active = EXCLUDED.active,
      access_profile_id = EXCLUDED.access_profile_id;
  END IF;

  IF v_admin_auth_id IS NOT NULL THEN
    INSERT INTO public.app_user (
      company_id, auth_user_id, name, email, active, access_profile_id
    )
    VALUES (
      v_company_id, v_admin_auth_id, 'E2E Admin White Label', v_admin_email, true, v_admin_profile_id
    )
    ON CONFLICT (auth_user_id, company_id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      active = EXCLUDED.active,
      access_profile_id = EXCLUDED.access_profile_id;
  END IF;

  IF v_manager_auth_id IS NOT NULL THEN
    INSERT INTO public.app_user (
      company_id, auth_user_id, name, email, active, access_profile_id
    )
    VALUES (
      v_company_id, v_manager_auth_id, 'E2E Manager White Label', v_manager_email, true, v_manager_profile_id
    )
    ON CONFLICT (auth_user_id, company_id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      active = EXCLUDED.active,
      access_profile_id = EXCLUDED.access_profile_id;
  ELSE
    RAISE NOTICE '[APP-USERS] Auth user with seed_role=manager not found. Skipping manager app_user.';
  END IF;

  IF v_user_auth_id IS NOT NULL THEN
    INSERT INTO public.app_user (
      company_id, auth_user_id, name, email, active, access_profile_id
    )
    VALUES (
      v_company_id, v_user_auth_id, 'E2E User White Label', v_user_email, true, v_user_profile_id
    )
    ON CONFLICT (auth_user_id, company_id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      active = EXCLUDED.active,
      access_profile_id = EXCLUDED.access_profile_id;
  ELSE
    RAISE NOTICE '[APP-USERS] Auth user with seed_role=user not found. Skipping user app_user.';
  END IF;

  RAISE NOTICE '[APP-USERS] App user seed finished for company %.', v_company_id;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[APP-USERS] Error while running app-user seed: %', SQLERRM;
END $$;

COMMIT;
