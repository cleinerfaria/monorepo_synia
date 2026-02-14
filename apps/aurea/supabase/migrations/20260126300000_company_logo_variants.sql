-- =====================================================
-- ADICIONA VARIANTES DE LOGO PARA EMPRESAS
-- =====================================================
-- A tabela company precisa de logos separados para:
-- - logo_url_expanded: Logo completa para menu expandido
-- - logo_url_collapsed: Logo reduzida/ícone para menu colapsado

-- Adicionar colunas de variantes de logo
ALTER TABLE company 
ADD COLUMN IF NOT EXISTS logo_url_expanded TEXT,
ADD COLUMN IF NOT EXISTS logo_url_collapsed TEXT;

-- Migrar dados da coluna antiga para a nova (se houver)
UPDATE company SET logo_url_expanded = logo_url WHERE logo_url IS NOT NULL AND logo_url_expanded IS NULL;

-- Remover coluna antiga logo_url
ALTER TABLE company DROP COLUMN IF EXISTS logo_url;

-- Comentários nas colunas
COMMENT ON COLUMN company.logo_url_expanded IS 'Logo completa para exibição em áreas amplas (menu expandido)';
COMMENT ON COLUMN company.logo_url_collapsed IS 'Logo reduzida/ícone para exibição em áreas compactas (menu colapsado)';
