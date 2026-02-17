-- =====================================================
-- MIGRATION: Remover coluna role de app_user,
-- remover is_system de access_profile,
-- tornar company_id NOT NULL em access_profile,
-- converter VARCHAR -> TEXT,
-- tornar access_profile_id NOT NULL em app_user,
-- adicionar coluna theme em app_user
-- =====================================================

BEGIN;

-- =====================================================
-- PARTE 0: REMOVER CONSTRAINTS LEGADAS DE is_system
-- (precisa ocorrer antes de inserir perfis por empresa)
-- =====================================================

ALTER TABLE access_profile DROP CONSTRAINT IF EXISTS chk_access_profile_scope;
ALTER TABLE access_profile DROP CONSTRAINT IF EXISTS chk_access_profile_admin_scope;

-- =====================================================
-- PARTE 1: REMOVER PERFIS DE SISTEMA E CRIAR PERFIS
-- POR EMPRESA (sem ambiente de producao, limpa tudo)
-- =====================================================

-- 1a) Remover referencias de app_user a perfis de sistema
UPDATE app_user au
SET access_profile_id = NULL
WHERE EXISTS (
    SELECT 1 FROM access_profile ap
    WHERE ap.id = au.access_profile_id
      AND ap.is_system = TRUE
);

-- 1b) Deletar permissoes dos perfis de sistema
DELETE FROM access_profile_permission
WHERE profile_id IN (
    SELECT id FROM access_profile WHERE is_system = TRUE
);

-- 1c) Deletar perfis de sistema
DELETE FROM access_profile WHERE is_system = TRUE;

-- 1d) Criar perfis padrao para cada empresa existente
INSERT INTO access_profile (company_id, code, name, description, is_system, is_admin, active)
SELECT
    c.id,
    p.code,
    p.name,
    p.description,
    FALSE,
    p.is_admin,
    TRUE
FROM company c
CROSS JOIN (VALUES
    ('admin',     'Diretor',        'Acesso total ao sistema',           TRUE),
    ('manager',   'Gerente',        'Gerencia operacoes e relatorios',   FALSE),
    ('clinician', 'Clinico',        'Acesso a prescricoes e pacientes',  FALSE),
    ('stock',     'Estoque',        'Gerencia estoque e produtos',       FALSE),
    ('finance',   'Financeiro',     'Acesso a financeiro e relatorios',  FALSE),
    ('viewer',    'Visualizador',   'Apenas visualizacao',               FALSE),
    ('tecnico',   'Técnico de Enfermagem',    'Acesso para tecnicos de enfermagem evoluirem nas casas',      FALSE)
) AS p(code, name, description, is_admin)
ON CONFLICT (company_id, code) DO NOTHING;

-- 1e) Copiar permissoes dos modulos para os novos perfis
-- Admin: is_admin=true, nao precisa permissoes individuais

-- Gerente: quase tudo
INSERT INTO access_profile_permission (profile_id, permission_id)
SELECT ap.id, mp.id
FROM access_profile ap
CROSS JOIN module_permission mp
JOIN system_module sm ON mp.module_id = sm.id
WHERE ap.code = 'manager' AND ap.company_id IS NOT NULL
  AND sm.code NOT IN ('admin')
ON CONFLICT (profile_id, permission_id) DO NOTHING;

-- Clinico: prescricoes e pacientes
INSERT INTO access_profile_permission (profile_id, permission_id)
SELECT ap.id, mp.id
FROM access_profile ap
CROSS JOIN module_permission mp
JOIN system_module sm ON mp.module_id = sm.id
WHERE ap.code = 'clinician' AND ap.company_id IS NOT NULL
  AND sm.code IN ('prescriptions', 'patients', 'professionals')
ON CONFLICT (profile_id, permission_id) DO NOTHING;

