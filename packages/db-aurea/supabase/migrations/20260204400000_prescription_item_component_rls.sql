-- =====================================================
-- PRESCRIPTION ITEM COMPONENT RLS & HOUR ENUM
-- Add RLS policies for prescription_item_component table
-- Add 'hour' to enum_prescription_times_unit
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ADD 'hour' TO enum_prescription_times_unit
-- =====================================================

-- Add 'hour' to the enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'hour' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_prescription_times_unit')
  ) THEN
    ALTER TYPE public.enum_prescription_times_unit ADD VALUE 'hour';
  END IF;
END $$;

-- =====================================================
-- 2. ENABLE RLS FOR prescription_item_component
-- =====================================================

-- Enable RLS on the table
ALTER TABLE public.prescription_item_component ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. CREATE RLS POLICIES FOR prescription_item_component
-- =====================================================

-- Policy for SELECT
CREATE POLICY "Users can view prescription item components in their company"
    ON public.prescription_item_component FOR SELECT
    USING (company_id = get_user_company_id());

-- Policy for INSERT
CREATE POLICY "Users can insert prescription item components in their company"
    ON public.prescription_item_component FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

-- Policy for UPDATE
CREATE POLICY "Users can update prescription item components in their company"
    ON public.prescription_item_component FOR UPDATE
    USING (company_id = get_user_company_id())
    WITH CHECK (company_id = get_user_company_id());

-- Policy for DELETE
CREATE POLICY "Users can delete prescription item components in their company"
    ON public.prescription_item_component FOR DELETE
    USING (company_id = get_user_company_id());

COMMIT;
