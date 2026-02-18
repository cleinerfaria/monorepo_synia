-- =====================================================
-- Seed 07: Prescrições (prescription + prescription_item)
-- =====================================================

BEGIN;

DO $$
DECLARE
  v_company_id UUID;
  v_patient_id UUID;
  v_professional_id UUID;
  v_prescription_id UUID;
  v_product_ids UUID[];
  v_item_order INT := 1;
  v_product_id UUID;
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

  SELECT id INTO v_professional_id
  FROM public.professional
  WHERE company_id = v_company_id
    AND code = 'E2E-PRO-001'
  LIMIT 1;

  IF v_patient_id IS NULL OR v_professional_id IS NULL THEN
    RAISE EXCEPTION 'Dados base ausentes para seed de prescrição.';
  END IF;

  -- Buscar até 10 produtos de medicamento
  SELECT ARRAY_AGG(id) INTO v_product_ids
  FROM (
    SELECT id
    FROM public.product
    WHERE company_id = v_company_id
      AND item_type = 'medication'
    LIMIT 10
  ) subq;

  IF v_product_ids IS NULL OR ARRAY_LENGTH(v_product_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Nenhum produto de medicamento encontrado para seed de prescrição.';
  END IF;

  SELECT p.id INTO v_prescription_id
  FROM public.prescription p
  WHERE p.company_id = v_company_id
    AND p.patient_id = v_patient_id
    AND p.type = 'medical'
    AND p.start_date = DATE '2026-02-01'
    AND p.end_date IS NULL
  LIMIT 1;

  IF v_prescription_id IS NULL THEN
    INSERT INTO public.prescription
      (company_id, patient_id, professional_id, type, status, start_date, end_date, notes)
    VALUES
      (
        v_company_id,
        v_patient_id,
        v_professional_id,
        'medical',
        'active',
        DATE '2026-02-01',
        NULL,
        'Prescrição de exemplo para fluxo de desenvolvimento.'
      )
    RETURNING id INTO v_prescription_id;
  END IF;

  -- Inserir até 10 itens de prescrição
  FOR i IN 1..LEAST(ARRAY_LENGTH(v_product_ids, 1), 10) LOOP
    v_product_id := v_product_ids[i];
    v_item_order := i;

    IF NOT EXISTS (
      SELECT 1
      FROM public.prescription_item pi
      WHERE pi.company_id = v_company_id
        AND pi.prescription_id = v_prescription_id
        AND pi.item_type = 'medication'
        AND pi.product_id = v_product_id
        AND COALESCE(pi.item_order, 999) = v_item_order
    ) THEN
      INSERT INTO public.prescription_item
        (
          company_id,
          prescription_id,
          item_type,
          product_id,
          quantity,
          start_date,
          end_date,
          frequency_mode,
          interval_minutes,
          time_start,
          times_value,
          times_unit,
          time_checks,
          is_prn,
          is_continuous_use,
          instructions_use,
          instructions_pharmacy,
          week_days,
          supplier,
          is_active,
          item_order
        )
      VALUES
        (
          v_company_id,
          v_prescription_id,
          'medication',
          v_product_id,
          (1.0 + (i * 0.5))::numeric,
          DATE '2026-02-01',
          NULL,
          CASE
            WHEN i % 3 = 0 THEN 'times_per'
            WHEN i % 3 = 1 THEN 'interval'
            ELSE 'continuous'
          END,
          CASE WHEN i % 3 = 1 THEN (i * 120) ELSE NULL END,
          CASE WHEN i % 3 = 1 THEN '08:00:00'::time ELSE NULL END,
          CASE
            WHEN i % 3 = 0 THEN (2 + (i % 4))
            ELSE NULL
          END,
          CASE WHEN i % 3 = 0 THEN 'day' ELSE NULL END,
          CASE
            WHEN i % 3 = 0 THEN ARRAY_FILL('08:00:00'::time, ARRAY[2 + (i % 4)])
            ELSE NULL
          END,
          (i % 2 = 0),
          (i % 2 = 1),
          'Administrar conforme horários ou conforme necessário.',
          'Dispensar conforme protocolo. Item #' || v_item_order || '.',
          NULL,
          'company',
          TRUE,
          v_item_order
        );
    END IF;
  END LOOP;

  RAISE NOTICE 'Seed 07 applied: % prescrição items criados', LEAST(ARRAY_LENGTH(v_product_ids, 1), 10);
END $$;

COMMIT;