-- Estoque: produtos
INSERT INTO access_profile_permission (profile_id, permission_id)
SELECT ap.id, mp.id
FROM access_profile ap
CROSS JOIN module_permission mp
JOIN system_module sm ON mp.module_id = sm.id
WHERE ap.code = 'stock' AND ap.company_id IS NOT NULL
  AND sm.code IN ('products')
ON CONFLICT (profile_id, permission_id) DO NOTHING;

-- Financeiro: relatorios
INSERT INTO access_profile_permission (profile_id, permission_id)
SELECT ap.id, mp.id
FROM access_profile ap
CROSS JOIN module_permission mp
JOIN system_module sm ON mp.module_id = sm.id
WHERE ap.code = 'finance' AND ap.company_id IS NOT NULL
  AND sm.code IN ('reports')
ON CONFLICT (profile_id, permission_id) DO NOTHING;

-- Viewer: apenas visualizacao (read)
INSERT INTO access_profile_permission (profile_id, permission_id)
SELECT ap.id, mp.id
FROM access_profile ap
CROSS JOIN module_permission mp
JOIN system_module sm ON mp.module_id = sm.id
WHERE ap.code = 'viewer' AND ap.company_id IS NOT NULL
  AND mp.code = 'view'
  AND sm.code NOT IN ('admin')
ON CONFLICT (profile_id, permission_id) DO NOTHING;

-- =====================================================
-- PARTE 3: REMOVER COLUNA is_system
-- (CASCADE remove automaticamente policies dependentes)
-- =====================================================

ALTER TABLE access_profile DROP COLUMN IF EXISTS is_system CASCADE;

-- =====================================================
-- PARTE 4: TORNAR company_id NOT NULL
-- =====================================================

ALTER TABLE access_profile ALTER COLUMN company_id SET NOT NULL;

-- =====================================================
-- PARTE 5: CONVERTER VARCHAR -> TEXT em app_user
-- =====================================================

ALTER TABLE app_user ALTER COLUMN name TYPE TEXT;
ALTER TABLE app_user ALTER COLUMN email TYPE TEXT;

-- =====================================================
-- PARTE 6: CONVERTER VARCHAR -> TEXT em access_profile
-- =====================================================

ALTER TABLE access_profile ALTER COLUMN code TYPE TEXT;
ALTER TABLE access_profile ALTER COLUMN name TYPE TEXT;

-- =====================================================
-- PARTE 7: REMOVER COLUNA role DE app_user
-- =====================================================

-- Dropar CHECK constraint do role
ALTER TABLE app_user DROP CONSTRAINT IF EXISTS app_user_role_check;
-- Nome original do CHECK na initial_schema (inline CHECK gera nome automatico)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'app_user_check'
      AND t.relname = 'app_user'
      AND n.nspname = 'public'
  ) THEN
    ALTER TABLE app_user DROP CONSTRAINT app_user_check;
  END IF;
END $$;

-- Dropar a coluna role (CASCADE remove policies dependentes em outras tabelas)
ALTER TABLE app_user DROP COLUMN IF EXISTS role CASCADE;

-- =====================================================
-- PARTE 8: TORNAR access_profile_id NOT NULL + ON DELETE RESTRICT
-- =====================================================

-- Dropar a FK antiga (ON DELETE SET NULL)
ALTER TABLE app_user DROP CONSTRAINT IF EXISTS app_user_access_profile_id_fkey;

-- Tornar NOT NULL
ALTER TABLE app_user ALTER COLUMN access_profile_id SET NOT NULL;

-- Recriar FK com ON DELETE RESTRICT
ALTER TABLE app_user
    ADD CONSTRAINT app_user_access_profile_id_fkey
    FOREIGN KEY (access_profile_id) REFERENCES access_profile(id) ON DELETE RESTRICT;

-- =====================================================
-- PARTE 9: REESCREVER is_user_admin() SEM ROLE
-- =====================================================

CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM app_user au
        JOIN access_profile ap ON au.access_profile_id = ap.id
        WHERE au.auth_user_id = (SELECT auth.uid())
          AND ap.is_admin = TRUE
    );
END;
$$;

-- =====================================================
-- PARTE 10: ATUALIZAR TRIGGER trg_app_user_profile_company_guard
-- Remover bypass para perfis de sistema (company_id NULL)
-- Agora todos os perfis tem company_id obrigatorio
-- =====================================================

CREATE OR REPLACE FUNCTION trg_app_user_profile_company_guard()
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

  SELECT company_id INTO v_profile_company
  FROM access_profile
  WHERE id = NEW.access_profile_id;

  IF v_profile_company IS NULL OR v_profile_company <> NEW.company_id THEN
    RAISE EXCEPTION 'access_profile_id pertence a outra company';
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================
-- PARTE 11: ATUALIZAR RLS DE user_action_logs
-- Substituir au.role = 'admin' por check via access_profile
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_action_logs'
      AND policyname = 'Only admins can delete logs'
  ) THEN
    DROP POLICY "Only admins can delete logs" ON public.user_action_logs;
  END IF;
END $$;
CREATE POLICY "Only admins can delete logs"
  ON public.user_action_logs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM app_user au
      JOIN access_profile ap ON au.access_profile_id = ap.id
      WHERE au.auth_user_id = (SELECT auth.uid())
        AND au.company_id = user_action_logs.company_id
        AND ap.is_admin = TRUE
    )
  );

-- =====================================================
-- PARTE 12: ATUALIZAR RLS DE administration_routes
-- Substituir role IN ('admin','manager') por is_user_admin()
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'administration_routes'
      AND policyname = 'Admin/managers can insert administration routes'
  ) THEN
    DROP POLICY "Admin/managers can insert administration routes" ON public.administration_routes;
  END IF;
END $$;
CREATE POLICY "Admin/managers can insert administration routes"
  ON public.administration_routes FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT au.company_id FROM app_user au
      JOIN access_profile ap ON au.access_profile_id = ap.id
      WHERE au.auth_user_id = (SELECT auth.uid())
        AND ap.is_admin = TRUE
    )
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'administration_routes'
      AND policyname = 'Admin/managers can update administration routes'
  ) THEN
    DROP POLICY "Admin/managers can update administration routes" ON public.administration_routes;
  END IF;
END $$;
CREATE POLICY "Admin/managers can update administration routes"
  ON public.administration_routes FOR UPDATE
  USING (
    company_id IN (
      SELECT au.company_id FROM app_user au
      JOIN access_profile ap ON au.access_profile_id = ap.id
      WHERE au.auth_user_id = (SELECT auth.uid())
        AND ap.is_admin = TRUE
    )
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'administration_routes'
      AND policyname = 'Admin/managers can delete administration routes'
  ) THEN
    DROP POLICY "Admin/managers can delete administration routes" ON public.administration_routes;
  END IF;
END $$;
CREATE POLICY "Admin/managers can delete administration routes"
  ON public.administration_routes FOR DELETE
  USING (
    company_id IN (
      SELECT au.company_id FROM app_user au
      JOIN access_profile ap ON au.access_profile_id = ap.id
      WHERE au.auth_user_id = (SELECT auth.uid())
        AND ap.is_admin = TRUE
    )
  );

-- =====================================================
-- PARTE 13: ATUALIZAR RLS DE access_profile
-- Substituir is_system = FALSE (ja nao existe a coluna)
-- Agora todos os perfis pertencem a uma empresa
-- =====================================================

DROP POLICY IF EXISTS "access_profile_select_policy" ON public.access_profile;
CREATE POLICY "access_profile_select_policy" ON public.access_profile
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM app_user au
            WHERE au.auth_user_id = (SELECT auth.uid())
            AND au.company_id = access_profile.company_id
        )
    );

