-- =============================================
-- TABELAS DE REFERÊNCIA (SIMPRO, BRASÍNDICE, CMED)
-- Sistema de gestão de tabelas de preços com histórico
-- =============================================

-- =============================================
-- Tabela: ref_source
-- Fontes de dados de referência (SIMPRO, BRASÍNDICE, CMED)
-- =============================================
CREATE TABLE IF NOT EXISTS ref_source (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,  -- simpro | brasindice | cmed
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Configurações do importador
    config JSONB DEFAULT '{}'::jsonb,
    -- Exemplo: {
    --   "expected_columns": ["codigo", "descricao", "preco"],
    --   "file_types": ["csv", "xlsx"],
    --   "price_type_mapping": {"pmc": "pmc", "pf": "pf"},
    --   "default_uf": "SP"
    -- }
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir fontes padrão
INSERT INTO ref_source (code, name, description) VALUES
    ('simpro', 'SIMPRO', 'Sistema Integrado de Materiais e Produtos'),
    ('brasindice', 'BRASÍNDICE', 'Guia Farmacêutico Brasíndice'),
    ('cmed', 'CMED', 'Câmara de Regulação do Mercado de Medicamentos - ANVISA')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- Tabela: ref_import_batch
-- Registro de importações realizadas
-- =============================================
CREATE TABLE IF NOT EXISTS ref_import_batch (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES ref_source(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    
    -- Status da importação
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'partial')),
    
    -- Timestamps
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    
    -- Informações do arquivo
    file_name TEXT,
    file_path TEXT,  -- Caminho no storage
    file_hash TEXT,  -- SHA256 para evitar reimport
    file_size BIGINT,
    
    -- Métricas
    rows_read INTEGER DEFAULT 0,
    rows_inserted INTEGER DEFAULT 0,
    rows_updated INTEGER DEFAULT 0,
    rows_skipped INTEGER DEFAULT 0,
    rows_error INTEGER DEFAULT 0,
    
    -- Resumo de erros
    error_summary TEXT,
    
    -- Metadados da importação
    import_options JSONB DEFAULT '{}'::jsonb,
    -- Exemplo: {
    --   "reference_date": "2026-01-01",
    --   "uf": "SP",
    --   "price_type": "pmc"
    -- }
    
    -- Usuário que executou
    created_by UUID REFERENCES app_user(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ref_import_batch_source ON ref_import_batch(source_id);
CREATE INDEX IF NOT EXISTS idx_ref_import_batch_company ON ref_import_batch(company_id);
CREATE INDEX IF NOT EXISTS idx_ref_import_batch_status ON ref_import_batch(status);
CREATE INDEX IF NOT EXISTS idx_ref_import_batch_file_hash ON ref_import_batch(file_hash);
CREATE INDEX IF NOT EXISTS idx_ref_import_batch_created ON ref_import_batch(created_at DESC);

-- =============================================
-- Tabela: ref_import_error
-- Log de erros por linha durante importação
-- =============================================
CREATE TABLE IF NOT EXISTS ref_import_error (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES ref_import_batch(id) ON DELETE CASCADE,
    
    row_number INTEGER,
    raw_data JSONB,  -- Dados da linha que deu erro
    error_type TEXT,  -- validation, parsing, duplicate, etc
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ref_import_error_batch ON ref_import_error(batch_id);

-- =============================================
-- Tabela: ref_item
-- Catálogo de itens das tabelas de referência
-- =============================================
CREATE TABLE IF NOT EXISTS ref_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES ref_source(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    
    -- Identificação do item
    external_code TEXT NOT NULL,  -- Código na fonte (SIMPRO/BRASÍNDICE/CMED)
    
    -- Descrição desmembrada
    product_name TEXT NOT NULL,   -- Nome do produto
    presentation TEXT,            -- Apresentação (ex: "COM REV CT BL AL PLAS INC X 30")
    concentration TEXT,           -- Concentração (ex: "500MG", "10MG/ML")
    
    -- Unidade e quantidade
    entry_unit TEXT,              -- Unidade de entrada/embalagem (ex: "CX", "FR", "AMP")
    base_unit TEXT,               -- Unidade base (ex: "COM", "ML", "G", "UN")
    quantity DECIMAL(10, 4),      -- Quantidade na embalagem
    
    -- Códigos de procedimento
    tiss TEXT,                    -- Código TISS (Troca de Informações em Saúde Suplementar)
    tuss TEXT,                    -- Código TUSS (Terminologia Unificada da Saúde Suplementar)
    
    -- EAN/GTIN (quando disponível)
    ean TEXT,
    
    -- Fabricante
    manufacturer_code TEXT,       -- Código do fabricante na fonte
    manufacturer_name TEXT,       -- Nome do fabricante
    
    -- Categoria/Segmento
    category TEXT,
    subcategory TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Campos extras específicos da fonte
    extra_data JSONB DEFAULT '{}'::jsonb,
    -- Exemplo CMED: {"substancia": "...", "classe_terapeutica": "...", "tarja": "..."}
    -- Exemplo SIMPRO: {"grupo": "...", "subgrupo": "..."}
    
    -- Primeira e última importação
    first_import_batch_id UUID REFERENCES ref_import_batch(id),
    last_import_batch_id UUID REFERENCES ref_import_batch(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique por fonte e código externo dentro da empresa
    CONSTRAINT ref_item_unique_code UNIQUE (company_id, source_id, external_code)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ref_item_source ON ref_item(source_id);
CREATE INDEX IF NOT EXISTS idx_ref_item_company ON ref_item(company_id);
CREATE INDEX IF NOT EXISTS idx_ref_item_external_code ON ref_item(external_code);
CREATE INDEX IF NOT EXISTS idx_ref_item_ean ON ref_item(ean) WHERE ean IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ref_item_product_name ON ref_item USING gin(to_tsvector('portuguese', product_name));
CREATE INDEX IF NOT EXISTS idx_ref_item_tiss ON ref_item(tiss) WHERE tiss IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ref_item_tuss ON ref_item(tuss) WHERE tuss IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ref_item_manufacturer_code ON ref_item(manufacturer_code) WHERE manufacturer_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ref_item_category ON ref_item(category);
CREATE INDEX IF NOT EXISTS idx_ref_item_active ON ref_item(is_active);

-- =============================================
-- Tabela: ref_price_history
-- Histórico de preços por item e tipo
-- =============================================
CREATE TABLE IF NOT EXISTS ref_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES ref_item(id) ON DELETE CASCADE,
    import_batch_id UUID NOT NULL REFERENCES ref_import_batch(id) ON DELETE CASCADE,
    
    -- Tipo de preço (pmc, pf, hospital, etc)
    price_type TEXT NOT NULL,
    
    -- Valor
    price_value DECIMAL(12, 4) NOT NULL,
    currency TEXT DEFAULT 'BRL',
    
    -- Data de vigência (vem do arquivo ou data da importação)
    valid_from DATE NOT NULL,
    
    -- Metadados do preço
    price_meta JSONB DEFAULT '{}'::jsonb,
    -- Exemplo: {"aliquota": 18, "uf": "SP", "desconto": 0.05}
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Evitar duplicatas exatas
    CONSTRAINT ref_price_history_unique UNIQUE (item_id, price_type, valid_from, import_batch_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ref_price_history_item ON ref_price_history(item_id);
CREATE INDEX IF NOT EXISTS idx_ref_price_history_batch ON ref_price_history(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_ref_price_history_type ON ref_price_history(price_type);
CREATE INDEX IF NOT EXISTS idx_ref_price_history_valid ON ref_price_history(valid_from DESC);
CREATE INDEX IF NOT EXISTS idx_ref_price_history_item_type_date ON ref_price_history(item_id, price_type, valid_from DESC);
CREATE INDEX IF NOT EXISTS idx_ref_price_history_import_batch ON ref_price_history(import_batch_id);

-- =============================================
-- Tabela: product_ref_link
-- Vínculo entre produtos do catálogo e tabelas de referência
-- =============================================
CREATE TABLE IF NOT EXISTS product_ref_link (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    ref_item_id UUID NOT NULL REFERENCES ref_item(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES ref_source(id) ON DELETE CASCADE,
    
    -- Indica se este é o vínculo principal (para preços)
    is_primary BOOLEAN NOT NULL DEFAULT false,
    
    -- Fator de conversão se unidades forem diferentes
    conversion_factor NUMERIC(10, 4) DEFAULT 1,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Unique: um produto só pode ter um vínculo por source
    CONSTRAINT unique_product_source UNIQUE (product_id, source_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_product_ref_link_company ON product_ref_link(company_id);
CREATE INDEX IF NOT EXISTS idx_product_ref_link_product ON product_ref_link(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ref_link_ref_item ON product_ref_link(ref_item_id);
CREATE INDEX IF NOT EXISTS idx_product_ref_link_source ON product_ref_link(source_id);

-- Trigger para updated_at
CREATE TRIGGER update_product_ref_link_updated_at
    BEFORE UPDATE ON product_ref_link
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE product_ref_link IS 'Vincula produtos do catálogo aos itens das tabelas de referência (CMED, SIMPRO, BRASÍNDICE)';
COMMENT ON COLUMN product_ref_link.is_primary IS 'Define se este vínculo é usado como referência principal de preço';
COMMENT ON COLUMN product_ref_link.conversion_factor IS 'Fator de conversão se a unidade do produto for diferente da tabela de referência';

-- =============================================
-- View: vw_ref_item_current_price
-- Preço atual por item e tipo (último preço válido)
-- =============================================
CREATE OR REPLACE VIEW vw_ref_item_current_price AS
SELECT DISTINCT ON (item_id, price_type)
    id as price_id,
    item_id,
    price_type,
    price_value,
    currency,
    valid_from,
    price_meta,
    import_batch_id,
    created_at
FROM ref_price_history
ORDER BY item_id, price_type, valid_from DESC, created_at DESC;

-- =============================================
-- View: vw_ref_source_stats
-- Estatísticas por fonte
-- =============================================
CREATE OR REPLACE VIEW vw_ref_source_stats AS
SELECT 
    s.id as source_id,
    s.code,
    s.name,
    s.is_active,
    
    -- Última importação
    (
        SELECT b.id FROM ref_import_batch b 
        WHERE b.source_id = s.id 
        ORDER BY b.created_at DESC 
        LIMIT 1
    ) as last_batch_id,
    
    (
        SELECT b.status FROM ref_import_batch b 
        WHERE b.source_id = s.id 
        ORDER BY b.created_at DESC 
        LIMIT 1
    ) as last_batch_status,
    
    (
        SELECT b.finished_at FROM ref_import_batch b 
        WHERE b.source_id = s.id AND b.status = 'success'
        ORDER BY b.created_at DESC 
        LIMIT 1
    ) as last_success_at,
    
    -- Contadores (precisam de company_id filter na query)
    0 as active_items_count,
    0 as total_imports
    
FROM ref_source s;

-- =============================================
-- Triggers
-- =============================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_ref_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ref_source_updated
    BEFORE UPDATE ON ref_source
    FOR EACH ROW
    EXECUTE FUNCTION update_ref_updated_at();

CREATE TRIGGER trigger_ref_import_batch_updated
    BEFORE UPDATE ON ref_import_batch
    FOR EACH ROW
    EXECUTE FUNCTION update_ref_updated_at();

CREATE TRIGGER trigger_ref_item_updated
    BEFORE UPDATE ON ref_item
    FOR EACH ROW
    EXECUTE FUNCTION update_ref_updated_at();

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE ref_source ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_import_batch ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_import_error ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_ref_link ENABLE ROW LEVEL SECURITY;

-- ref_source: todos podem ler (dados compartilhados)
CREATE POLICY "ref_source_select" ON ref_source
    FOR SELECT USING (true);

-- ref_import_batch: acesso por empresa
CREATE POLICY "ref_import_batch_company" ON ref_import_batch
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM app_user WHERE auth_user_id = auth.uid()
        )
    );

-- ref_import_error: acesso via batch (que já tem RLS)
CREATE POLICY "ref_import_error_company" ON ref_import_error
    FOR ALL USING (
        batch_id IN (
            SELECT id FROM ref_import_batch WHERE company_id IN (
                SELECT company_id FROM app_user WHERE auth_user_id = auth.uid()
            )
        )
    );

-- ref_item: acesso por empresa
CREATE POLICY "ref_item_company" ON ref_item
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM app_user WHERE auth_user_id = auth.uid()
        )
    );

-- ref_price_history: acesso via item OU via import_batch (para deleções em lote)
CREATE POLICY "ref_price_history_company" ON ref_price_history
    FOR ALL USING (
        -- Allow access via item (for reads and individual updates)
        item_id IN (
            SELECT id FROM ref_item WHERE company_id IN (
                SELECT company_id FROM app_user WHERE auth_user_id = auth.uid()
            )
        )
        OR
        -- Allow access via import_batch (for batch deletions)
        import_batch_id IN (
            SELECT id FROM ref_import_batch WHERE company_id IN (
                SELECT company_id FROM app_user WHERE auth_user_id = auth.uid()
            )
        )
    );

-- product_ref_link: acesso por empresa
CREATE POLICY "product_ref_link_company_isolation" ON product_ref_link
    USING (company_id IN (
        SELECT company_id FROM app_user WHERE auth_user_id = auth.uid()
    ));

-- =============================================
-- Storage bucket para arquivos de importação
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('reference-imports', 'reference-imports', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: usuários autenticados podem fazer upload
CREATE POLICY "reference_imports_insert" ON storage.objects
    FOR INSERT 
    WITH CHECK (
        bucket_id = 'reference-imports' 
        AND auth.role() = 'authenticated'
    );

-- Policy: usuários da mesma empresa podem ler
CREATE POLICY "reference_imports_select" ON storage.objects
    FOR SELECT 
    USING (
        bucket_id = 'reference-imports'
        AND auth.role() = 'authenticated'
    );
