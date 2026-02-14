-- =====================================================
-- ACCESS PROFILES (RBAC) - Migration
-- Base multi-tenant genérica
-- Regras:
-- - Nunca usar varchar -> sempre TEXT
-- - Sem seeds de módulos/permissões (genérico)
-- - RLS seguro: tenant isolation + admin control
-- - Corrige política de app_user para impedir auto-elevação via access_profile_id
-- =====================================================

-- =====================================================
-- 1) ACCESS PROFILE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.access_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.company(id) ON DELETE CASCADE, -- NULL = perfil do sistema (template)
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Se true e company_id NULL -> template do sistema
  is_system BOOLEAN NOT NULL DEFAULT FALSE,

  -- Se true -> acesso total (no ESCOPO do tenant do perfil)
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,

  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (company_id, code),

  -- Consistência: is_system só pode ser TRUE quando company_id IS NULL
  CONSTRAINT chk_access_profile_scope CHECK (
    (is_system = TRUE  AND company_id IS NULL)
    OR
    (is_system = FALSE AND company_id IS NOT NULL)
  )
);

-- Índice composto para buscas por empresa e código
CREATE INDEX IF NOT EXISTS idx_access_profile_company_code
  ON public.access_profile(company_id, code);

-- Índice único para garantir que só exista um template do sistema por code
CREATE UNIQUE INDEX IF NOT EXISTS ux_access_profile_system_code
  ON public.access_profile(code)
  WHERE company_id IS NULL;

-- Trigger de updated_at (reusa função da migration 01)
DROP TRIGGER IF EXISTS trg_access_profile_updated_at ON public.access_profile;
CREATE TRIGGER trg_access_profile_updated_at
BEFORE UPDATE ON public.access_profile
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 1.1) Função: verificar se usuário autenticado é admin (por access_profile)
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin_profile BOOLEAN;
BEGIN
  SELECT COALESCE(ap.is_admin, FALSE)
    INTO is_admin_profile
  FROM public.app_user au
  LEFT JOIN public.access_profile ap
    ON ap.id = au.access_profile_id
  WHERE au.auth_user_id = auth.uid();

  RETURN is_admin_profile = TRUE;
END;
$$;

-- =====================================================
-- 2) RBAC: MODULES E PERMISSIONS (GENÉRICO)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.system_module (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.module_permission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.system_module(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  UNIQUE (module_id, code)
);

CREATE INDEX IF NOT EXISTS idx_module_permission_module
  ON public.module_permission(module_id);

CREATE TABLE IF NOT EXISTS public.access_profile_permission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.access_profile(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.module_permission(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_access_profile_permission_profile
  ON public.access_profile_permission(profile_id);

CREATE INDEX IF NOT EXISTS idx_access_profile_permission_permission
  ON public.access_profile_permission(permission_id);

-- =====================================================
-- 3) APP_USER: adicionar access_profile_id
-- =====================================================

ALTER TABLE public.app_user
  ADD COLUMN IF NOT EXISTS access_profile_id UUID REFERENCES public.access_profile(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_app_user_access_profile
  ON public.app_user(access_profile_id);

-- Garantir FK caso a coluna já exista
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'app_user_access_profile_id_fkey'
      AND conrelid = 'public.app_user'::regclass
  ) THEN
    ALTER TABLE public.app_user
      ADD CONSTRAINT app_user_access_profile_id_fkey
      FOREIGN KEY (access_profile_id)
      REFERENCES public.access_profile(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

-- =====================================================
-- 3.1) Helper: obter access_profile_id por company + code
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_access_profile_id(
  p_company_id UUID,
  p_code TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  SELECT ap.id
    INTO v_profile_id
  FROM public.access_profile ap
  WHERE ap.code = p_code
    AND (ap.company_id = p_company_id OR ap.company_id IS NULL)
  ORDER BY ap.company_id NULLS LAST
  LIMIT 1;

  RETURN v_profile_id;
END;
$$;

-- =====================================================
-- 3.2) Trigger: definir access_profile_id padrão no app_user
-- - superadmin recebe perfil admin
-- - demais recebem viewer
-- =====================================================

CREATE OR REPLACE FUNCTION public.trg_app_user_default_access_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.access_profile_id IS NULL THEN
    IF public.is_superadmin() THEN
      NEW.access_profile_id := public.get_access_profile_id(NEW.company_id, 'admin');
    ELSE
      NEW.access_profile_id := public.get_access_profile_id(NEW.company_id, 'viewer');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_user_default_access_profile ON public.app_user;
CREATE TRIGGER app_user_default_access_profile
BEFORE INSERT ON public.app_user
FOR EACH ROW
EXECUTE FUNCTION public.trg_app_user_default_access_profile();

-- =====================================================
-- 4) GUARD: impedir profile de outra company
-- - permite templates do sistema (company_id NULL)
-- =====================================================

CREATE OR REPLACE FUNCTION public.trg_app_user_profile_company_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_profile_company UUID;
BEGIN
  IF NEW.access_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT ap.company_id
    INTO v_profile_company
  FROM public.access_profile ap
  WHERE ap.id = NEW.access_profile_id;

  -- Perfis do sistema (company_id NULL) são válidos para qualquer empresa
  IF v_profile_company IS NOT NULL AND v_profile_company <> NEW.company_id THEN
    RAISE EXCEPTION 'access_profile_id pertence a outra company';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_user_profile_company_guard ON public.app_user;
CREATE TRIGGER app_user_profile_company_guard
BEFORE INSERT OR UPDATE OF access_profile_id, company_id ON public.app_user
FOR EACH ROW
EXECUTE FUNCTION public.trg_app_user_profile_company_guard();

-- =====================================================
-- 5) CORRIGIR RLS DO APP_USER: travar access_profile_id no self-update
-- (evita usuário se dar um profile admin/template)
-- =====================================================

