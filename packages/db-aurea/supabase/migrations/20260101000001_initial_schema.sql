-- =====================================================
-- ÁUREA CARE - Home Care Management System
-- Database Schema for Supabase (PostgreSQL)
-- =====================================================

-- =====================================================
-- A) MULTI-EMPRESA E USUÁRIOS
-- =====================================================

-- Tabela de empresas (multi-tenant)
CREATE TABLE company (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    document VARCHAR(20) UNIQUE, -- CNPJ/CPF
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#D4AF37', -- Dourado elegante
    theme_preference VARCHAR(10) DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark', 'system')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de usuários (vinculada ao Supabase Auth)
CREATE TABLE app_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    auth_user_id UUID UNIQUE NOT NULL, -- Referência ao auth.users
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'clinician', 'stock', 'finance', 'viewer')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_app_user_company ON app_user(company_id);
CREATE INDEX idx_app_user_auth ON app_user(auth_user_id);

-- =====================================================
-- B) CADASTROS PRINCIPAIS
-- =====================================================

-- Clientes (operadoras, empresas, pessoa física)
CREATE TABLE client (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('insurer', 'company', 'individual')),
    code VARCHAR(50), -- Código de referência em sistemas externos (ERP, operadora, etc.)
    name VARCHAR(255) NOT NULL,
    document VARCHAR(20),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_client_company ON client(company_id);
CREATE UNIQUE INDEX idx_client_code_unique ON client(company_id, code) WHERE code IS NOT NULL;

-- Profissionais de saúde
CREATE TABLE professional (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    code VARCHAR(50), -- Código de referência em sistemas externos (folha, escala, etc.)
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100), -- Médico, Enfermeiro, Fisioterapeuta, etc.
    council_type VARCHAR(20), -- CRM, COREN, CREFITO, etc.
    council_number VARCHAR(20),
    council_uf VARCHAR(2),
    phone VARCHAR(20),
    email VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_professional_company ON professional(company_id);
CREATE UNIQUE INDEX idx_professional_code_unique ON professional(company_id, code) WHERE code IS NOT NULL;

-- Pacientes
CREATE TABLE patient (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    code VARCHAR(50), -- Código de referência em sistemas externos (CNS, operadora, prontuário, etc.)
    name VARCHAR(255) NOT NULL,
    document VARCHAR(20), -- CPF
    birth_date DATE,
    gender VARCHAR(1) CHECK (gender IN ('M', 'F', 'O')),
    phone VARCHAR(20),
    email VARCHAR(255),
    billing_client_id UUID REFERENCES client(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patient_company ON patient(company_id);
CREATE INDEX idx_patient_billing_client ON patient(billing_client_id);
CREATE UNIQUE INDEX idx_patient_code_unique ON patient(company_id, code) WHERE code IS NOT NULL;

-- =====================================================
-- C) PRODUTOS (Medicamentos, Materiais, Dietas)
-- =====================================================

CREATE TABLE product (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('medication', 'material', 'diet')),
    code TEXT, -- Código de referência em sistemas externos (TUSS, Brasíndice, CMED, etc.)
    name TEXT NOT NULL,
    description TEXT,
    unit_stock_id UUID, -- FK para unit_of_measure (unidade de estoque)
    unit_prescription_id UUID, -- FK para unit_of_measure (unidade de prescrição)
    min_stock DECIMAL(15, 3) DEFAULT 0,
    -- Campos específicos de medicamentos
    concentration TEXT, -- Concentração (ex: 25mg, 500mg/5ml)
    -- FKs para tabelas auxiliares
    active_ingredient_id UUID, -- FK para active_ingredient (constraint adicionada após criação da tabela)
    manufacturer_id UUID, -- FK para manufacturer (constraint adicionada após criação da tabela)
    -- Referências a tabelas externas
    tiss_ref TEXT, -- Código de referência TISS
    tuss_ref TEXT, -- Código de referência TUSS
    -- Classificações especiais
    psychotropic BOOLEAN DEFAULT FALSE, -- Psicotrópico
    antibiotic BOOLEAN DEFAULT FALSE, -- Antibiótico
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_company ON product(company_id);
CREATE INDEX idx_product_type ON product(item_type);
CREATE UNIQUE INDEX idx_product_code_unique ON product(company_id, code) WHERE code IS NOT NULL;
CREATE INDEX idx_product_active_ingredient ON product(active_ingredient_id);
CREATE INDEX idx_product_manufacturer ON product(manufacturer_id);
CREATE INDEX idx_product_unit_stock ON product(unit_stock_id);
CREATE INDEX idx_product_unit_prescription ON product(unit_prescription_id);

-- =====================================================
-- D) EQUIPAMENTOS (Controle Patrimonial)
-- =====================================================

CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    code VARCHAR(50), -- Código de referência em sistemas externos (patrimônio, locadora, etc.)
    name VARCHAR(255) NOT NULL,
    description TEXT,
    serial_number VARCHAR(100),
    patrimony_code VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'inactive')),
    assigned_patient_id UUID REFERENCES patient(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_equipment_company ON equipment(company_id);
CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_patient ON equipment(assigned_patient_id);
CREATE UNIQUE INDEX idx_equipment_code_unique ON equipment(company_id, code) WHERE code IS NOT NULL;

-- =====================================================
-- E) ESTOQUE
-- =====================================================

-- Locais de estoque
CREATE TABLE stock_location (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_location_company ON stock_location(company_id);

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

-- Movimentações de estoque
CREATE TABLE stock_movement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES stock_location(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUST')),
    qty DECIMAL(15, 3) NOT NULL,
    unit_cost DECIMAL(15, 4) DEFAULT 0,
    total_cost DECIMAL(15, 4) DEFAULT 0,
    reference_type VARCHAR(20) CHECK (reference_type IN ('nfe_import', 'prescription', 'manual', 'consumption')),
    reference_id UUID,
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_movement_company ON stock_movement(company_id);
CREATE INDEX idx_stock_movement_location ON stock_movement(location_id);
CREATE INDEX idx_stock_movement_product ON stock_movement(product_id);
CREATE INDEX idx_stock_movement_date ON stock_movement(occurred_at);

-- =====================================================
-- F) PRESCRIÇÃO
-- =====================================================

CREATE TABLE prescription (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES professional(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'suspended', 'finished')),
    start_date DATE,
    end_date DATE,
    notes TEXT,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prescription_company ON prescription(company_id);
CREATE INDEX idx_prescription_patient ON prescription(patient_id);
CREATE INDEX idx_prescription_professional ON prescription(professional_id);
CREATE INDEX idx_prescription_status ON prescription(status);

-- Itens da prescrição
CREATE TABLE prescription_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    prescription_id UUID NOT NULL REFERENCES prescription(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('medication', 'material', 'diet', 'equipment')),
    product_id UUID REFERENCES product(id) ON DELETE SET NULL,
    equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL,
    dosage_text VARCHAR(255),
    qty DECIMAL(10, 3),
    frequency_text VARCHAR(255),
    route_text VARCHAR(100),
    notes TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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
    qty DECIMAL(15, 3) NOT NULL,
    consumed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
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
    status VARCHAR(20) NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'parsed', 'posted', 'error')),
    access_key VARCHAR(44),
    number VARCHAR(20),
    issuer_name VARCHAR(255),
    issuer_document VARCHAR(20),
    issued_at TIMESTAMPTZ,
    xml_url TEXT,
    error_message TEXT,
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
    raw_description TEXT NOT NULL,
    unit VARCHAR(20),
    qty DECIMAL(15, 3) NOT NULL,
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
    user_role VARCHAR(20);
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
    IF NEW.movement_type = 'IN' THEN
        new_qty := COALESCE(current_balance.qty_on_hand, 0) + NEW.qty;
        -- Calculate weighted average cost
        IF COALESCE(current_balance.qty_on_hand, 0) + NEW.qty > 0 THEN
            new_avg_cost := (
                (COALESCE(current_balance.qty_on_hand, 0) * COALESCE(current_balance.avg_cost, 0)) +
                (NEW.qty * COALESCE(NEW.unit_cost, 0))
            ) / (COALESCE(current_balance.qty_on_hand, 0) + NEW.qty);
        ELSE
            new_avg_cost := COALESCE(NEW.unit_cost, 0);
        END IF;
    ELSIF NEW.movement_type = 'OUT' THEN
        new_qty := COALESCE(current_balance.qty_on_hand, 0) - NEW.qty;
        new_avg_cost := COALESCE(current_balance.avg_cost, 0);
    ELSE -- ADJUST
        new_qty := NEW.qty;
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
