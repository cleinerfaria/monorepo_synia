-- =====================================================
-- PRESCRIPTION_ITEM: Remove presentation_id and add route_id
-- PROCEDURE: Add RLS policies
-- =====================================================

-- =====================================================
-- 1) PRESCRIPTION_ITEM ADJUSTMENTS
-- =====================================================

-- 1.1) Drop presentation_id column and its constraint
ALTER TABLE public.prescription_item
DROP COLUMN IF EXISTS presentation_id CASCADE;

-- 1.2) Add route_id column
ALTER TABLE public.prescription_item
ADD COLUMN IF NOT EXISTS route_id uuid NULL;

-- 1.3) Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prescription_item_route_id_fkey'
  ) THEN
    ALTER TABLE public.prescription_item
    ADD CONSTRAINT prescription_item_route_id_fkey
    FOREIGN KEY (route_id) REFERENCES public.administration_routes(id) ON DELETE SET NULL;
  END IF;
END$$;

-- 1.4) Create index on route_id
CREATE INDEX IF NOT EXISTS idx_prescription_item_route_id
ON public.prescription_item(route_id);

-- 1.5) Add comment
COMMENT ON COLUMN public.prescription_item.route_id IS
  'Via de administração para o item de prescrição (ex: via oral, intravenosa, etc)';