DROP POLICY IF EXISTS "Users can update own record or admins can update" ON public.app_user;

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
      -- Self-update: trava company_id e access_profile_id
      auth_user_id = auth.uid()
      AND company_id = (SELECT au.company_id FROM public.app_user au WHERE au.auth_user_id = auth.uid())
      AND access_profile_id IS NOT DISTINCT FROM (
        SELECT au.access_profile_id
        FROM public.app_user au
        WHERE au.auth_user_id = auth.uid()
      )
    )
    OR
    (
      -- Admin: pode atualizar dentro do próprio tenant
      company_id = public.get_user_company_id()
      AND public.is_user_admin()
    )
  );

-- =====================================================
-- 6) RLS: access_profile / modules / permissions
-- =====================================================

ALTER TABLE public.access_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_profile FORCE ROW LEVEL SECURITY;

ALTER TABLE public.system_module ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_module FORCE ROW LEVEL SECURITY;

ALTER TABLE public.module_permission ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_permission FORCE ROW LEVEL SECURITY;

ALTER TABLE public.access_profile_permission ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_profile_permission FORCE ROW LEVEL SECURITY;

-- Limpa policies antigas (idempotente)
DROP POLICY IF EXISTS "access_profile_select_policy" ON public.access_profile;
DROP POLICY IF EXISTS "access_profile_insert_policy" ON public.access_profile;
DROP POLICY IF EXISTS "access_profile_update_policy" ON public.access_profile;
DROP POLICY IF EXISTS "access_profile_delete_policy" ON public.access_profile;

DROP POLICY IF EXISTS "system_module_select_policy" ON public.system_module;
DROP POLICY IF EXISTS "module_permission_select_policy" ON public.module_permission;

DROP POLICY IF EXISTS "access_profile_permission_select_policy" ON public.access_profile_permission;
DROP POLICY IF EXISTS "access_profile_permission_insert_policy" ON public.access_profile_permission;
DROP POLICY IF EXISTS "access_profile_permission_delete_policy" ON public.access_profile_permission;

-- ACCESS_PROFILE
-- SELECT: vê perfis do sistema + perfis do próprio tenant
CREATE POLICY "access_profile_select_policy"
  ON public.access_profile
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NULL
    OR company_id = public.get_user_company_id()
  );

-- INSERT/UPDATE/DELETE: somente admin do tenant (perfis do sistema não podem ser alterados)
CREATE POLICY "access_profile_insert_policy"
  ON public.access_profile
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_user_admin()
    AND company_id = public.get_user_company_id()
    AND is_system = FALSE
  );

CREATE POLICY "access_profile_update_policy"
  ON public.access_profile
  FOR UPDATE
  TO authenticated
  USING (
    public.is_user_admin()
    AND company_id = public.get_user_company_id()
    AND is_system = FALSE
  )
  WITH CHECK (
    public.is_user_admin()
    AND company_id = public.get_user_company_id()
    AND is_system = FALSE
  );

