-- Migration 20260209170000_prescription_type_not_null_and_counter_rls.sql
-- Enforce prescription.type NOT NULL and add RLS to prescription_print_counter.

BEGIN;

-- Ensure no NULL types before enforcing NOT NULL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.prescription WHERE type IS NULL) THEN
    RAISE EXCEPTION 'prescription.type still contains NULL; fix data before applying NOT NULL.';
  END IF;
END;
$$;

ALTER TABLE public.prescription
  ALTER COLUMN type SET NOT NULL;

-- RLS for prescription_print_counter
ALTER TABLE public.prescription_print_counter ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.prescription_print_counter FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescription_print_counter TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prescription_print_counter' AND policyname = 'Users can view prescription print counters in their company') THEN
    EXECUTE 'DROP POLICY "Users can view prescription print counters in their company" ON public.prescription_print_counter';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prescription_print_counter' AND policyname = 'Users can insert prescription print counters in their company') THEN
    EXECUTE 'DROP POLICY "Users can insert prescription print counters in their company" ON public.prescription_print_counter';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prescription_print_counter' AND policyname = 'Users can update prescription print counters in their company') THEN
    EXECUTE 'DROP POLICY "Users can update prescription print counters in their company" ON public.prescription_print_counter';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prescription_print_counter' AND policyname = 'Users can delete prescription print counters in their company') THEN
    EXECUTE 'DROP POLICY "Users can delete prescription print counters in their company" ON public.prescription_print_counter';
  END IF;
END $$;

CREATE POLICY "Users can view prescription print counters in their company"
  ON public.prescription_print_counter
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert prescription print counters in their company"
  ON public.prescription_print_counter
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can update prescription print counters in their company"
  ON public.prescription_print_counter
  FOR UPDATE
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can delete prescription print counters in their company"
  ON public.prescription_print_counter
  FOR DELETE
  USING (company_id = public.get_user_company_id());

COMMIT;
