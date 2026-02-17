-- =====================================================
-- Seed 06: Escalas (patient_attendance_shift)
-- Depends on: seed-05-pad.sql
-- =====================================================

BEGIN;

DO $$
DECLARE
  v_company_id UUID;
  v_patient_id UUID;
  v_pad_id UUID;
  v_professional_id UUID;
BEGIN
  SELECT id INTO v_company_id
  FROM public.company
  WHERE document = '00.000.000/0001-00'
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Empresa inicial não encontrada. Execute migrations primeiro.';
  END IF;

  SELECT id INTO v_patient_id
  FROM public.patient
  WHERE company_id = v_company_id
    AND code = 'E2E-PAT-001'
  LIMIT 1;

  SELECT id INTO v_pad_id
  FROM public.patient_attendance_demand
  WHERE company_id = v_company_id
    AND patient_id = v_patient_id
    AND start_date = DATE '2026-02-01'
    AND hours_per_day = 12
    AND start_time = TIME '07:00:00'
    AND is_split = TRUE
  LIMIT 1;

  IF v_pad_id IS NULL THEN
    RAISE EXCEPTION 'PAD base não encontrado para seed de escala.';
  END IF;

  SELECT id INTO v_professional_id
  FROM public.professional
  WHERE company_id = v_company_id
    AND code = 'E2E-PRO-004'
  LIMIT 1;

  -- Turno 1 (12h)
  IF NOT EXISTS (
    SELECT 1
    FROM public.patient_attendance_shift s
    WHERE s.company_id = v_company_id
      AND s.patient_attendance_demand_id = v_pad_id
      AND s.start_at = TIMESTAMPTZ '2026-02-01 07:00:00-03'
      AND s.end_at = TIMESTAMPTZ '2026-02-01 19:00:00-03'
  ) THEN
    INSERT INTO public.patient_attendance_shift
      (company_id, patient_id, patient_attendance_demand_id, start_at, end_at, status, assigned_professional_id)
    VALUES
      (
        v_company_id,
        v_patient_id,
        v_pad_id,
        TIMESTAMPTZ '2026-02-01 07:00:00-03',
        TIMESTAMPTZ '2026-02-01 19:00:00-03',
        'assigned',
        v_professional_id
      );
  END IF;

  -- Turno 2 (12h)
  IF NOT EXISTS (
    SELECT 1
    FROM public.patient_attendance_shift s
    WHERE s.company_id = v_company_id
      AND s.patient_attendance_demand_id = v_pad_id
      AND s.start_at = TIMESTAMPTZ '2026-02-01 19:00:00-03'
      AND s.end_at = TIMESTAMPTZ '2026-02-02 07:00:00-03'
  ) THEN
    INSERT INTO public.patient_attendance_shift
      (company_id, patient_id, patient_attendance_demand_id, start_at, end_at, status, assigned_professional_id)
    VALUES
      (
        v_company_id,
        v_patient_id,
        v_pad_id,
        TIMESTAMPTZ '2026-02-01 19:00:00-03',
        TIMESTAMPTZ '2026-02-02 07:00:00-03',
        'planned',
        NULL
      );
  END IF;

  RAISE NOTICE 'Seed 06 applied: escalas';
END $$;

COMMIT;