DROP POLICY IF EXISTS "access_profile_insert_policy" ON public.access_profile;
CREATE POLICY "access_profile_insert_policy" ON public.access_profile
    FOR INSERT WITH CHECK (
        (SELECT auth.role()) = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM app_user au
            WHERE au.auth_user_id = (SELECT auth.uid())
            AND au.company_id = access_profile.company_id
        )
    );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'access_profile'
      AND policyname = 'access_profile_update_policy'
  ) THEN
    DROP POLICY "access_profile_update_policy" ON public.access_profile;
  END IF;
END $$;
CREATE POLICY "access_profile_update_policy" ON public.access_profile
    FOR UPDATE USING (
        (SELECT auth.role()) = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM app_user au
            WHERE au.auth_user_id = (SELECT auth.uid())
            AND au.company_id = access_profile.company_id
        )
    );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'access_profile'
      AND policyname = 'access_profile_delete_policy'
  ) THEN
    DROP POLICY "access_profile_delete_policy" ON public.access_profile;
  END IF;
END $$;
CREATE POLICY "access_profile_delete_policy" ON public.access_profile
    FOR DELETE USING (
        (SELECT auth.role()) = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM app_user au
            WHERE au.auth_user_id = (SELECT auth.uid())
            AND au.company_id = access_profile.company_id
        )
    );

-- =====================================================
-- PARTE 14: ATUALIZAR RLS DE access_profile_permission
-- Remover check de is_system
-- =====================================================

DROP POLICY IF EXISTS "access_profile_permission_select_policy" ON public.access_profile_permission;
CREATE POLICY "access_profile_permission_select_policy" ON public.access_profile_permission
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM access_profile ap
            WHERE ap.id = access_profile_permission.profile_id
            AND EXISTS (
                SELECT 1 FROM app_user au
                WHERE au.auth_user_id = (SELECT auth.uid())
                AND au.company_id = ap.company_id
            )
        )
    );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'access_profile_permission'
      AND policyname = 'access_profile_permission_insert_policy'
  ) THEN
    DROP POLICY "access_profile_permission_insert_policy" ON public.access_profile_permission;
  END IF;
END $$;
CREATE POLICY "access_profile_permission_insert_policy" ON public.access_profile_permission
    FOR INSERT WITH CHECK (
        (SELECT auth.role()) = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM access_profile ap
            WHERE ap.id = access_profile_permission.profile_id
            AND EXISTS (
                SELECT 1 FROM app_user au
                WHERE au.auth_user_id = (SELECT auth.uid())
                AND au.company_id = ap.company_id
            )
        )
    );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'access_profile_permission'
      AND policyname = 'access_profile_permission_delete_policy'
  ) THEN
    DROP POLICY "access_profile_permission_delete_policy" ON public.access_profile_permission;
  END IF;
END $$;
CREATE POLICY "access_profile_permission_delete_policy" ON public.access_profile_permission
    FOR DELETE USING (
        (SELECT auth.role()) = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM access_profile ap
            WHERE ap.id = access_profile_permission.profile_id
            AND EXISTS (
                SELECT 1 FROM app_user au
                WHERE au.auth_user_id = (SELECT auth.uid())
                AND au.company_id = ap.company_id
            )
        )
    );

-- =====================================================
-- PARTE 15: REMOVER PARTIAL INDEX DE PERFIS DE SISTEMA
-- O index era para garantir unicidade de code quando
-- company_id IS NULL, o que nao faz mais sentido
-- =====================================================

DROP INDEX IF EXISTS ux_access_profile_system_code;

-- =====================================================
-- PARTE 16: ADICIONAR COLUNA theme EM app_user
-- =====================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_app_theme') THEN
    CREATE TYPE enum_app_theme AS ENUM ('light', 'dark', 'system');
  END IF;
END $$;

ALTER TABLE app_user ADD COLUMN IF NOT EXISTS theme enum_app_theme NOT NULL DEFAULT 'system';

COMMIT;
