-- =====================================================
-- PERFIS DE ACESSO E PERMISSÕES
-- Sistema flexível de controle de acesso por perfil
-- =====================================================

-- =====================================================
-- 1) TABELA DE PERFIS DE ACESSO
-- =====================================================

CREATE TABLE access_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES company(id) ON DELETE CASCADE, -- NULL = perfil do sistema (default)
    code text NOT NULL,
    name text(100) NOT NULL,
    description text,
    is_system BOOLEAN DEFAULT FALSE, -- Perfis padrão do sistema (não podem ser excluídos)
    is_admin BOOLEAN DEFAULT FALSE, -- Se true, tem acesso total
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, code),
    -- Consistência: is_system só pode ser TRUE quando company_id IS NULL
    CONSTRAINT chk_access_profile_scope CHECK (
        (is_system = TRUE AND company_id IS NULL)
        OR
        (is_system = FALSE AND company_id IS NOT NULL)
    ),
    -- Consistência: is_admin só pode ser TRUE em perfis do sistema
    CONSTRAINT chk_access_profile_admin_scope CHECK (
        (is_admin = FALSE)
        OR
        (is_admin = TRUE AND is_system = TRUE)
    )
);

-- Índice composto para buscas por empresa e código
CREATE INDEX idx_access_profile_company_code ON access_profile(company_id, code);

-- Índice único para garantir que só exista um perfil de cada código no sistema
-- (NULL não colide com NULL em unique normal, então precisamos de partial index)
CREATE UNIQUE INDEX ux_access_profile_system_code ON access_profile(code) WHERE company_id IS NULL;

-- =====================================================
-- 2) TABELA DE MÓDULOS DO SISTEMA
-- =====================================================

CREATE TABLE system_module (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    icon text,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- =====================================================
-- 3) TABELA DE PERMISSÕES POR MÓDULO
-- =====================================================

CREATE TABLE module_permission (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES system_module(id) ON DELETE CASCADE,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    UNIQUE(module_id, code)
);

CREATE INDEX idx_module_permission_module ON module_permission(module_id);

-- =====================================================
-- 4) TABELA DE PERMISSÕES DO PERFIL
-- =====================================================

CREATE TABLE access_profile_permission (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES access_profile(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES module_permission(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, permission_id)
);

CREATE INDEX idx_access_profile_permission_profile ON access_profile_permission(profile_id);
CREATE INDEX idx_access_profile_permission_permission ON access_profile_permission(permission_id);

-- =====================================================
-- 5) ALTERAR APP_USER PARA USAR PROFILE
-- =====================================================

-- Adicionar coluna para perfil de acesso
ALTER TABLE app_user ADD COLUMN access_profile_id UUID REFERENCES access_profile(id) ON DELETE SET NULL;

CREATE INDEX idx_app_user_access_profile ON app_user(access_profile_id);

-- =====================================================
-- 5.1) TRIGGER PARA UPDATED_AT
-- =====================================================

-- Função genérica para atualizar updated_at (se não existir)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_access_profile_updated
BEFORE UPDATE ON access_profile
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- 5.2) TRIGGER PARA VALIDAR COMPANY DO PERFIL
-- =====================================================

-- Garante que usuário só pode ter perfil da mesma empresa ou perfil do sistema
CREATE OR REPLACE FUNCTION trg_app_user_profile_company_guard()
RETURNS trigger
LANGUAGE plpgsql
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

  -- Perfis do sistema (company_id NULL) são válidos para qualquer empresa
  IF v_profile_company IS NOT NULL AND v_profile_company <> NEW.company_id THEN
    RAISE EXCEPTION 'access_profile_id pertence a outra company';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER app_user_profile_company_guard
BEFORE INSERT OR UPDATE OF access_profile_id, company_id ON app_user
FOR EACH ROW
EXECUTE FUNCTION trg_app_user_profile_company_guard();

