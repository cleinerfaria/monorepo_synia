-- =====================================================
-- MIGRATION: Add EAN barcode to nfe_import_item
-- Enables automatic product linking via barcode/EAN
-- =====================================================

-- Add EAN column to nfe_import_item
ALTER TABLE nfe_import_item 
ADD COLUMN IF NOT EXISTS ean TEXT;

-- Add presentation_id for automatic linking
-- (Already exists from previous migration, but ensure it's there)
ALTER TABLE nfe_import_item 
ADD COLUMN IF NOT EXISTS presentation_id UUID REFERENCES product_presentation(id) ON DELETE SET NULL;

-- Add ANVISA code for medications
ALTER TABLE nfe_import_item 
ADD COLUMN IF NOT EXISTS anvisa_code TEXT;

-- Add PMC price (maximum consumer price)
ALTER TABLE nfe_import_item 
ADD COLUMN IF NOT EXISTS pmc_price DECIMAL(15, 4);

-- Create index for faster EAN lookups
CREATE INDEX IF NOT EXISTS idx_nfe_import_item_ean 
ON nfe_import_item(ean);

-- Create index for faster presentation lookups
CREATE INDEX IF NOT EXISTS idx_nfe_import_item_presentation 
ON nfe_import_item(presentation_id);

-- Add presentation_id to stock_batch for traceability
ALTER TABLE stock_batch
ADD COLUMN IF NOT EXISTS presentation_id UUID REFERENCES product_presentation(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_batch_presentation
ON stock_batch(presentation_id);

COMMENT ON COLUMN nfe_import_item.ean IS 'EAN/Barcode do produto (código de barras)';
COMMENT ON COLUMN nfe_import_item.presentation_id IS 'Apresentação vinculada automaticamente via EAN';
COMMENT ON COLUMN nfe_import_item.anvisa_code IS 'Código ANVISA do medicamento';
COMMENT ON COLUMN nfe_import_item.pmc_price IS 'PMC - Preço Máximo ao Consumidor';
COMMENT ON COLUMN stock_batch.presentation_id IS 'Apresentação do produto para rastreabilidade';
