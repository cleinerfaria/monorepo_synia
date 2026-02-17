-- ============================================
-- Migration: Remove manufacturer_id from product table
--            Remove is_purchase_unit, is_dispensing_unit, is_prescription_unit from presentation
-- Description: Move manufacturer association from product to presentation level
--              Remove unit type flags from presentations (no longer needed)
-- ============================================

-- First, migrate existing manufacturer_id from product to their presentations (if any)
-- This preserves the data by copying manufacturer_id to presentations that don't have one
UPDATE product_presentation pp
SET manufacturer_id = p.manufacturer_id
FROM product p
WHERE pp.product_id = p.id
  AND p.manufacturer_id IS NOT NULL
  AND pp.manufacturer_id IS NULL;

-- Remove the manufacturer_id column from product table
ALTER TABLE product DROP COLUMN IF EXISTS manufacturer_id;

-- Remove unit type flags from product_presentation table
ALTER TABLE product_presentation DROP COLUMN IF EXISTS is_purchase_unit;
ALTER TABLE product_presentation DROP COLUMN IF EXISTS is_dispensing_unit;
ALTER TABLE product_presentation DROP COLUMN IF EXISTS is_prescription_unit;