-- =====================================================
-- 6) INSERIR MÓDULOS DO SISTEMA (idempotente)
-- =====================================================

INSERT INTO system_module (code, name, description, icon, display_order) VALUES
    ('dashboard', 'Dashboard', 'Painel principal com visão geral', 'HomeIcon', 1),
    ('patients', 'Pacientes', 'Gerenciamento de pacientes', 'UserGroupIcon', 2),
    ('clients', 'Clientes', 'Gerenciamento de clientes/operadoras', 'BuildingOfficeIcon', 3),
    ('professionals', 'Profissionais', 'Gerenciamento de profissionais de saúde', 'UserIcon', 4),
    ('products', 'Produtos', 'Gerenciamento de medicamentos, materiais e dietas', 'CubeIcon', 5),
    ('stock', 'Estoque', 'Controle de estoque e movimentações', 'ArchiveBoxIcon', 6),
    ('prescriptions', 'Prescrições', 'Gerenciamento de prescrições', 'DocumentTextIcon', 7),
    ('equipment', 'Equipamentos', 'Controle patrimonial de equipamentos', 'WrenchIcon', 8),
    ('nfe', 'Importação NFe', 'Importação de notas fiscais eletrônicas', 'DocumentArrowUpIcon', 9),
    ('reports', 'Relatórios', 'Relatórios e análises', 'ChartBarIcon', 10),
    ('settings', 'Configurações', 'Configurações do sistema', 'CogIcon', 11),
    ('admin', 'Administração', 'Gestão de empresas, usuários e perfis', 'ShieldCheckIcon', 12)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 7) INSERIR PERMISSÕES POR MÓDULO (idempotente)
-- =====================================================

-- Dashboard
INSERT INTO module_permission (module_id, code, name, description)
SELECT id, 'view', 'Visualizar', 'Visualizar dashboard'
FROM system_module WHERE code = 'dashboard'
ON CONFLICT (module_id, code) DO NOTHING;

-- Pacientes
INSERT INTO module_permission (module_id, code, name, description)
SELECT sm.id, perms.code, perms.name, perms.description 
FROM system_module sm, 
    (VALUES 
        ('view', 'Visualizar', 'Visualizar pacientes'),
        ('create', 'Criar', 'Criar novos pacientes'),
        ('edit', 'Editar', 'Editar pacientes existentes'),
        ('delete', 'Excluir', 'Excluir pacientes')
    ) AS perms(code, name, description)
WHERE sm.code = 'patients'
ON CONFLICT (module_id, code) DO NOTHING;

-- Clientes
INSERT INTO module_permission (module_id, code, name, description)
SELECT sm.id, perms.code, perms.name, perms.description 
FROM system_module sm, 
    (VALUES 
        ('view', 'Visualizar', 'Visualizar clientes'),
        ('create', 'Criar', 'Criar novos clientes'),
        ('edit', 'Editar', 'Editar clientes existentes'),
        ('delete', 'Excluir', 'Excluir clientes')
    ) AS perms(code, name, description)
WHERE sm.code = 'clients'
ON CONFLICT (module_id, code) DO NOTHING;

-- Profissionais
INSERT INTO module_permission (module_id, code, name, description)
SELECT sm.id, perms.code, perms.name, perms.description 
FROM system_module sm, 
    (VALUES 
        ('view', 'Visualizar', 'Visualizar profissionais'),
        ('create', 'Criar', 'Criar novos profissionais'),
        ('edit', 'Editar', 'Editar profissionais existentes'),
        ('delete', 'Excluir', 'Excluir profissionais')
    ) AS perms(code, name, description)
WHERE sm.code = 'professionals'
ON CONFLICT (module_id, code) DO NOTHING;

-- Produtos
INSERT INTO module_permission (module_id, code, name, description)
SELECT sm.id, perms.code, perms.name, perms.description 
FROM system_module sm, 
    (VALUES 
        ('view', 'Visualizar', 'Visualizar produtos'),
        ('create', 'Criar', 'Criar novos produtos'),
        ('edit', 'Editar', 'Editar produtos existentes'),
        ('delete', 'Excluir', 'Excluir produtos'),
        ('import', 'Importar', 'Importar produtos de tabelas externas')
    ) AS perms(code, name, description)
