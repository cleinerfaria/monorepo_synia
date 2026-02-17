-- =====================================================
-- Seed 05: PAD (patient_attendance_demand)
-- =====================================================

BEGIN;

DO $$
DECLARE
  v_company_id UUID;
  v_patient_id UUID;
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

  IF v_patient_id IS NULL THEN
    RAISE EXCEPTION 'Paciente base não encontrado para seed de PAD.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.patient_attendance_demand pad
    WHERE pad.company_id = v_company_id
      AND pad.patient_id = v_patient_id
      AND pad.start_date = DATE '2026-02-01'
      AND pad.hours_per_day = 12
      AND pad.start_time = TIME '07:00:00'
      AND pad.is_split = TRUE
  ) THEN
    INSERT INTO public.patient_attendance_demand
      (company_id, patient_id, start_date, end_date, hours_per_day, start_time, is_split, is_active, notes)
    VALUES
      (
        v_company_id,
        v_patient_id,
        DATE '2026-02-01',
        NULL,
        12,
        TIME '07:00:00',
        TRUE,
        TRUE,
        'PAD de exemplo para escala 12x12.'
      );
  END IF;

  RAISE NOTICE 'Seed 05 applied: PAD';
END $$;

COMMIT;