CREATE POLICY "access_profile_delete_policy"
  ON public.access_profile
  FOR DELETE
  TO authenticated
  USING (
    public.is_user_admin()
    AND company_id = public.get_user_company_id()
    AND is_system = FALSE
  );

-- SYSTEM_MODULE / MODULE_PERMISSION
-- SELECT: qualquer autenticado pode ler (para montar UI)
CREATE POLICY "system_module_select_policy"
  ON public.system_module
  FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "module_permission_select_policy"
  ON public.module_permission
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- ACCESS_PROFILE_PERMISSION
-- SELECT: só permissões de perfis do sistema OU do tenant
CREATE POLICY "access_profile_permission_select_policy"
  ON public.access_profile_permission
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.access_profile ap
      WHERE ap.id = access_profile_permission.profile_id
        AND (ap.company_id IS NULL OR ap.company_id = public.get_user_company_id())
    )
  );

-- INSERT/DELETE: somente admin do tenant, e apenas para perfis do tenant (não system)
CREATE POLICY "access_profile_permission_insert_policy"
  ON public.access_profile_permission
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_user_admin()
    AND EXISTS (
      SELECT 1
      FROM public.access_profile ap
      WHERE ap.id = access_profile_permission.profile_id
        AND ap.company_id = public.get_user_company_id()
        AND ap.is_system = FALSE
    )
  );

CREATE POLICY "access_profile_permission_delete_policy"
  ON public.access_profile_permission
  FOR DELETE
  TO authenticated
  USING (
    public.is_user_admin()
    AND EXISTS (
      SELECT 1
      FROM public.access_profile ap
      WHERE ap.id = access_profile_permission.profile_id
        AND ap.company_id = public.get_user_company_id()
        AND ap.is_system = FALSE
    )
  );