WHERE sm.code = 'products'
ON CONFLICT (module_id, code) DO NOTHING;

-- Estoque
INSERT INTO module_permission (module_id, code, name, description)
SELECT sm.id, perms.code, perms.name, perms.description 
FROM system_module sm, 
    (VALUES 
        ('view', 'Visualizar', 'Visualizar estoque'),
        ('move', 'Movimentar', 'Realizar movimentações de estoque'),
        ('adjust', 'Ajustar', 'Realizar ajustes de inventário'),
        ('transfer', 'Transferir', 'Transferir entre locais')
    ) AS perms(code, name, description)
WHERE sm.code = 'stock'
ON CONFLICT (module_id, code) DO NOTHING;

-- Prescrições
INSERT INTO module_permission (module_id, code, name, description)
SELECT sm.id, perms.code, perms.name, perms.description 
FROM system_module sm, 
    (VALUES 
        ('view', 'Visualizar', 'Visualizar prescrições'),
        ('create', 'Criar', 'Criar novas prescrições'),
        ('edit', 'Editar', 'Editar prescrições existentes'),
        ('approve', 'Aprovar', 'Aprovar prescrições'),
        ('dispense', 'Dispensar', 'Dispensar itens da prescrição')
    ) AS perms(code, name, description)
WHERE sm.code = 'prescriptions'
ON CONFLICT (module_id, code) DO NOTHING;

-- Equipamentos
INSERT INTO module_permission (module_id, code, name, description)
SELECT sm.id, perms.code, perms.name, perms.description 
FROM system_module sm, 
    (VALUES 
        ('view', 'Visualizar', 'Visualizar equipamentos'),
        ('create', 'Criar', 'Cadastrar novos equipamentos'),
        ('edit', 'Editar', 'Editar equipamentos existentes'),
        ('assign', 'Alocar', 'Alocar equipamentos a pacientes')
    ) AS perms(code, name, description)
WHERE sm.code = 'equipment'
ON CONFLICT (module_id, code) DO NOTHING;

-- NFe
INSERT INTO module_permission (module_id, code, name, description)
SELECT sm.id, perms.code, perms.name, perms.description 
FROM system_module sm, 
    (VALUES 
        ('view', 'Visualizar', 'Visualizar notas importadas'),
        ('import', 'Importar', 'Importar notas fiscais'),
        ('process', 'Processar', 'Processar e vincular itens')
    ) AS perms(code, name, description)
WHERE sm.code = 'nfe'
ON CONFLICT (module_id, code) DO NOTHING;

-- Relatórios
INSERT INTO module_permission (module_id, code, name, description)
SELECT sm.id, perms.code, perms.name, perms.description 
FROM system_module sm, 
    (VALUES 
        ('view', 'Visualizar', 'Visualizar relatórios'),
        ('export', 'Exportar', 'Exportar relatórios')
    ) AS perms(code, name, description)
WHERE sm.code = 'reports'
ON CONFLICT (module_id, code) DO NOTHING;

-- Configurações
INSERT INTO module_permission (module_id, code, name, description)
SELECT sm.id, perms.code, perms.name, perms.description 
FROM system_module sm, 
    (VALUES 
        ('view', 'Visualizar', 'Visualizar configurações'),
        ('edit', 'Editar', 'Alterar configurações')
    ) AS perms(code, name, description)
WHERE sm.code = 'settings'
ON CONFLICT (module_id, code) DO NOTHING;

