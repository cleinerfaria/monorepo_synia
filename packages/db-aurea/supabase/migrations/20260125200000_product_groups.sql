-- =====================================================
-- GRUPOS DE PRODUTOS
-- Permite categorizar produtos em grupos personalizados
-- =====================================================

-- Tabela de grupos de produtos
CREATE TABLE product_group (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES company(id) ON DELETE CASCADE, -- NULL = grupo global/sistema
    code TEXT, -- Código do grupo (ex: "MED", "MAT", "DIET")
    name TEXT NOT NULL, -- Nome do grupo (ex: "Medicamentos Controlados")
    description TEXT, -- Descrição opcional
    parent_id UUID REFERENCES product_group(id) ON DELETE SET NULL, -- Permite hierarquia de grupos
    color TEXT, -- Cor para exibição (hex, ex: "#FF5733")
    icon TEXT, -- Ícone opcional (nome do ícone)
    sort_order INTEGER DEFAULT 0, -- Ordem de exibição
    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE, -- Grupo de sistema (não pode ser excluído)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_product_group_company ON product_group(company_id);
CREATE INDEX idx_product_group_parent ON product_group(parent_id);
CREATE INDEX idx_product_group_active ON product_group(is_active) WHERE is_active = TRUE;
CREATE UNIQUE INDEX idx_product_group_code_unique ON product_group(company_id, code) WHERE code IS NOT NULL;

-- Adicionar coluna group_id na tabela product
ALTER TABLE product ADD COLUMN group_id UUID REFERENCES product_group(id) ON DELETE SET NULL;

-- Índice para a nova coluna
CREATE INDEX idx_product_group ON product(group_id);

-- RLS para product_group
ALTER TABLE product_group ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem ver grupos globais (company_id IS NULL) e da sua empresa
CREATE POLICY "Users can view global and company groups"
    ON product_group FOR SELECT
    USING (
        company_id IS NULL 
        OR company_id IN (
            SELECT company_id FROM app_user WHERE auth_user_id = auth.uid()
        )
    );

-- Política: usuários podem inserir grupos na sua empresa
CREATE POLICY "Users can insert groups in their company"
    ON product_group FOR INSERT
    WITH CHECK (
        company_id IS NOT NULL
        AND company_id IN (
            SELECT company_id FROM app_user WHERE auth_user_id = auth.uid()
        )
    );

-- Política: usuários podem atualizar grupos da sua empresa (não grupos de sistema)
CREATE POLICY "Users can update company groups"
    ON product_group FOR UPDATE
    USING (
        company_id IS NOT NULL
        AND is_system = FALSE
        AND company_id IN (
            SELECT company_id FROM app_user WHERE auth_user_id = auth.uid()
        )
    );

-- Política: usuários podem excluir grupos da sua empresa (não grupos de sistema)
CREATE POLICY "Users can delete company groups"
    ON product_group FOR DELETE
    USING (
        company_id IS NOT NULL
        AND is_system = FALSE
        AND company_id IN (
            SELECT company_id FROM app_user WHERE auth_user_id = auth.uid()
        )
    );

-- =====================================================
-- SEED: Grupos padrão do sistema (opcionais)
-- =====================================================

-- Grupos globais de exemplo (podem ser usados por todas as empresas)
INSERT INTO product_group (company_id, code, name, description, color, sort_order, is_system) VALUES
    (NULL, '1', 'ALTO CUSTO', 'Medicamentos de alto custo', '#EC4899', 1, TRUE),
    (NULL, '2', 'ANTIBIOTICOS', 'Antimicrobianos sujeitos a prescrição', '#F59E0B', 2, TRUE),
    (NULL, '3', 'CONTROLADOS', 'Medicamentos sujeitos a controle especial (portaria 344/98)', '#DC2626', 3, TRUE),
    (NULL, '4', 'DIVERSOS', 'Outros produtos não categorizados', '#6B7280', 4, TRUE),
    (NULL, '5', 'MATERIAIS', 'Materiais médicos e hospitalares', '#9CA3AF', 5, TRUE),
    (NULL, '6', 'NUTRIÇÃO', 'Dietas enterais e suplementos nutricionais', '#10B981', 6, TRUE),
    (NULL, '7', 'ONCOLÓGICOS', 'Medicamentos para tratamento oncológico', '#EF4444', 7, TRUE),
    (NULL, '8', 'OXIGENOTERAPIA', 'Equipamentos e insumos para oxigenoterapia', '#06B6D4', 8, TRUE),
    (NULL, '9', 'REFRIGERADOS', 'Produtos que necessitam de refrigeração (2-8°C)', '#3B82F6', 9, TRUE),
    (NULL, '10', 'TERMOLÁBEIS', 'Produtos sensíveis à temperatura', '#8B5CF6', 10, TRUE);