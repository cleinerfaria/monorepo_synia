-- White Label App Users + System User
-- Este arquivo é chamado automaticamente por db-seed-dev.cjs
-- Vincula auth.users aos registros públicos (app_user, system_user)
--
-- PRÉ-REQUISITOS:
-- 1. auth.users já deve ter os 3 usuários criados (via Node.js API)
-- 2. app_env = 'dev'

DO $$
DECLARE
  v_admin_auth_id UUID;
  v_manager_auth_id UUID;
  v_user_auth_id UUID;
  v_admin_profile_id UUID;
  v_manager_profile_id UUID;
  v_user_profile_id UUID;
  v_company_id UUID;
  v_company_error TEXT;
BEGIN
  -- 1. Buscar company por CNPJ
  RAISE NOTICE '[APP-USERS] 🔍 Buscando empresa White Label (22.222.222/0001-22)...';
  SELECT id INTO v_company_id
  FROM public.company
  WHERE btrim(document) = '22.222.222/0001-22'
  LIMIT 1;

  IF v_company_id IS NULL THEN
    v_company_error := 'Empresa White Label não encontrada. Execute migrations primeiro.';
    RAISE NOTICE '[APP-USERS] ❌ %', v_company_error;
    RAISE EXCEPTION '%', v_company_error;
  END IF;
  RAISE NOTICE '[APP-USERS] ✅ Empresa encontrada: %', v_company_id;

  -- 2. Buscar auth users (devem ter sido criados via API)
  RAISE NOTICE '[APP-USERS] 🔍 Buscando auth users...';
  
  SELECT id INTO v_admin_auth_id
  FROM auth.users
  WHERE email = 'e2e.admin@whitelabel.local'
  LIMIT 1;

  SELECT id INTO v_manager_auth_id
  FROM auth.users
  WHERE email = 'e2e.manager@whitelabel.local'
  LIMIT 1;

  SELECT id INTO v_user_auth_id
  FROM auth.users
  WHERE email = 'e2e.user@whitelabel.local'
  LIMIT 1;

  IF v_admin_auth_id IS NULL OR v_manager_auth_id IS NULL OR v_user_auth_id IS NULL THEN
    RAISE NOTICE '[APP-USERS] ❌ Auth users não encontrados. Verificar se Node.js criou os usuários.';
    RAISE EXCEPTION 'Auth users não encontrados';
  END IF;
  RAISE NOTICE '[APP-USERS] ✅ Auth users encontrados';

  -- 3. Buscar access_profiles por código
  RAISE NOTICE '[APP-USERS] 🔍 Buscando access_profiles...';
  
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
    RAISE NOTICE '[APP-USERS] ❌ Access profiles não encontrados. Verificar se migrations criou os registros.';
    RAISE EXCEPTION 'Access profiles não encontrados';
  END IF;
  RAISE NOTICE '[APP-USERS] ✅ Access profiles encontrados';

  -- 4. Criar system_user para o admin
  RAISE NOTICE '[APP-USERS] 📝 Inserindo system_user...';
  INSERT INTO public.system_user (auth_user_id, is_superadmin, name, email)
  VALUES (
    v_admin_auth_id,
    true,
    'E2E Admin White Label',
    'e2e.admin@whitelabel.local'
  )
  ON CONFLICT (auth_user_id) DO UPDATE SET
    is_superadmin = EXCLUDED.is_superadmin,
    name = EXCLUDED.name,
    email = EXCLUDED.email;
  RAISE NOTICE '[APP-USERS] ✅ system_user criado/atualizado';

  -- 5. Criar app_users
  RAISE NOTICE '[APP-USERS] 📝 Inserindo app_users...';
  INSERT INTO public.app_user (
    company_id, auth_user_id, name, email, active, access_profile_id
  )
  VALUES
    (v_company_id, v_admin_auth_id, 'E2E Admin White Label', 'e2e.admin@whitelabel.local', true, v_admin_profile_id),
    (v_company_id, v_manager_auth_id, 'E2E Manager White Label', 'e2e.manager@whitelabel.local', true, v_manager_profile_id),
    (v_company_id, v_user_auth_id, 'E2E User White Label', 'e2e.user@whitelabel.local', true, v_user_profile_id)
  ON CONFLICT (auth_user_id, company_id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    active = EXCLUDED.active,
    access_profile_id = EXCLUDED.access_profile_id;
  RAISE NOTICE '[APP-USERS] ✅ app_users criados/atualizados';

  RAISE NOTICE '[APP-USERS] ✨ Seed concluído com sucesso!';
END $$;
