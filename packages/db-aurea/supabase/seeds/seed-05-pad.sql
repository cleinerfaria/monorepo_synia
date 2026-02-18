-- =====================================================
-- Seed 05: PAD + PAD Items
-- =====================================================

BEGIN;

DO $$
DECLARE
  v_company_id UUID;
  v_patient_id UUID;
  v_pad_id UUID;
  v_profession_id UUID;
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

  -- Criar PAD (sem hours_per_day e is_split)
  IF NOT EXISTS (
    SELECT 1
    FROM public.pad p
    WHERE p.company_id = v_company_id
      AND p.patient_id = v_patient_id
      AND p.start_date = DATE '2026-02-01'
      AND p.start_time = TIME '07:00:00'
  ) THEN
    INSERT INTO public.pad
      (company_id, patient_id, start_date, end_date, start_time, is_active, notes)
    VALUES
      (
        v_company_id,
        v_patient_id,
        DATE '2026-02-01',
        NULL,
        TIME '07:00:00',
        TRUE,
        'PAD de exemplo com itens de plantão, visita e sessão.'
      )
    RETURNING id INTO v_pad_id;
  ELSE
    SELECT id INTO v_pad_id
    FROM public.pad
    WHERE company_id = v_company_id
      AND patient_id = v_patient_id
      AND start_date = DATE '2026-02-01'
      AND start_time = TIME '07:00:00'
    LIMIT 1;
  END IF;

  -- Item 1: Plantão (shift) - Técnico de Enfermagem, 24h em turnos de 12h
  SELECT id INTO v_profession_id
  FROM public.profession
  WHERE company_id = v_company_id
    AND LOWER(name) LIKE '%cnic%enferm%'
    AND is_active = true
  LIMIT 1;

  IF v_profession_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.pad_items
    WHERE pad_id = v_pad_id AND type = 'shift'
  ) THEN
    INSERT INTO public.pad_items
      (pad_id, company_id, type, profession_id, hours_per_day, shift_duration_hours, notes)
    VALUES
      (v_pad_id, v_company_id, 'shift', v_profession_id, 24, 12, 'Plantão 24h em turnos de 12h');
  END IF;

  -- Item 2: Visita médica - mensal, 1x
  SELECT id INTO v_profession_id
  FROM public.profession
  WHERE company_id = v_company_id
    AND LOWER(name) = 'médico'
    AND is_active = true
  LIMIT 1;

  IF v_profession_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.pad_items
    WHERE pad_id = v_pad_id AND type = 'visit'
  ) THEN
    INSERT INTO public.pad_items
      (pad_id, company_id, type, profession_id, frequency, quantity, notes)
    VALUES
      (v_pad_id, v_company_id, 'visit', v_profession_id, 'monthly', 1, 'Visita médica mensal');
  END IF;

  -- Item 3: Sessão de fisioterapia - semanal, 3x
  SELECT id INTO v_profession_id
  FROM public.profession
  WHERE company_id = v_company_id
    AND LOWER(name) = 'fisioterapeuta'
    AND is_active = true
  LIMIT 1;

  IF v_profession_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.pad_items
    WHERE pad_id = v_pad_id AND type = 'session'
  ) THEN
    INSERT INTO public.pad_items
      (pad_id, company_id, type, profession_id, frequency, quantity, notes)
    VALUES
      (v_pad_id, v_company_id, 'session', v_profession_id, 'weekly', 3, 'Fisioterapia 3x por semana');
  END IF;

  RAISE NOTICE 'Seed 05 applied: PAD + PAD Items';
END $$;

COMMIT;
