-- =====================================================
-- ÁUREA CARE - Tabelas Auxiliares: Princípio Ativo, Fabricante, Fornecedor
-- =====================================================

-- =====================================================
-- 1. PRINCÍPIO ATIVO (PARA MEDICAMENTOS)
-- =====================================================

CREATE TABLE active_ingredient (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    code text, -- Código de referência em sistemas externos (DCB, etc.)
    name text NOT NULL, -- Ex: Captopril, Dipirona, Omeprazol
    cas_number text, -- Número CAS (Chemical Abstracts Service)
    description text,
    therapeutic_class text, -- Classe terapêutica (Anti-hipertensivo, Analgésico, etc.)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_active_ingredient_company ON active_ingredient(company_id);
CREATE INDEX idx_active_ingredient_name ON active_ingredient(name);
CREATE UNIQUE INDEX idx_active_ingredient_unique ON active_ingredient(company_id, LOWER(name));
CREATE UNIQUE INDEX idx_active_ingredient_code_unique ON active_ingredient(company_id, code) WHERE code IS NOT NULL;

-- Trigger para updated_at
CREATE TRIGGER update_active_ingredient_updated_at 
    BEFORE UPDATE ON active_ingredient 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE active_ingredient ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active_ingredients of their company"
    ON active_ingredient FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert active_ingredients for their company"
    ON active_ingredient FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update active_ingredients of their company"
    ON active_ingredient FOR UPDATE
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete active_ingredients of their company"
    ON active_ingredient FOR DELETE
    USING (company_id = get_user_company_id());

-- =====================================================
-- 2. FABRICANTE (PARA TODOS OS PRODUTOS)
-- =====================================================

CREATE TABLE manufacturer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    code text, -- Código de referência em sistemas externos (ANVISA, ERP, etc.)
    name text NOT NULL, -- Ex: MEDLEY, EMS, Eurofarma
    trade_name text, -- Nome fantasia
    document text, -- CNPJ
    website text,
    phone text,
    email text,
    zip text null,
    street text null,
    number text null,
    complement text null,
    district text null,
    city text null,
    state text null,
    anvisa_authorization text, -- Autorização ANVISA
    notes text,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_manufacturer_company ON manufacturer(company_id);
CREATE INDEX idx_manufacturer_name ON manufacturer(name);
CREATE UNIQUE INDEX idx_manufacturer_document ON manufacturer(company_id, document) WHERE document IS NOT NULL;
CREATE UNIQUE INDEX idx_manufacturer_code_unique ON manufacturer(company_id, code) WHERE code IS NOT NULL;

-- Trigger para updated_at
CREATE TRIGGER update_manufacturer_updated_at 
    BEFORE UPDATE ON manufacturer 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE manufacturer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view manufacturers of their company"
    ON manufacturer FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert manufacturers for their company"
    ON manufacturer FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update manufacturers of their company"
    ON manufacturer FOR UPDATE
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete manufacturers of their company"
    ON manufacturer FOR DELETE
    USING (company_id = get_user_company_id());

-- =====================================================
-- 3. FORNECEDOR (PARA LINKAR COM NFE)
-- =====================================================

CREATE TABLE supplier (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    code text, -- Código de referência em sistemas externos (ERP, compras, etc.)
    name text NOT NULL, -- Razão social
    trade_name text, -- Nome fantasia
    document text, -- CNPJ/CPF
    state_registration text, -- Inscrição estadual
    municipal_registration text, -- Inscrição municipal
    phone text,
    email text,
    website text,
    zip text null,
    street text null,
    number text null,
    complement text null,
    district text null,
    city text null,
    state text null,
    contact_name text, -- Nome do contato
    contact_phone text,
    payment_terms text, -- Condições de pagamento
    notes text,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_supplier_company ON supplier(company_id);
CREATE INDEX idx_supplier_name ON supplier(name);
CREATE INDEX idx_supplier_document ON supplier(document);
CREATE UNIQUE INDEX idx_supplier_document_unique ON supplier(company_id, document) WHERE document IS NOT NULL;
CREATE UNIQUE INDEX idx_supplier_code_unique ON supplier(company_id, code) WHERE code IS NOT NULL;

-- Trigger para updated_at
CREATE TRIGGER update_supplier_updated_at 
    BEFORE UPDATE ON supplier 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE supplier ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view suppliers of their company"
    ON supplier FOR SELECT
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert suppliers for their company"
    ON supplier FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update suppliers of their company"
    ON supplier FOR UPDATE
    USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete suppliers of their company"
    ON supplier FOR DELETE
    USING (company_id = get_user_company_id());

-- =====================================================
-- 4. ADICIONAR FK CONSTRAINTS NA TABELA PRODUCT
-- =====================================================

-- Adicionar FK constraints (colunas já existem na criação inicial)
ALTER TABLE product 
ADD CONSTRAINT product_active_ingredient_id_fkey 
    FOREIGN KEY (active_ingredient_id) REFERENCES active_ingredient(id) ON DELETE SET NULL,
ADD CONSTRAINT product_manufacturer_id_fkey 
    FOREIGN KEY (manufacturer_id) REFERENCES manufacturer(id) ON DELETE SET NULL;

COMMENT ON COLUMN product.active_ingredient_id IS 'Princípio ativo do medicamento (FK)';
COMMENT ON COLUMN product.manufacturer_id IS 'Fabricante do produto (FK)';

-- =====================================================
-- 5. ATUALIZAR NFE_IMPORT PARA USAR FK DE FORNECEDOR
-- =====================================================

ALTER TABLE nfe_import
ADD COLUMN supplier_id UUID REFERENCES supplier(id) ON DELETE SET NULL;

CREATE INDEX idx_nfe_import_supplier ON nfe_import(supplier_id);

COMMENT ON COLUMN nfe_import.supplier_id IS 'Fornecedor da NFe';

-- =====================================================
-- 6. ATUALIZAR STOCK_BATCH PARA USAR FK DE FORNECEDOR
-- =====================================================

ALTER TABLE stock_batch
ADD COLUMN supplier_id UUID REFERENCES supplier(id) ON DELETE SET NULL;

CREATE INDEX idx_stock_batch_supplier ON stock_batch(supplier_id);

COMMENT ON COLUMN stock_batch.supplier_id IS 'Fornecedor do lote';

-- =====================================================
-- 7. ATUALIZAR PRESENTATION PARA USAR FK DE FABRICANTE
-- =====================================================

ALTER TABLE product_presentation
ADD COLUMN manufacturer_id UUID REFERENCES manufacturer(id) ON DELETE SET NULL;

CREATE INDEX idx_presentation_manufacturer ON product_presentation(manufacturer_id);

COMMENT ON COLUMN product_presentation.manufacturer_id IS 'Fabricante desta apresentação';
