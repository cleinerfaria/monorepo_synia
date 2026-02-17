-- =====================================================
-- Convert product.item_type from CHECK constraint to ENUM
-- =====================================================

-- 1) Create ENUM if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_product_item_type') THEN
    CREATE TYPE public.enum_product_item_type AS ENUM (
      'medication',
      'material',
      'diet'
    );
  END IF;
END$$;

-- 2) Drop the CHECK constraint on product.item_type
ALTER TABLE public.product
DROP CONSTRAINT IF EXISTS product_item_type_check;

-- 3) Convert the column to ENUM type
ALTER TABLE public.product
ALTER COLUMN item_type TYPE public.enum_product_item_type
USING (item_type::text::public.enum_product_item_type);