-- Administração
INSERT INTO module_permission (module_id, code, name, description)
SELECT sm.id, perms.code, perms.name, perms.description 
FROM system_module sm, 
    (VALUES 
        ('view', 'Visualizar', 'Visualizar administração'),
        ('manage_companies', 'Empresas', 'Gerenciar empresas'),
        ('manage_users', 'Usuários', 'Gerenciar usuários'),
        ('manage_profiles', 'Perfis', 'Gerenciar perfis de acesso')
    ) AS perms(code, name, description)
WHERE sm.code = 'admin'
ON CONFLICT (module_id, code) DO NOTHING;

-- =====================================================
-- 8) INSERIR PERFIS PADRÃO DO SISTEMA (idempotente)
-- =====================================================

-- Usar partial unique index para garantir código único em perfis do sistema
INSERT INTO access_profile (company_id, code, name, description, is_system, is_admin) VALUES
    (NULL, 'admin', 'Administrador', 'Acesso total ao sistema', TRUE, TRUE),
    (NULL, 'manager', 'Gerente', 'Gerencia operações e relatórios', TRUE, FALSE),
    (NULL, 'clinician', 'Clínico', 'Acesso a prescrições e pacientes', TRUE, FALSE),
    (NULL, 'stock', 'Estoque', 'Gerencia estoque e produtos', TRUE, FALSE),
    (NULL, 'finance', 'Financeiro', 'Acesso a financeiro e relatórios', TRUE, FALSE),
    (NULL, 'viewer', 'Visualizador', 'Apenas visualização', TRUE, FALSE)
ON CONFLICT (company_id, code) DO NOTHING;

-- =====================================================
-- 9) VINCULAR PERMISSÕES AOS PERFIS PADRÃO (idempotente)
-- =====================================================

-- Admin: todas as permissões (is_admin = true, não precisa permissões individuais)

-- Gerente: quase tudo, exceto admin
INSERT INTO access_profile_permission (profile_id, permission_id)
SELECT ap.id, mp.id
FROM access_profile ap
CROSS JOIN module_permission mp
JOIN system_module sm ON mp.module_id = sm.id
WHERE ap.code = 'manager' AND ap.is_system = TRUE
AND sm.code NOT IN ('admin')
ON CONFLICT (profile_id, permission_id) DO NOTHING;

-- Clínico: pacientes, prescrições, produtos (view), dashboard
INSERT INTO access_profile_permission (profile_id, permission_id)
SELECT ap.id, mp.id
FROM access_profile ap
CROSS JOIN module_permission mp
JOIN system_module sm ON mp.module_id = sm.id
WHERE ap.code = 'clinician' AND ap.is_system = TRUE
AND (
    sm.code = 'dashboard'
    OR sm.code = 'patients'
    OR sm.code = 'prescriptions'
    OR (sm.code = 'products' AND mp.code = 'view')
    OR (sm.code = 'professionals' AND mp.code = 'view')
)
ON CONFLICT (profile_id, permission_id) DO NOTHING;

-- Estoque: estoque, produtos, nfe, dashboard
INSERT INTO access_profile_permission (profile_id, permission_id)
SELECT ap.id, mp.id
FROM access_profile ap
CROSS JOIN module_permission mp
JOIN system_module sm ON mp.module_id = sm.id
WHERE ap.code = 'stock' AND ap.is_system = TRUE
AND (
    sm.code = 'dashboard'
    OR sm.code = 'stock'
    OR sm.code = 'products'
    OR sm.code = 'nfe'
    OR sm.code = 'equipment'
)
ON CONFLICT (profile_id, permission_id) DO NOTHING;

-- Financeiro: relatórios, dashboard, clientes (view)
INSERT INTO access_profile_permission (profile_id, permission_id)
SELECT ap.id, mp.id
FROM access_profile ap
CROSS JOIN module_permission mp
JOIN system_module sm ON mp.module_id = sm.id
WHERE ap.code = 'finance' AND ap.is_system = TRUE
AND (
    sm.code = 'dashboard'
    OR sm.code = 'reports'
    OR (sm.code = 'clients' AND mp.code = 'view')
    OR (sm.code = 'patients' AND mp.code = 'view')
)
ON CONFLICT (profile_id, permission_id) DO NOTHING;

