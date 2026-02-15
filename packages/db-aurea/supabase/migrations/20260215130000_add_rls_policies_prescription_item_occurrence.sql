-- =====================================================
-- MIGRATION: Add RLS Policies for prescription_item_occurrence
-- 
-- Define políticas de segurança para controlar acesso
-- aos dados de ocorrências de prescrição por tenant (company_id)
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Safe RLS policies using LATERAL subqueries
--    to avoid infinite recursion and maintain performance
-- =====================================================

-- SELECT: Users can view prescription_item_occurrence records from their company
CREATE POLICY "prescription_item_occurrence_select_policy" 
  ON public.prescription_item_occurrence
  FOR SELECT 
  USING (
    company_id = (
      SELECT get_user_company_id()
    )
  );

-- INSERT: Users can create prescription_item_occurrence records for their company
CREATE POLICY "prescription_item_occurrence_insert_policy" 
  ON public.prescription_item_occurrence
  FOR INSERT 
  WITH CHECK (
    company_id = (
      SELECT get_user_company_id()
    )
  );

-- UPDATE: Users can update prescription_item_occurrence records from their company
CREATE POLICY "prescription_item_occurrence_update_policy" 
  ON public.prescription_item_occurrence
  FOR UPDATE 
  USING (
    company_id = (
      SELECT get_user_company_id()
    )
  );

-- DELETE: Users can delete prescription_item_occurrence records from their company
CREATE POLICY "prescription_item_occurrence_delete_policy" 
  ON public.prescription_item_occurrence
  FOR DELETE 
  USING (
    company_id = (
      SELECT get_user_company_id()
    )
  );

COMMIT;