-- =====================================================
-- 7) FUNÇÕES: has_permission / get_user_permissions
-- - baseadas em app_user.access_profile_id
-- - admin do perfil => true para tudo
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_permission(
  p_user_auth_id UUID,
  p_module_code TEXT,
  p_permission_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_company_id UUID;
  v_is_admin_profile BOOLEAN;
BEGIN
  -- Busca company e profile do usuário
  SELECT au.company_id, au.access_profile_id
    INTO v_company_id, v_profile_id
  FROM public.app_user au
  WHERE au.auth_user_id = p_user_auth_id;

  IF v_company_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Se não tem profile, sem permissão
  IF v_profile_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Se profile é admin, acesso total
  SELECT ap.is_admin
    INTO v_is_admin_profile
  FROM public.access_profile ap
  WHERE ap.id = v_profile_id
    AND (ap.company_id IS NULL OR ap.company_id = v_company_id);

  IF COALESCE(v_is_admin_profile, FALSE) = TRUE THEN
    RETURN TRUE;
  END IF;

  -- Checa permissão específica
  RETURN EXISTS (
    SELECT 1
    FROM public.access_profile_permission app
    JOIN public.module_permission mp ON mp.id = app.permission_id
    JOIN public.system_module sm ON sm.id = mp.module_id
    WHERE app.profile_id = v_profile_id
      AND sm.code = p_module_code
      AND mp.code = p_permission_code
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_auth_id UUID)
RETURNS TABLE (
  module_code TEXT,
  permission_code TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sm.code AS module_code, mp.code AS permission_code
  FROM public.app_user au
  JOIN public.access_profile ap ON ap.id = au.access_profile_id
  JOIN public.access_profile_permission app ON app.profile_id = ap.id
  JOIN public.module_permission mp ON mp.id = app.permission_id
  JOIN public.system_module sm ON sm.id = mp.module_id
  WHERE au.auth_user_id = p_user_auth_id;
$$;

REVOKE ALL ON FUNCTION public.has_permission(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_permissions(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_permission(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(UUID) TO authenticated;

-- =====================================================
-- 8) Perfis padrão por empresa (migrado de 20260130600000)
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_default_access_profiles_for_company(company_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.access_profile (company_id, code, name, description, is_system, is_admin, active)
  VALUES 
    (company_uuid, 'admin', 'Administrador', 'Acesso total à empresa', false, true, true),
    (company_uuid, 'manager', 'Gerente', 'Acesso de gerenciamento', false, false, true),
    (company_uuid, 'user', 'Usuário', 'Acesso básico do usuário', false, false, true),
    (company_uuid, 'viewer', 'Visualizador', 'Apenas visualização', false, false, true)
  ON CONFLICT (company_id, code) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_default_profiles_on_company_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_default_access_profiles_for_company(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_default_profiles ON public.company;
CREATE TRIGGER trg_create_default_profiles
AFTER INSERT ON public.company
FOR EACH ROW
EXECUTE FUNCTION public.create_default_profiles_on_company_insert();

DO $$
DECLARE
  company_record RECORD;
BEGIN
  FOR company_record IN 
    SELECT id FROM public.company 
    WHERE id NOT IN (
      SELECT DISTINCT company_id 
      FROM public.access_profile 
      WHERE company_id IS NOT NULL
    )
  LOOP
    PERFORM public.create_default_access_profiles_for_company(company_record.id);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.create_default_access_profiles_for_company(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.create_default_access_profiles_for_company(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.create_default_profiles_on_company_insert() FROM public;
GRANT EXECUTE ON FUNCTION public.create_default_profiles_on_company_insert() TO authenticated;

-- =====================================================
-- 9) Seed: Módulos do Sistema
-- =====================================================

-- Inserir módulos do sistema se não existirem
INSERT INTO public.system_module (code, name, description, icon, display_order, active)
VALUES 
  ('whatsapp', 'WhatsApp', 'Integração com WhatsApp para envio de mensagens, gerenciamento de contatos e automações.', 'MessageSquare', 1, true),
  ('dashboard', 'Dashboard', 'Sistema de dashboards personalizáveis para análise de dados e métricas em tempo real.', 'BarChart3', 2, true),
  ('settings', 'Configurações', 'Configurações gerais do sistema e usuários.', 'Settings', 3, true),
  ('admin', 'Administração', 'Painel de administração para gerenciar empresas e usuários do sistema.', 'ShieldCheck', 4, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  active = EXCLUDED.active;

-- Inserir permissões básicas para o módulo WhatsApp se não existirem
INSERT INTO public.module_permission (module_id, code, name, description)
SELECT 
  sm.id,
  'view',
  'Visualizar',
  'Permite visualizar o módulo WhatsApp'
FROM public.system_module sm
WHERE sm.code = 'whatsapp'
ON CONFLICT (module_id, code) DO NOTHING;

INSERT INTO public.module_permission (module_id, code, name, description)
SELECT 
  sm.id,
  'manage',
  'Gerenciar',
  'Permite gerenciar instâncias e configurações do WhatsApp'
FROM public.system_module sm
WHERE sm.code = 'whatsapp'
ON CONFLICT (module_id, code) DO NOTHING;

-- Inserir permissões básicas para o módulo Dashboard se não existirem
INSERT INTO public.module_permission (module_id, code, name, description)
SELECT 
  sm.id,
  'view',
  'Visualizar',
  'Permite visualizar dashboards'
FROM public.system_module sm
WHERE sm.code = 'dashboard'
ON CONFLICT (module_id, code) DO NOTHING;

-- Inserir permissões básicas para o módulo Settings se não existirem
INSERT INTO public.module_permission (module_id, code, name, description)
SELECT 
  sm.id,
  'view',
  'Visualizar',
  'Permite visualizar configurações'
FROM public.system_module sm
WHERE sm.code = 'settings'
ON CONFLICT (module_id, code) DO NOTHING;

INSERT INTO public.module_permission (module_id, code, name, description)
SELECT 
  sm.id,
  'manage',
  'Gerenciar',
  'Permite gerenciar configurações do sistema'
FROM public.system_module sm
WHERE sm.code = 'settings'
ON CONFLICT (module_id, code) DO NOTHING;

-- Inserir permissões básicas para o módulo Admin se não existirem
INSERT INTO public.module_permission (module_id, code, name, description)
SELECT 
  sm.id,
  'view',
  'Visualizar',
  'Permite visualizar painel de administração'
FROM public.system_module sm
WHERE sm.code = 'admin'
ON CONFLICT (module_id, code) DO NOTHING;

INSERT INTO public.module_permission (module_id, code, name, description)
SELECT 
  sm.id,
  'manage',
  'Gerenciar',
  'Permite gerenciar empresas e usuários do sistema'
FROM public.system_module sm
WHERE sm.code = 'admin'
ON CONFLICT (module_id, code) DO NOTHING;