-- Visualizador: apenas view em todos os módulos
INSERT INTO access_profile_permission (profile_id, permission_id)
SELECT ap.id, mp.id
FROM access_profile ap
CROSS JOIN module_permission mp
JOIN system_module sm ON mp.module_id = sm.id
WHERE ap.code = 'viewer' AND ap.is_system = TRUE
AND mp.code = 'view'
AND sm.code NOT IN ('admin')
ON CONFLICT (profile_id, permission_id) DO NOTHING;

-- =====================================================
-- 10) MIGRAR USUÁRIOS EXISTENTES PARA PERFIS
-- =====================================================

UPDATE app_user 
SET access_profile_id = (
    SELECT ap.id FROM access_profile ap 
    WHERE ap.code = app_user.role 
    AND ap.is_system = TRUE
    LIMIT 1
)
WHERE access_profile_id IS NULL;

-- =====================================================
-- 11) FUNÇÃO PARA VERIFICAR PERMISSÃO (SEGURA)
-- =====================================================

CREATE OR REPLACE FUNCTION has_permission(
    p_auth_user_id UUID,
    p_module_code text,
    p_permission_code text
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_has_permission BOOLEAN := FALSE;
    v_is_admin BOOLEAN := FALSE;
BEGIN
    -- Segurança: só pode consultar as próprias permissões
    IF p_auth_user_id <> auth.uid() THEN
        RETURN FALSE;
    END IF;

    -- Verificar se o usuário é admin
    SELECT COALESCE(ap.is_admin, FALSE) INTO v_is_admin
    FROM app_user au
    JOIN access_profile ap ON au.access_profile_id = ap.id
    WHERE au.auth_user_id = auth.uid()
    AND au.is_active = TRUE;

    IF v_is_admin THEN
        RETURN TRUE;
    END IF;

    -- Verificar permissão específica
    SELECT EXISTS (
        SELECT 1
        FROM app_user au
        JOIN access_profile ap ON au.access_profile_id = ap.id
        JOIN access_profile_permission app ON app.profile_id = ap.id
        JOIN module_permission mp ON app.permission_id = mp.id
        JOIN system_module sm ON mp.module_id = sm.id
        WHERE au.auth_user_id = auth.uid()
        AND au.is_active = TRUE
        AND ap.is_active = TRUE
        AND sm.code = p_module_code
        AND mp.code = p_permission_code
    ) INTO v_has_permission;

    RETURN v_has_permission;
END;
$$;

-- =====================================================
-- 12) FUNÇÃO PARA LISTAR PERMISSÕES DO USUÁRIO (SEGURA)
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_permissions(p_auth_user_id UUID)
RETURNS TABLE (
    module_code text,
    module_name text,
    permission_code text,
    permission_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin BOOLEAN := FALSE;
BEGIN
    -- Segurança: só pode consultar as próprias permissões
    IF p_auth_user_id <> auth.uid() THEN
        RETURN;
    END IF;

    -- Verificar se o usuário é admin
    SELECT COALESCE(ap.is_admin, FALSE) INTO v_is_admin
    FROM app_user au
    JOIN access_profile ap ON au.access_profile_id = ap.id
    WHERE au.auth_user_id = auth.uid()
    AND au.is_active = TRUE;

    IF v_is_admin THEN
        -- Admin tem todas as permissões
        RETURN QUERY
        SELECT 
            sm.code::text as module_code,
            sm.name::text as module_name,
            mp.code::text as permission_code,
            mp.name::text as permission_name
        FROM module_permission mp
        JOIN system_module sm ON mp.module_id = sm.id
        WHERE sm.is_active = TRUE
        ORDER BY sm.display_order, mp.code;
    ELSE
        -- Retorna permissões do perfil
        RETURN QUERY
        SELECT 
            sm.code::text as module_code,
            sm.name::text as module_name,
            mp.code::text as permission_code,
            mp.name::text as permission_name
        FROM app_user au
        JOIN access_profile ap ON au.access_profile_id = ap.id
        JOIN access_profile_permission app ON app.profile_id = ap.id
        JOIN module_permission mp ON app.permission_id = mp.id
        JOIN system_module sm ON mp.module_id = sm.id
        WHERE au.auth_user_id = auth.uid()
        AND au.is_active = TRUE
        AND ap.is_active = TRUE
        AND sm.is_active = TRUE
        ORDER BY sm.display_order, mp.code;
    END IF;
END;
$$;

-- =====================================================
-- 13) POLÍTICAS RLS
-- =====================================================

