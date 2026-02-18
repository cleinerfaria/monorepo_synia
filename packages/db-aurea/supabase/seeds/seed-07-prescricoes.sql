-- =====================================================
-- Seed 07: Prescrições (prescription + prescription_item)
-- =====================================================

BEGIN;

DO $$
DECLARE
  v_company_id      UUID;
  v_patient_id      UUID;
  v_professional_id UUID;
  v_prescription_id UUID;
  v_product_ids     UUID[];
  v_route_vo        UUID;
  v_route_ev        UUID;
  v_route_im        UUID;
  v_route_sc        UUID;
  v_route_gtm        UUID;
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

  SELECT ARRAY_AGG(id) INTO v_product_ids
  FROM (
    SELECT id FROM public.product
    WHERE company_id = v_company_id AND item_type = 'medication'
    LIMIT 10
  ) subq;

  IF v_product_ids IS NULL OR ARRAY_LENGTH(v_product_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Nenhum produto de medicamento encontrado para seed de prescrição.';
  END IF;

  -- Buscar vias de administração
  SELECT id INTO v_route_vo FROM public.administration_routes WHERE company_id = v_company_id AND abbreviation = 'VO' LIMIT 1;
  SELECT id INTO v_route_ev FROM public.administration_routes WHERE company_id = v_company_id AND abbreviation = 'EV' LIMIT 1;
  SELECT id INTO v_route_im FROM public.administration_routes WHERE company_id = v_company_id AND abbreviation = 'IM' LIMIT 1;
  SELECT id INTO v_route_sc FROM public.administration_routes WHERE company_id = v_company_id AND abbreviation = 'SC' LIMIT 1;
  SELECT id INTO v_route_gtm FROM public.administration_routes WHERE company_id = v_company_id AND abbreviation = 'GTM' LIMIT 1;

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
      (v_company_id, v_patient_id, v_professional_id, 'medical', 'active', DATE '2026-02-01', NULL, 'Prescrição de exemplo para fluxo de desenvolvimento.')
    RETURNING id INTO v_prescription_id;
  END IF;

  -- Item 1 — VO, com data inicial e final
  IF NOT EXISTS (SELECT 1 FROM public.prescription_item WHERE company_id = v_company_id AND prescription_id = v_prescription_id AND product_id = v_product_ids[1] AND COALESCE(item_order, 999) = 1) THEN
    INSERT INTO public.prescription_item (company_id, prescription_id, item_type, product_id, quantity, start_date, end_date, frequency_mode, interval_minutes, time_start, times_value, times_unit, time_checks, is_prn, is_continuous_use, instructions_use, instructions_pharmacy, week_days, supplier, is_active, item_order, route_id)
    VALUES (v_company_id, v_prescription_id, 'medication', v_product_ids[1], 1, DATE '2026-02-01', DATE '2026-03-01', 'every', 120, '08:00:00', 2, 'hour', NULL, FALSE, TRUE, 'Administrar conforme horários ou conforme necessário.', 'Dispensar conforme protocolo. Item #1.', NULL, 'company', TRUE, 1, v_route_vo);
  END IF;

  -- Item 2 — VO, sem data
  IF NOT EXISTS (SELECT 1 FROM public.prescription_item WHERE company_id = v_company_id AND prescription_id = v_prescription_id AND product_id = v_product_ids[2] AND COALESCE(item_order, 999) = 2) THEN
    INSERT INTO public.prescription_item (company_id, prescription_id, item_type, product_id, quantity, start_date, end_date, frequency_mode, interval_minutes, time_start, times_value, times_unit, time_checks, is_prn, is_continuous_use, instructions_use, instructions_pharmacy, week_days, supplier, is_active, item_order, route_id)
    VALUES (v_company_id, v_prescription_id, 'medication', v_product_ids[2], 2, NULL, NULL, 'shift', NULL, NULL, 3, 'week', NULL, FALSE, TRUE, 'Administrar conforme horários ou conforme necessário.', 'Dispensar conforme protocolo. Item #2.', NULL, 'company', TRUE, 2, v_route_vo);
  END IF;

  -- Item 3 — VO, sem data
  IF NOT EXISTS (SELECT 1 FROM public.prescription_item WHERE company_id = v_company_id AND prescription_id = v_prescription_id AND product_id = v_product_ids[3] AND COALESCE(item_order, 999) = 3) THEN
    INSERT INTO public.prescription_item (company_id, prescription_id, item_type, product_id, quantity, start_date, end_date, frequency_mode, interval_minutes, time_start, times_value, times_unit, time_checks, is_prn, is_continuous_use, instructions_use, instructions_pharmacy, week_days, supplier, is_active, item_order, route_id)
    VALUES (v_company_id, v_prescription_id, 'medication', v_product_ids[3], 1, NULL, NULL, 'times_per', NULL, NULL, 3, 'day', ARRAY['07:00:00','15:00:00','23:00:00']::time[], FALSE, TRUE, 'Administrar conforme horários ou conforme necessário.', 'Dispensar conforme protocolo. Item #3.', NULL, 'company', TRUE, 3, v_route_vo);
  END IF;

  -- Item 4 — VO, sem data
  IF NOT EXISTS (SELECT 1 FROM public.prescription_item WHERE company_id = v_company_id AND prescription_id = v_prescription_id AND product_id = v_product_ids[4] AND COALESCE(item_order, 999) = 4) THEN
    INSERT INTO public.prescription_item (company_id, prescription_id, item_type, product_id, quantity, start_date, end_date, frequency_mode, interval_minutes, time_start, times_value, times_unit, time_checks, is_prn, is_continuous_use, instructions_use, instructions_pharmacy, week_days, supplier, is_active, item_order, route_id)
    VALUES (v_company_id, v_prescription_id, 'medication', v_product_ids[4], 1, NULL, NULL, 'every', 480, '08:00:00', 8, 'hour', NULL, FALSE, TRUE, 'Administrar conforme horários ou conforme necessário.', 'Dispensar conforme protocolo. Item #4.', NULL, 'company', TRUE, 4, v_route_vo);
  END IF;

  -- Item 5 — VO, sem data
  IF NOT EXISTS (SELECT 1 FROM public.prescription_item WHERE company_id = v_company_id AND prescription_id = v_prescription_id AND product_id = v_product_ids[5] AND COALESCE(item_order, 999) = 5) THEN
    INSERT INTO public.prescription_item (company_id, prescription_id, item_type, product_id, quantity, start_date, end_date, frequency_mode, interval_minutes, time_start, times_value, times_unit, time_checks, is_prn, is_continuous_use, instructions_use, instructions_pharmacy, week_days, supplier, is_active, item_order, route_id)
    VALUES (v_company_id, v_prescription_id, 'medication', v_product_ids[5], 1, NULL, NULL, 'shift', NULL, NULL, 4, 'week', NULL, FALSE, TRUE, 'Administrar conforme horários ou conforme necessário.', 'Dispensar conforme protocolo. Item #5.', NULL, 'company', TRUE, 5, v_route_gtm);
  END IF;

  -- Item 6 — EV, com data inicial e final
  IF NOT EXISTS (SELECT 1 FROM public.prescription_item WHERE company_id = v_company_id AND prescription_id = v_prescription_id AND product_id = v_product_ids[6] AND COALESCE(item_order, 999) = 6) THEN
    INSERT INTO public.prescription_item (company_id, prescription_id, item_type, product_id, quantity, start_date, end_date, frequency_mode, interval_minutes, time_start, times_value, times_unit, time_checks, is_prn, is_continuous_use, instructions_use, instructions_pharmacy, week_days, supplier, is_active, item_order, route_id)
    VALUES (v_company_id, v_prescription_id, 'medication', v_product_ids[6], 1, DATE '2026-02-01', DATE '2026-02-15', 'times_per', NULL, NULL, 4, 'day', ARRAY['07:00:00','11:00:00','15:00:00','19:00:00']::time[], FALSE, TRUE, 'Administrar conforme horários ou conforme necessário.', 'Dispensar conforme protocolo. Item #6.', NULL, 'company', TRUE, 6, v_route_gtm);
  END IF;

  -- Item 7 — IM, sem data
  IF NOT EXISTS (SELECT 1 FROM public.prescription_item WHERE company_id = v_company_id AND prescription_id = v_prescription_id AND product_id = v_product_ids[7] AND COALESCE(item_order, 999) = 7) THEN
    INSERT INTO public.prescription_item (company_id, prescription_id, item_type, product_id, quantity, start_date, end_date, frequency_mode, interval_minutes, time_start, times_value, times_unit, time_checks, is_prn, is_continuous_use, instructions_use, instructions_pharmacy, week_days, supplier, is_active, item_order, route_id)
    VALUES (v_company_id, v_prescription_id, 'medication', v_product_ids[7], 0.5, NULL, NULL, 'every', 840, '08:00:00', 12, 'hour', NULL, FALSE, TRUE, 'Administrar conforme horários ou conforme necessário.', 'Dispensar conforme protocolo. Item #7.', NULL, 'company', TRUE, 7, v_route_ev);
  END IF;

  -- Item 8 — SC, sem data
  IF NOT EXISTS (SELECT 1 FROM public.prescription_item WHERE company_id = v_company_id AND prescription_id = v_prescription_id AND product_id = v_product_ids[8] AND COALESCE(item_order, 999) = 8) THEN
    INSERT INTO public.prescription_item (company_id, prescription_id, item_type, product_id, quantity, start_date, end_date, frequency_mode, interval_minutes, time_start, times_value, times_unit, time_checks, is_prn, is_continuous_use, instructions_use, instructions_pharmacy, week_days, supplier, is_active, item_order, route_id)
    VALUES (v_company_id, v_prescription_id, 'medication', v_product_ids[8], 1, NULL, NULL, 'shift', NULL, NULL, 3, 'week', NULL, FALSE, TRUE, NULL, 'Dispensar conforme protocolo. Item #8.', NULL, 'company', TRUE, 8, v_route_gtm);
  END IF;

  -- Item 9 — SL, sem data
  IF NOT EXISTS (SELECT 1 FROM public.prescription_item WHERE company_id = v_company_id AND prescription_id = v_prescription_id AND product_id = v_product_ids[9] AND COALESCE(item_order, 999) = 9) THEN
    INSERT INTO public.prescription_item (company_id, prescription_id, item_type, product_id, quantity, start_date, end_date, frequency_mode, interval_minutes, time_start, times_value, times_unit, time_checks, is_prn, is_continuous_use, instructions_use, instructions_pharmacy, week_days, supplier, is_active, item_order, route_id)
    VALUES (v_company_id, v_prescription_id, 'medication', v_product_ids[9], 1, NULL, NULL, 'times_per', NULL, NULL, 3, 'day', ARRAY['08:00:00','14:00:00','22:00:00']::time[], FALSE, TRUE, 'Administrar conforme horários ou conforme necessário.', 'Dispensar conforme protocolo. Item #9.', NULL, 'company', TRUE, 9, v_route_gtm);
  END IF;

  -- Item 10 — VO, sem data
  IF NOT EXISTS (SELECT 1 FROM public.prescription_item WHERE company_id = v_company_id AND prescription_id = v_prescription_id AND product_id = v_product_ids[10] AND COALESCE(item_order, 999) = 10) THEN
    INSERT INTO public.prescription_item (company_id, prescription_id, item_type, product_id, quantity, start_date, end_date, frequency_mode, interval_minutes, time_start, times_value, times_unit, time_checks, is_prn, is_continuous_use, instructions_use, instructions_pharmacy, week_days, supplier, is_active, item_order, route_id)
    VALUES (v_company_id, v_prescription_id, 'medication', v_product_ids[10], 1, NULL, NULL, 'every', 1200, '08:00:00', 2, 'hour', NULL, FALSE, TRUE, 'Administrar conforme horários ou conforme necessário.', 'Dispensar conforme protocolo. Item #10.', NULL, 'company', TRUE, 10, v_route_vo);
  END IF;

  RAISE NOTICE 'Seed 07 aplicado: até 10 itens de prescrição inseridos.';
END $$;

COMMIT;
