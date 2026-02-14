-- =====================================================
-- FIX PRESCRIPTION_ITEM PRODUCT ACCESS VIA RLS
-- =====================================================
-- Problema: Quando um usuário carrega prescription_item com a relação product,
-- a RLS policy do product bloqueia o acesso porque o produto está vinculado
-- à empresa do usuário, mas a query da relação não passa o contexto correto.
--
-- Solução: Permitir que usuários acessem produtos quando consultados
-- através de prescription_item que está na sua empresa.
-- =====================================================

BEGIN;

-- 1) Remover policies antigas de product se existirem para recriá-las com melhor acesso
DROP POLICY IF EXISTS "Users can view products in their company" ON product;
DROP POLICY IF EXISTS "Users can insert products in their company" ON product;
DROP POLICY IF EXISTS "Users can update products in their company" ON product;
DROP POLICY IF EXISTS "Users can delete products in their company" ON product;

-- 2) Criar novas políticas que permitem acesso via prescription_item
CREATE POLICY "Users can view products in their company"
    ON product FOR SELECT
    USING (
        company_id = get_user_company_id()
        OR
        -- Permitir acesso a produtos que estão vinculados a itens de prescrição
        -- que pertencem a prescrições da empresa do usuário
        id IN (
            SELECT DISTINCT pi.product_id
            FROM prescription_item pi
            JOIN prescription p ON pi.prescription_id = p.id
            WHERE p.company_id = get_user_company_id()
            AND pi.product_id IS NOT NULL
        )
    );

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

-- 3) Aplicar o mesmo conceito para equipment
DROP POLICY IF EXISTS "Users can view equipment in their company" ON equipment;
DROP POLICY IF EXISTS "Users can insert equipment in their company" ON equipment;
DROP POLICY IF EXISTS "Users can update equipment in their company" ON equipment;
DROP POLICY IF EXISTS "Users can delete equipment in their company" ON equipment;

CREATE POLICY "Users can view equipment in their company"
    ON equipment FOR SELECT
    USING (
        company_id = get_user_company_id()
        OR
        -- Permitir acesso a equipamentos que estão vinculados a itens de prescrição
        -- que pertencem a prescrições da empresa do usuário
        id IN (
            SELECT DISTINCT pi.equipment_id
            FROM prescription_item pi
            JOIN prescription p ON pi.prescription_id = p.id
            WHERE p.company_id = get_user_company_id()
            AND pi.equipment_id IS NOT NULL
        )
    );

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

COMMIT;
