-- =====================================================
-- Seed 06: Escalas (pad_shift)
-- Depends on: seed-05-pad.sql
--
-- Gera 20 dias de escala com 4 profissionais alternando:
--   Dias impares: PRO-004 (diurno 07-19) + PRO-005 (noturno 19-07)
--   Dias pares:   PRO-006 (diurno 07-19) + PRO-007 (noturno 19-07)
-- =====================================================

BEGIN;

DO $$
DECLARE
  v_company_id UUID;
  v_patient_id UUID;
  v_pad_item_id UUID;
  v_pro_004 UUID;
  v_pro_005 UUID;
  v_pro_006 UUID;
  v_pro_007 UUID;
  v_first_day DATE := date_trunc('month', CURRENT_DATE)::DATE;
  v_current_day DATE;
  v_day_pro UUID;
  v_night_pro UUID;
  v_start_day TIMESTAMPTZ;
  v_end_day TIMESTAMPTZ;
  v_start_night TIMESTAMPTZ;
  v_end_night TIMESTAMPTZ;
  i INT;
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
    AND p.start_date = v_first_day
  LIMIT 1;

  IF v_pad_item_id IS NULL THEN
    RAISE EXCEPTION 'PAD item (shift) base não encontrado para seed de escala.';
  END IF;

  -- Buscar os 4 profissionais
  SELECT id INTO v_pro_004 FROM public.professional WHERE company_id = v_company_id AND code = 'E2E-PRO-004' LIMIT 1;
  SELECT id INTO v_pro_005 FROM public.professional WHERE company_id = v_company_id AND code = 'E2E-PRO-005' LIMIT 1;
  SELECT id INTO v_pro_006 FROM public.professional WHERE company_id = v_company_id AND code = 'E2E-PRO-006' LIMIT 1;
  SELECT id INTO v_pro_007 FROM public.professional WHERE company_id = v_company_id AND code = 'E2E-PRO-007' LIMIT 1;

  IF v_pro_004 IS NULL OR v_pro_005 IS NULL OR v_pro_006 IS NULL OR v_pro_007 IS NULL THEN
    RAISE EXCEPTION 'Um ou mais profissionais (E2E-PRO-004..007) não encontrados.';
  END IF;

  -- Gerar 20 dias de escala
  FOR i IN 0..19 LOOP
    v_current_day := v_first_day + i;

    -- Dias impares (1, 3, 5...): PRO-004 diurno, PRO-005 noturno
    -- Dias pares  (2, 4, 6...): PRO-006 diurno, PRO-007 noturno
    IF (i % 2) = 0 THEN
      v_day_pro   := v_pro_004;
      v_night_pro := v_pro_005;
    ELSE
      v_day_pro   := v_pro_006;
      v_night_pro := v_pro_007;
    END IF;

    v_start_day   := (v_current_day + TIME '07:00:00') AT TIME ZONE 'America/Sao_Paulo';
    v_end_day     := (v_current_day + TIME '19:00:00') AT TIME ZONE 'America/Sao_Paulo';
    v_start_night := (v_current_day + TIME '19:00:00') AT TIME ZONE 'America/Sao_Paulo';
    v_end_night   := (v_current_day + INTERVAL '1 day' + TIME '07:00:00') AT TIME ZONE 'America/Sao_Paulo';

    -- Turno diurno (07:00 - 19:00)
    IF NOT EXISTS (
      SELECT 1 FROM public.pad_shift s
      WHERE s.company_id = v_company_id
        AND s.pad_item_id = v_pad_item_id
        AND s.start_at = v_start_day
        AND s.end_at = v_end_day
    ) THEN
      INSERT INTO public.pad_shift
        (company_id, patient_id, pad_item_id, start_at, end_at, status, assigned_professional_id)
      VALUES
        (v_company_id, v_patient_id, v_pad_item_id, v_start_day, v_end_day, 'assigned', v_day_pro);
    END IF;

    -- Turno noturno (19:00 - 07:00 do dia seguinte)
    IF NOT EXISTS (
      SELECT 1 FROM public.pad_shift s
      WHERE s.company_id = v_company_id
        AND s.pad_item_id = v_pad_item_id
        AND s.start_at = v_start_night
        AND s.end_at = v_end_night
    ) THEN
      INSERT INTO public.pad_shift
        (company_id, patient_id, pad_item_id, start_at, end_at, status, assigned_professional_id)
      VALUES
        (v_company_id, v_patient_id, v_pad_item_id, v_start_night, v_end_night, 'assigned', v_night_pro);
    END IF;

  END LOOP;

  RAISE NOTICE 'Seed 06 applied: 40 turnos (20 dias x 2 turnos) com 4 profissionais alternando';
END $$;

COMMIT;
