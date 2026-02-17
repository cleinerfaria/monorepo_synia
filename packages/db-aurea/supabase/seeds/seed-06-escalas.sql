-- =====================================================
-- Seed 06: Escalas (pad_shift)
-- Depends on: seed-05-pad.sql
-- =====================================================

BEGIN;

DO $$
DECLARE
  v_company_id UUID;
  v_patient_id UUID;
  v_pad_item_id UUID;
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

  -- Buscar o pad_item tipo shift do PAD de exemplo
  SELECT pi.id INTO v_pad_item_id
  FROM public.pad_items pi
  JOIN public.pad p ON p.id = pi.pad_id
  WHERE pi.company_id = v_company_id
    AND pi.type = 'shift'
    AND p.patient_id = v_patient_id
    AND p.start_date = DATE '2026-02-01'
  LIMIT 1;

  IF v_pad_item_id IS NULL THEN
    RAISE EXCEPTION 'PAD item (shift) base não encontrado para seed de escala.';
  END IF;

  SELECT id INTO v_professional_id
  FROM public.professional
  WHERE company_id = v_company_id
    AND code = 'E2E-PRO-004'
  LIMIT 1;

  -- Turno 1 (12h diurno)
  IF NOT EXISTS (
    SELECT 1
    FROM public.pad_shift s
    WHERE s.company_id = v_company_id
      AND s.pad_item_id = v_pad_item_id
      AND s.start_at = TIMESTAMPTZ '2026-02-01 07:00:00-03'
      AND s.end_at = TIMESTAMPTZ '2026-02-01 19:00:00-03'
  ) THEN
    INSERT INTO public.pad_shift
      (company_id, patient_id, pad_item_id, start_at, end_at, status, assigned_professional_id)
    VALUES
      (
        v_company_id,
        v_patient_id,
        v_pad_item_id,
        TIMESTAMPTZ '2026-02-01 07:00:00-03',
        TIMESTAMPTZ '2026-02-01 19:00:00-03',
        'assigned',
        v_professional_id
      );
  END IF;

  -- Turno 2 (12h noturno)
  IF NOT EXISTS (
    SELECT 1
    FROM public.pad_shift s
    WHERE s.company_id = v_company_id
      AND s.pad_item_id = v_pad_item_id
      AND s.start_at = TIMESTAMPTZ '2026-02-01 19:00:00-03'
      AND s.end_at = TIMESTAMPTZ '2026-02-02 07:00:00-03'
  ) THEN
    INSERT INTO public.pad_shift
      (company_id, patient_id, pad_item_id, start_at, end_at, status, assigned_professional_id)
    VALUES
      (
        v_company_id,
        v_patient_id,
        v_pad_item_id,
        TIMESTAMPTZ '2026-02-01 19:00:00-03',
        TIMESTAMPTZ '2026-02-02 07:00:00-03',
        'planned',
        NULL
      );
  END IF;

  RAISE NOTICE 'Seed 06 applied: escalas';
END $$;

COMMIT;
