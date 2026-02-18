-- =====================================================
-- ÁUREA CARE - Home Care Management System
-- Database Schema for Supabase (PostgreSQL)
-- =====================================================

-- =====================================================
-- A) MULTI-EMPRESA E USUÁRIOS
-- =====================================================

CREATE TYPE enum_theme_preference AS ENUM (
'light',
'dark',
'system'
);

-- Tabela de empresas (multi-tenant)
CREATE TABLE company (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    trade_name text,
    document text UNIQUE, -- CNPJ/CPF
    logo_url text,
    primary_color text DEFAULT '#1aa2ff', -- Azul elegante
    theme_preference enum_theme_preference DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de usuários (vinculada ao Supabase Auth)
CREATE TABLE app_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    auth_user_id UUID UNIQUE NOT NULL, -- Referência ao auth.users
    name text NOT NULL,
    email text NOT NULL,
    role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'clinician', 'stock', 'finance', 'viewer')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_app_user_company ON app_user(company_id);
CREATE INDEX idx_app_user_auth ON app_user(auth_user_id);

-- =====================================================
-- B) CADASTROS PRINCIPAIS
-- =====================================================

CREATE TYPE enum_client_type AS ENUM (
'insurer',
'company',
'individual'
);

-- Clientes (operadoras, empresas, pessoa física)
CREATE TABLE client (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    type enum_client_type NOT NULL DEFAULT 'individual',
    code text, 
    name text NOT NULL,
    document text,
    email text,
    phone text,
    zip text null,
    street text null,
    number text null,
    complement text null,
    district text null,
    city text null,
    state text null,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_client_company_code UNIQUE (company_id, code)
);

CREATE INDEX idx_client_company ON client(company_id);

CREATE TYPE enum_gender AS ENUM (
'male',
'female',
'other'
);

-- Profissionais de saúde
CREATE TABLE professional (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    code text, -- Código de referência em sistemas externos (folha, escala, etc.)
    name text NOT NULL,
    council_type text, -- CRM, COREN, CREFITO, etc.
    council_number text,
    council_uf text,
    gender enum_gender,
    phone text,
    email text,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_professional_company_code UNIQUE (company_id, code)
);

CREATE INDEX idx_professional_company ON professional(company_id);

-- Pacientes
CREATE TABLE patient (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    code text, 
    name text NOT NULL,
    name_normalized text,
    cpf text, -- CPF
    birth_date DATE,
    gender enum_gender,
    mother_name text,
    father_name text,
    phone text,
    email text,
    billing_client_id UUID REFERENCES client(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_patient_company_code UNIQUE (company_id, code)
);

CREATE INDEX idx_patient_company ON patient(company_id);
CREATE INDEX idx_patient_billing_client ON patient(billing_client_id);
-- Add unique constraint on CPF per company
CREATE UNIQUE INDEX idx_patient_cpf_unique ON patient(company_id, cpf) WHERE cpf IS NOT NULL AND cpf <> '';

-- Add index for better search performance
CREATE INDEX idx_patient_name ON patient(company_id, name);
CREATE INDEX idx_patient_cpf ON patient(company_id, cpf) WHERE cpf IS NOT NULL;

-- =====================================================
-- C) PRODUTOS (Medicamentos, Materiais, Dietas)
-- =====================================================

CREATE TYPE enum_item_type AS ENUM (
'medication',
'material',
'diet'
);

CREATE TABLE product (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    item_type enum_item_type NOT NULL DEFAULT 'medication',
    code text, -- Código de referência em sistemas externos (TUSS, Brasíndice, CMED, etc.)
    name text NOT NULL,
    description text,
    unit_stock_id UUID, -- FK para unit_of_measure (unidade de estoque)
    unit_prescription_id UUID, -- FK para unit_of_measure (unidade de prescrição)
    min_stock DECIMAL(15, 3) DEFAULT 0,
    -- Campos específicos de medicamentos
    concentration text, -- Concentração (ex: 25mg, 500mg/5ml)
    -- FKs para tabelas auxiliares
    active_ingredient_id UUID, -- FK para active_ingredient (constraint adicionada após criação da tabela)
    manufacturer_id UUID, -- FK para manufacturer (constraint adicionada após criação da tabela)
    -- Referências a tabelas externas
    tiss_ref text, -- Código de referência TISS
    tuss_ref text, -- Código de referência TUSS
    -- Classificações especiais
    psychotropic BOOLEAN DEFAULT FALSE, -- Psicotrópico
    antibiotic BOOLEAN DEFAULT FALSE, -- Antibiótico
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_product_company_code UNIQUE (company_id, code)
);

CREATE INDEX idx_product_company ON product(company_id);
CREATE INDEX idx_product_type ON product(item_type);
CREATE INDEX idx_product_active_ingredient ON product(active_ingredient_id);
CREATE INDEX idx_product_manufacturer ON product(manufacturer_id);
CREATE INDEX idx_product_unit_stock ON product(unit_stock_id);
CREATE INDEX idx_product_unit_prescription ON product(unit_prescription_id);

