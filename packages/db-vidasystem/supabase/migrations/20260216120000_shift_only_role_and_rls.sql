BEGIN;

-- =====================================================
-- PARTE 1: RLS para professional_user
-- =====================================================
ALTER TABLE public.professional_user ENABLE ROW LEVEL SECURITY;

CREATE POLICY "professional_user_select_policy"
  ON public.professional_user
  FOR SELECT
  USING (
    company_id = (SELECT get_user_company_id())
  );

CREATE POLICY "professional_user_insert_policy"
  ON public.professional_user
  FOR INSERT
  WITH CHECK (
    company_id = (SELECT get_user_company_id())
  );

CREATE POLICY "professional_user_update_policy"
  ON public.professional_user
  FOR UPDATE
  USING (
    company_id = (SELECT get_user_company_id())
  );

CREATE POLICY "professional_user_delete_policy"
  ON public.professional_user
  FOR DELETE
  USING (
    company_id = (SELECT get_user_company_id())
  );

-- =====================================================
-- PARTE 2: RLS para patient_attendance_demand
-- =====================================================
ALTER TABLE public.patient_attendance_demand ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patient_attendance_demand_select_policy"
  ON public.patient_attendance_demand
  FOR SELECT
  USING (
    company_id = (SELECT get_user_company_id())
  );

CREATE POLICY "patient_attendance_demand_insert_policy"
  ON public.patient_attendance_demand
  FOR INSERT
  WITH CHECK (
    company_id = (SELECT get_user_company_id())
  );

CREATE POLICY "patient_attendance_demand_update_policy"
  ON public.patient_attendance_demand
  FOR UPDATE
  USING (
    company_id = (SELECT get_user_company_id())
  );

CREATE POLICY "patient_attendance_demand_delete_policy"
  ON public.patient_attendance_demand
  FOR DELETE
  USING (
    company_id = (SELECT get_user_company_id())
  );

-- =====================================================
-- PARTE 3: RLS para patient_attendance_shift
-- =====================================================
ALTER TABLE public.patient_attendance_shift ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patient_attendance_shift_select_policy"
  ON public.patient_attendance_shift
  FOR SELECT
  USING (
    company_id = (SELECT get_user_company_id())
  );

CREATE POLICY "patient_attendance_shift_insert_policy"
  ON public.patient_attendance_shift
  FOR INSERT
  WITH CHECK (
    company_id = (SELECT get_user_company_id())
  );

CREATE POLICY "patient_attendance_shift_update_policy"
  ON public.patient_attendance_shift
  FOR UPDATE
  USING (
    company_id = (SELECT get_user_company_id())
  );

CREATE POLICY "patient_attendance_shift_delete_policy"
  ON public.patient_attendance_shift
  FOR DELETE
  USING (
    company_id = (SELECT get_user_company_id())
  );

-- =====================================================
-- PARTE 4: RLS para patient_attendance_event
-- =====================================================
ALTER TABLE public.patient_attendance_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patient_attendance_event_select_policy"
  ON public.patient_attendance_event
  FOR SELECT
  USING (
    company_id = (SELECT get_user_company_id())
  );

CREATE POLICY "patient_attendance_event_insert_policy"
  ON public.patient_attendance_event
  FOR INSERT
  WITH CHECK (
    company_id = (SELECT get_user_company_id())
  );

CREATE POLICY "patient_attendance_event_update_policy"
  ON public.patient_attendance_event
  FOR UPDATE
  USING (
    company_id = (SELECT get_user_company_id())
  );

CREATE POLICY "patient_attendance_event_delete_policy"
  ON public.patient_attendance_event
  FOR DELETE
  USING (
    company_id = (SELECT get_user_company_id())
  );

COMMIT;
