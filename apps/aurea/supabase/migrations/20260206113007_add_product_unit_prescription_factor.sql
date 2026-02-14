-- =====================================================
-- ÁUREA CARE - Fator de conversão para unidade de prescrição
-- Adiciona o fator da unidade base -> unidade de prescrição no cadastro de produtos
-- =====================================================

ALTER TABLE product
ADD COLUMN unit_prescription_factor DECIMAL(15, 6) NOT NULL DEFAULT 1;

COMMENT ON COLUMN product.unit_prescription_factor IS
  'Fator de conversão da unidade base para a unidade de prescrição (1 base = X prescrição)';