-- Enable RLS
ALTER TABLE access_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_profile_permission ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_module ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_permission ENABLE ROW LEVEL SECURITY;

-- Políticas para system_module (todos podem ver)
CREATE POLICY "system_module_select_policy" ON system_module
    FOR SELECT USING (TRUE);

-- Políticas para module_permission (todos podem ver)
CREATE POLICY "module_permission_select_policy" ON module_permission
    FOR SELECT USING (TRUE);

-- Políticas para access_profile (usando EXISTS para melhor performance)
CREATE POLICY "access_profile_select_policy" ON access_profile
    FOR SELECT USING (
        -- Perfis do sistema (company_id IS NULL)
        company_id IS NULL
        OR
        -- Perfis da empresa do usuário
        EXISTS (
            SELECT 1 FROM app_user au
            WHERE au.auth_user_id = auth.uid()
            AND au.company_id = access_profile.company_id
        )
    );

CREATE POLICY "access_profile_insert_policy" ON access_profile
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND company_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM app_user au
            WHERE au.auth_user_id = auth.uid()
            AND au.company_id = access_profile.company_id
        )
    );

CREATE POLICY "access_profile_update_policy" ON access_profile
    FOR UPDATE USING (
        auth.role() = 'authenticated'
        AND is_system = FALSE
        AND EXISTS (
            SELECT 1 FROM app_user au
            WHERE au.auth_user_id = auth.uid()
            AND au.company_id = access_profile.company_id
        )
    );

CREATE POLICY "access_profile_delete_policy" ON access_profile
    FOR DELETE USING (
        auth.role() = 'authenticated'
        AND is_system = FALSE
        AND EXISTS (
            SELECT 1 FROM app_user au
            WHERE au.auth_user_id = auth.uid()
            AND au.company_id = access_profile.company_id
        )
    );

-- Políticas para access_profile_permission (usando EXISTS para melhor performance)
CREATE POLICY "access_profile_permission_select_policy" ON access_profile_permission
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM access_profile ap
            WHERE ap.id = access_profile_permission.profile_id
            AND (
                ap.company_id IS NULL
                OR EXISTS (
                    SELECT 1 FROM app_user au
                    WHERE au.auth_user_id = auth.uid()
                    AND au.company_id = ap.company_id
                )
            )
        )
    );

CREATE POLICY "access_profile_permission_insert_policy" ON access_profile_permission
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM access_profile ap
            WHERE ap.id = access_profile_permission.profile_id
            AND ap.company_id IS NOT NULL
            AND ap.is_system = FALSE
            AND EXISTS (
                SELECT 1 FROM app_user au
                WHERE au.auth_user_id = auth.uid()
                AND au.company_id = ap.company_id
            )
        )
    );

CREATE POLICY "access_profile_permission_delete_policy" ON access_profile_permission
    FOR DELETE USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM access_profile ap
            WHERE ap.id = access_profile_permission.profile_id
            AND ap.company_id IS NOT NULL
            AND ap.is_system = FALSE
            AND EXISTS (
                SELECT 1 FROM app_user au
                WHERE au.auth_user_id = auth.uid()
                AND au.company_id = ap.company_id
            )
        )
    );

-- =====================================================
-- 14) GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION has_permission(UUID, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions(UUID) TO authenticated;