-- =====================================================
-- D) EQUIPAMENTOS (Controle Patrimonial)
-- =====================================================

CREATE TYPE enum_status AS ENUM (
'available',
'in_use',
'maintenance',
'inactive'
);

CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    code text, -- Código de referência em sistemas externos (patrimônio, locadora, etc.)
    name text NOT NULL,
    description text,
    serial_number text,
    patrimony_code text,
    status enum_status NOT NULL DEFAULT 'available',
    assigned_patient_id UUID REFERENCES patient(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_equipment_company_code UNIQUE (company_id, code)
);

CREATE INDEX idx_equipment_company ON equipment(company_id);
CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_patient ON equipment(assigned_patient_id);

-- =====================================================
-- E) ESTOQUE
-- =====================================================

-- Locais de estoque
CREATE TABLE stock_location (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    code text,
    name text NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_stock_location_company_code UNIQUE (company_id, code)
);
create index idx_stock_location_company on stock_location(company_id);

-- Saldo de estoque
CREATE TABLE stock_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES stock_location(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    qty_on_hand DECIMAL(15, 3) NOT NULL DEFAULT 0,
    avg_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, location_id, product_id)
);

CREATE INDEX idx_stock_balance_company ON stock_balance(company_id);
CREATE INDEX idx_stock_balance_location ON stock_balance(location_id);
CREATE INDEX idx_stock_balance_product ON stock_balance(product_id);

CREATE TYPE enum_reference_type AS ENUM (
'nfe_import',
'prescription',
'manual',
'consumption'
);

CREATE TYPE enum_movement_type AS ENUM (
'in',
'out',
'adjust'
);

-- Movimentações de estoque
CREATE TABLE stock_movement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES stock_location(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    movement_type enum_movement_type NOT NULL DEFAULT 'in',
    quantity DECIMAL(15, 3) NOT NULL,
    unit_cost DECIMAL(15, 4) DEFAULT 0,
    total_cost DECIMAL(15, 4) DEFAULT 0,
    reference_type enum_reference_type NOT NULL DEFAULT 'nfe_import',
    reference_id UUID,
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    notes text,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_movement_company ON stock_movement(company_id);
CREATE INDEX idx_stock_movement_location ON stock_movement(location_id);
CREATE INDEX idx_stock_movement_product ON stock_movement(product_id);
CREATE INDEX idx_stock_movement_date ON stock_movement(occurred_at);

-- =====================================================
-- F) PRESCRIÇÃO
-- =====================================================

CREATE TYPE enum_prescription_status AS ENUM (
'draft',
'active',
'suspended',
'finished'
);

CREATE TABLE prescription (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    code text, -- Código de referência em sistemas externos (prontuário, etc.)
    patient_id UUID NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES professional(id) ON DELETE SET NULL,
    status enum_prescription_status NOT NULL DEFAULT 'draft',
    start_date DATE,
    end_date DATE,
    notes text,
    attachment_url text,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_prescription_company_code UNIQUE (company_id, code)
);

CREATE INDEX idx_prescription_company ON prescription(company_id);
CREATE INDEX idx_prescription_patient ON prescription(patient_id);
CREATE INDEX idx_prescription_professional ON prescription(professional_id);
CREATE INDEX idx_prescription_status ON prescription(status);

CREATE TYPE enum_prescription_item_type AS ENUM (
'medication',
'diet',
'equipment',
'procedure'
);

-- Itens da prescrição
CREATE TABLE prescription_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    code text, -- Código de referência em sistemas externos (prontuário, etc.)
    prescription_id UUID NOT NULL REFERENCES prescription(id) ON DELETE CASCADE,
    item_type enum_prescription_item_type NOT NULL DEFAULT 'medication',
    product_id UUID REFERENCES product(id) ON DELETE SET NULL,
    equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL,
    dosage_text text,
    quantity DECIMAL(10, 3),
    frequency_text text,
    route_text text,
    notes text,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_prescription_item_company_code UNIQUE (company_id, code)
);

CREATE INDEX idx_prescription_item_company ON prescription_item(company_id);
CREATE INDEX idx_prescription_item_prescription ON prescription_item(prescription_id);

-- =====================================================
-- G) CONSUMO DO PACIENTE
-- =====================================================

CREATE TABLE patient_consumption (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    location_id UUID REFERENCES stock_location(id) ON DELETE SET NULL,
    quantity DECIMAL(15, 3) NOT NULL,
    consumed_at TIMESTAMPTZ DEFAULT NOW(),
    notes text,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patient_consumption_company ON patient_consumption(company_id);
CREATE INDEX idx_patient_consumption_patient ON patient_consumption(patient_id);
CREATE INDEX idx_patient_consumption_product ON patient_consumption(product_id);
CREATE INDEX idx_patient_consumption_date ON patient_consumption(consumed_at);

-- =====================================================
-- H) IMPORTAÇÃO DE NFe
-- =====================================================

CREATE TABLE nfe_import (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'parsed', 'posted', 'error')),
    access_key text,
    number text,
    issuer_name text,
    issuer_document text,
    issued_at TIMESTAMPTZ,
    xml_url text,
    error_message text,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nfe_import_company ON nfe_import(company_id);
