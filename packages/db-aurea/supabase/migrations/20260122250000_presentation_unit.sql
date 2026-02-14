-- =====================================================
-- ÁUREA CARE - Adicionar unidade à apresentação
-- =====================================================

-- Adiciona campo de unidade à apresentação
ALTER TABLE product_presentation 
ADD COLUMN IF NOT EXISTS unit TEXT;

COMMENT ON COLUMN product_presentation.unit IS 'Código da unidade da apresentação (ex: CX, BL, FR)';

-- Índice para buscas por unidade
CREATE INDEX IF NOT EXISTS idx_presentation_unit ON product_presentation(unit);
