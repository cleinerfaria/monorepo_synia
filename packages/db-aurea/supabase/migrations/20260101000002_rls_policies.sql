-- =====================================================
-- ÁUREA CARE - Row Level Security (RLS) Policies
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE company ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE client ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient ENABLE ROW LEVEL SECURITY;
ALTER TABLE product ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_location ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movement ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfe_import ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfe_import_item ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS PARA COMPANY
-- =====================================================

-- Usuário só vê sua própria empresa (usando função SECURITY DEFINER)
CREATE POLICY "Users can view their own company"
    ON company FOR SELECT
    USING (id = get_user_company_id());

-- Apenas admin pode atualizar a empresa
CREATE POLICY "Admins can update their company"
    ON company FOR UPDATE
    USING (id = get_user_company_id() AND is_user_admin())
    WITH CHECK (id = get_user_company_id() AND is_user_admin());

-- =====================================================
-- POLÍTICAS PARA APP_USER
-- Nota: app_user precisa de políticas especiais porque:
-- 1. Usuário novo precisa verificar se já existe (SELECT por auth_user_id)
-- 2. Usuário novo precisa criar seu próprio registro (INSERT)
-- 3. Funções get_user_company_id() e is_user_admin() são SECURITY DEFINER
--    então NÃO causam recursão infinita
-- =====================================================

-- SELECT: usuário pode ver seu próprio registro OU usuários da mesma empresa
CREATE POLICY "Users can view users in their company"
    ON app_user FOR SELECT
    USING (
        -- Sempre pode ver seu próprio registro (para verificar se já existe)
        auth_user_id = auth.uid() 
        OR 
        -- Ou ver usuários da mesma empresa
        company_id = get_user_company_id()
    );

-- INSERT: usuário pode criar seu próprio registro (primeira vinculação) OU admin pode criar
CREATE POLICY "Users can create own record or admins can insert"
    ON app_user FOR INSERT
    WITH CHECK (
        -- Usuário pode criar seu próprio registro (primeira vinculação a empresa)
        auth_user_id = auth.uid()
        OR
        -- Ou admin pode criar registros para outros na mesma empresa
        (company_id = get_user_company_id() AND is_user_admin())
    );

-- UPDATE: usuário pode atualizar seu próprio registro OU admin pode atualizar
CREATE POLICY "Users can update own record or admins can update"
    ON app_user FOR UPDATE
    USING (
        auth_user_id = auth.uid()
        OR
        (company_id = get_user_company_id() AND is_user_admin())
    )
    WITH CHECK (
        auth_user_id = auth.uid()
        OR
        (company_id = get_user_company_id() AND is_user_admin())
    );

-- DELETE: apenas admin pode deletar usuários da mesma empresa
CREATE POLICY "Admins can delete users"
    ON app_user FOR DELETE
    USING (company_id = get_user_company_id() AND is_user_admin());

-- =====================================================
-- POLÍTICAS PARA CLIENT
-- =====================================================

CREATE POLICY "Users can view clients in their company"
    ON client FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert clients in their company"
    ON client FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update clients in their company"
    ON client FOR UPDATE
    USING (company_id = get_user_company_id())
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can delete clients in their company"
    ON client FOR DELETE
    USING (company_id = get_user_company_id());

-- =====================================================
-- POLÍTICAS PARA PROFESSIONAL
-- =====================================================

CREATE POLICY "Users can view professionals in their company"
    ON professional FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert professionals in their company"
    ON professional FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update professionals in their company"
    ON professional FOR UPDATE
    USING (company_id = get_user_company_id())
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can delete professionals in their company"
    ON professional FOR DELETE
    USING (company_id = get_user_company_id());

-- =====================================================
-- POLÍTICAS PARA PATIENT
-- =====================================================

CREATE POLICY "Users can view patients in their company"
    ON patient FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert patients in their company"
    ON patient FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update patients in their company"
    ON patient FOR UPDATE
    USING (company_id = get_user_company_id())
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can delete patients in their company"
    ON patient FOR DELETE
    USING (company_id = get_user_company_id());

-- =====================================================
-- POLÍTICAS PARA PRODUCT
-- =====================================================

CREATE POLICY "Users can view products in their company"
    ON product FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert products in their company"
    ON product FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update products in their company"
    ON product FOR UPDATE
    USING (company_id = get_user_company_id())
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can delete products in their company"
    ON product FOR DELETE
    USING (company_id = get_user_company_id());

