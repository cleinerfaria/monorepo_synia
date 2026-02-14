-- =============================================
-- Adicionar coluna prescription_order
-- =============================================

-- Adicionar coluna prescription_order à tabela administration_routes
ALTER TABLE administration_routes
ADD COLUMN prescription_order INTEGER DEFAULT 999;

-- Criar índice na coluna prescription_order para melhorar performance de ordenação
CREATE INDEX idx_administration_routes_prescription_order ON administration_routes(prescription_order);

-- Comentário da coluna
COMMENT ON COLUMN administration_routes.prescription_order IS 'Ordem de exibição na prescrição. Valores menores aparecem primeiro. Em caso de empate, ordenar alfabeticamente por nome.';
