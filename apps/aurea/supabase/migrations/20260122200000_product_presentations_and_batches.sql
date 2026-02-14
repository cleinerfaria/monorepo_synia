-- =====================================================
-- ÁUREA CARE - Apresentações de Produtos e Lotes
-- Suporta conversão de unidades e rastreabilidade
-- =====================================================

-- =====================================================
-- 1. TABELA DE APRESENTAÇÕES (CONVERSÃO DE UNIDADES)
-- =====================================================

CREATE TABLE product_presentation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Ex: "Caixa 30comp MEDLEY", "Blister 10comp"
    barcode TEXT, -- Código de barras EAN
    conversion_factor DECIMAL(15, 6) NOT NULL DEFAULT 1, -- Quantas unidades base
    is_purchase_unit BOOLEAN DEFAULT FALSE, -- Usado na entrada/NFe
    is_dispensing_unit BOOLEAN DEFAULT FALSE, -- Usado na dispensação
    is_prescription_unit BOOLEAN DEFAULT FALSE, -- Usado na prescrição
    supplier_name TEXT, -- Fabricante/Fornecedor desta apresentação
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_presentation_company ON product_presentation(company_id);
CREATE INDEX idx_presentation_product ON product_presentation(product_id);
CREATE INDEX idx_presentation_barcode ON product_presentation(barcode);

-- Trigger para updated_at
CREATE TRIGGER update_presentation_updated_at 
    BEFORE UPDATE ON product_presentation 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS para apresentações
ALTER TABLE product_presentation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view presentations of their company"
    ON product_presentation FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert presentations for their company"
    ON product_presentation FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update presentations of their company"
    ON product_presentation FOR UPDATE
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete presentations of their company"
    ON product_presentation FOR DELETE
    USING (company_id = get_user_company_id());

-- =====================================================
-- 2. TABELA DE LOTES (RASTREABILIDADE)
-- =====================================================

CREATE TABLE stock_batch (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES stock_location(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL, -- Número do lote
    expiration_date DATE, -- Data de validade
    manufacture_date DATE, -- Data de fabricação
    qty_on_hand DECIMAL(15, 3) NOT NULL DEFAULT 0, -- Quantidade em unidades base
    unit_cost DECIMAL(15, 4) DEFAULT 0, -- Custo unitário
    nfe_import_id UUID REFERENCES nfe_import(id) ON DELETE SET NULL, -- Origem
    supplier_name TEXT, -- Fornecedor
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_batch_company ON stock_batch(company_id);
CREATE INDEX idx_batch_product ON stock_batch(product_id);
CREATE INDEX idx_batch_location ON stock_batch(location_id);
CREATE INDEX idx_batch_number ON stock_batch(batch_number);
CREATE INDEX idx_batch_expiration ON stock_batch(expiration_date);

-- Trigger para updated_at
CREATE TRIGGER update_batch_updated_at 
    BEFORE UPDATE ON stock_batch 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS para lotes
ALTER TABLE stock_batch ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view batches of their company"
    ON stock_batch FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert batches for their company"
    ON stock_batch FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update batches of their company"
    ON stock_batch FOR UPDATE
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete batches of their company"
    ON stock_batch FOR DELETE
    USING (company_id = get_user_company_id());

-- =====================================================
-- 3. ADICIONAR REFERÊNCIA DE LOTE NA MOVIMENTAÇÃO
-- =====================================================

ALTER TABLE stock_movement
ADD COLUMN batch_id UUID REFERENCES stock_batch(id) ON DELETE SET NULL,
ADD COLUMN presentation_id UUID REFERENCES product_presentation(id) ON DELETE SET NULL,
ADD COLUMN presentation_qty DECIMAL(15, 3); -- Quantidade na apresentação (antes da conversão)

COMMENT ON COLUMN stock_movement.batch_id IS 'Lote associado à movimentação';
COMMENT ON COLUMN stock_movement.presentation_id IS 'Apresentação usada na movimentação';
COMMENT ON COLUMN stock_movement.presentation_qty IS 'Quantidade na unidade da apresentação';

CREATE INDEX idx_stock_movement_batch ON stock_movement(batch_id);
CREATE INDEX idx_stock_movement_presentation ON stock_movement(presentation_id);

-- =====================================================
-- 4. ADICIONAR REFERÊNCIA DE APRESENTAÇÃO NA NFE
-- =====================================================

ALTER TABLE nfe_import_item
ADD COLUMN presentation_id UUID REFERENCES product_presentation(id) ON DELETE SET NULL,
ADD COLUMN batch_number TEXT,
ADD COLUMN expiration_date DATE,
ADD COLUMN manufacture_date DATE;

COMMENT ON COLUMN nfe_import_item.presentation_id IS 'Apresentação vinculada ao item da NFe';
COMMENT ON COLUMN nfe_import_item.batch_number IS 'Número do lote do produto';
COMMENT ON COLUMN nfe_import_item.expiration_date IS 'Data de validade';
COMMENT ON COLUMN nfe_import_item.manufacture_date IS 'Data de fabricação';

-- =====================================================
-- 5. ADICIONAR CAMPOS NA PRESCRIÇÃO PARA APRESENTAÇÃO
-- =====================================================

ALTER TABLE prescription_item
ADD COLUMN presentation_id UUID REFERENCES product_presentation(id) ON DELETE SET NULL;

COMMENT ON COLUMN prescription_item.presentation_id IS 'Apresentação para dispensação';

-- NOTA: Views vw_low_stock e vw_stock_with_batches são criadas na migração 20260122240000_unit_of_measure.sql
-- após a criação das tabelas unit_of_measure e active_ingredient