-- =====================================================
-- POLÍTICAS PARA EQUIPMENT
-- =====================================================

CREATE POLICY "Users can view equipment in their company"
    ON equipment FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert equipment in their company"
    ON equipment FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update equipment in their company"
    ON equipment FOR UPDATE
    USING (company_id = get_user_company_id())
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can delete equipment in their company"
    ON equipment FOR DELETE
    USING (company_id = get_user_company_id());

-- =====================================================
-- POLÍTICAS PARA STOCK_LOCATION
-- =====================================================

CREATE POLICY "Users can view stock locations in their company"
    ON stock_location FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert stock locations in their company"
    ON stock_location FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update stock locations in their company"
    ON stock_location FOR UPDATE
    USING (company_id = get_user_company_id())
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can delete stock locations in their company"
    ON stock_location FOR DELETE
    USING (company_id = get_user_company_id());

-- =====================================================
-- POLÍTICAS PARA STOCK_BALANCE
-- =====================================================

CREATE POLICY "Users can view stock balance in their company"
    ON stock_balance FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert stock balance in their company"
    ON stock_balance FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update stock balance in their company"
    ON stock_balance FOR UPDATE
    USING (company_id = get_user_company_id())
    WITH CHECK (company_id = get_user_company_id());

-- =====================================================
-- POLÍTICAS PARA STOCK_MOVEMENT
-- =====================================================

CREATE POLICY "Users can view stock movements in their company"
    ON stock_movement FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert stock movements in their company"
    ON stock_movement FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

-- =====================================================
-- POLÍTICAS PARA PRESCRIPTION
-- =====================================================

CREATE POLICY "Users can view prescriptions in their company"
    ON prescription FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert prescriptions in their company"
    ON prescription FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update prescriptions in their company"
    ON prescription FOR UPDATE
    USING (company_id = get_user_company_id())
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can delete prescriptions in their company"
    ON prescription FOR DELETE
    USING (company_id = get_user_company_id());

-- =====================================================
-- POLÍTICAS PARA PRESCRIPTION_ITEM
-- =====================================================

CREATE POLICY "Users can view prescription items in their company"
    ON prescription_item FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert prescription items in their company"
    ON prescription_item FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update prescription items in their company"
    ON prescription_item FOR UPDATE
    USING (company_id = get_user_company_id())
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can delete prescription items in their company"
    ON prescription_item FOR DELETE
    USING (company_id = get_user_company_id());

-- =====================================================
-- POLÍTICAS PARA PATIENT_CONSUMPTION
-- =====================================================

CREATE POLICY "Users can view patient consumption in their company"
    ON patient_consumption FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert patient consumption in their company"
    ON patient_consumption FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update patient consumption in their company"
    ON patient_consumption FOR UPDATE
    USING (company_id = get_user_company_id())
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can delete patient consumption in their company"
    ON patient_consumption FOR DELETE
    USING (company_id = get_user_company_id());

-- =====================================================
-- POLÍTICAS PARA NFE_IMPORT
-- =====================================================

CREATE POLICY "Users can view NFe imports in their company"
    ON nfe_import FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert NFe imports in their company"
    ON nfe_import FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update NFe imports in their company"
    ON nfe_import FOR UPDATE
    USING (company_id = get_user_company_id())
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can delete NFe imports in their company"
    ON nfe_import FOR DELETE
    USING (company_id = get_user_company_id());

-- =====================================================
-- POLÍTICAS PARA NFE_IMPORT_ITEM
-- =====================================================

CREATE POLICY "Users can view NFe import items in their company"
    ON nfe_import_item FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert NFe import items in their company"
    ON nfe_import_item FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update NFe import items in their company"
    ON nfe_import_item FOR UPDATE
    USING (company_id = get_user_company_id())
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can delete NFe import items in their company"
    ON nfe_import_item FOR DELETE
    USING (company_id = get_user_company_id());


-- RLS for company_unit
ALTER TABLE company_unit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_unit_select_policy" ON company_unit
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "company_unit_insert_policy" ON company_unit
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "company_unit_update_policy" ON company_unit
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "company_unit_delete_policy" ON company_unit
    FOR DELETE USING (auth.role() = 'authenticated');