CREATE INDEX idx_nfe_import_status ON nfe_import(status);
CREATE INDEX idx_nfe_import_key ON nfe_import(access_key);

-- Itens da NFe importada
CREATE TABLE nfe_import_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    nfe_import_id UUID NOT NULL REFERENCES nfe_import(id) ON DELETE CASCADE,
    raw_description text NOT NULL,
    unit text,
    quantity DECIMAL(15, 3) NOT NULL,
    unit_price DECIMAL(15, 4) NOT NULL,
    total_price DECIMAL(15, 4) NOT NULL,
    product_id UUID REFERENCES product(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nfe_import_item_company ON nfe_import_item(company_id);
CREATE INDEX idx_nfe_import_item_nfe ON nfe_import_item(nfe_import_id);

-- =====================================================
-- TRIGGERS PARA ATUALIZAÇÃO DE updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger em todas as tabelas com updated_at
CREATE TRIGGER update_company_updated_at BEFORE UPDATE ON company FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_app_user_updated_at BEFORE UPDATE ON app_user FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_updated_at BEFORE UPDATE ON client FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_professional_updated_at BEFORE UPDATE ON professional FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patient_updated_at BEFORE UPDATE ON patient FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_updated_at BEFORE UPDATE ON product FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_location_updated_at BEFORE UPDATE ON stock_location FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_balance_updated_at BEFORE UPDATE ON stock_balance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prescription_updated_at BEFORE UPDATE ON prescription FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prescription_item_updated_at BEFORE UPDATE ON prescription_item FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nfe_import_updated_at BEFORE UPDATE ON nfe_import FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNÇÃO AUXILIAR PARA OBTER company_id DO USUÁRIO
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
DECLARE
    company_uuid UUID;
BEGIN
    SELECT company_id INTO company_uuid
    FROM app_user
    WHERE auth_user_id = auth.uid();
    RETURN company_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO PARA VERIFICAR SE USUÁRIO É ADMIN
-- =====================================================

CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM app_user
    WHERE auth_user_id = auth.uid();
    RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO PARA ATUALIZAR SALDO DE ESTOQUE
-- =====================================================

CREATE OR REPLACE FUNCTION update_stock_balance()
RETURNS TRIGGER AS $$
DECLARE
    current_balance RECORD;
    new_qty DECIMAL(15, 3);
    new_avg_cost DECIMAL(15, 4);
BEGIN
    -- Get current balance
    SELECT * INTO current_balance
    FROM stock_balance
    WHERE company_id = NEW.company_id
      AND location_id = NEW.location_id
      AND product_id = NEW.product_id;

    -- Calculate new quantity based on movement type
    IF NEW.movement_type = 'in' THEN
        new_qty := COALESCE(current_balance.qty_on_hand, 0) + NEW.quantity;
        -- Calculate weighted average cost
        IF COALESCE(current_balance.qty_on_hand, 0) + NEW.quantity > 0 THEN
            new_avg_cost := (
                (COALESCE(current_balance.qty_on_hand, 0) * COALESCE(current_balance.avg_cost, 0)) +
                (NEW.quantity * COALESCE(NEW.unit_cost, 0))
            ) / (COALESCE(current_balance.qty_on_hand, 0) + NEW.quantity);
        ELSE
            new_avg_cost := COALESCE(NEW.unit_cost, 0);
        END IF;
    ELSIF NEW.movement_type = 'out' THEN
        new_qty := COALESCE(current_balance.qty_on_hand, 0) - NEW.quantity;
        new_avg_cost := COALESCE(current_balance.avg_cost, 0);
    ELSE -- ADJUST
        new_qty := NEW.quantity;
        new_avg_cost := COALESCE(NEW.unit_cost, current_balance.avg_cost, 0);
    END IF;

    -- Upsert stock balance
    INSERT INTO stock_balance (company_id, location_id, product_id, qty_on_hand, avg_cost)
    VALUES (NEW.company_id, NEW.location_id, NEW.product_id, new_qty, new_avg_cost)
    ON CONFLICT (company_id, location_id, product_id)
    DO UPDATE SET
        qty_on_hand = new_qty,
        avg_cost = new_avg_cost,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_balance
AFTER INSERT ON stock_movement
FOR EACH ROW EXECUTE FUNCTION update_stock_balance();

-- =====================================================
-- DADOS INICIAIS (Empresa de demonstração)
-- =====================================================

-- Inserir empresa inicial "Vida em Casa" com CNPJ-teste
INSERT INTO company (id, name, trade_name, document, primary_color, theme_preference)
VALUES (
    gen_random_uuid(),
    'Vida em Casa LTDA',
    'Vida em Casa',
    '00.000.000/0001-00', -- não altere esse valor pois será usado em outras migrations e em seeds
    '#1aa2ff',
    'dark'
);

-- Inserir local de estoque padrão (usando subquery para pegar o ID da empresa)
INSERT INTO stock_location (company_id, name)
SELECT id, 'Estoque Principal' FROM company WHERE document = '00.000.000/0001-00';
