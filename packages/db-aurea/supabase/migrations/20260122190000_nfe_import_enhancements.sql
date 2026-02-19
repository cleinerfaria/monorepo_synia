-- =====================================================
-- MIGRATION: Add product_code and ncm to nfe_import_item
-- =====================================================

-- Add product_code column to nfe_import_item
ALTER TABLE nfe_import_item 
ADD COLUMN IF NOT EXISTS product_code TEXT;

-- Add ncm column to nfe_import_item
ALTER TABLE nfe_import_item 
ADD COLUMN IF NOT EXISTS ncm TEXT;

-- Add total_value column to nfe_import (some systems use this field name)
ALTER TABLE nfe_import 
ADD COLUMN IF NOT EXISTS total_value DECIMAL(15, 4) DEFAULT 0;

-- Create index for faster product lookups
