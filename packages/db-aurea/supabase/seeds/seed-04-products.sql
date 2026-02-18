-- =====================================================
-- Seed 04: Products (medication)
-- =====================================================

BEGIN;

DO $$
DECLARE
  v_company_id UUID;
  v_unit_cp_id UUID;
  v_unit_un_id UUID;
  v_unit_amp_id UUID;
BEGIN
  SELECT id INTO v_company_id
  FROM public.company
  WHERE document = '00.000.000/0001-00'
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Initial company not found. Run migrations first.';
  END IF;

  -- Buscar UUIDs das unidades de medida
  SELECT id INTO v_unit_cp_id
  FROM public.unit_of_measure
  WHERE company_id = v_company_id AND code = 'cp'
  LIMIT 1;

  SELECT id INTO v_unit_un_id
  FROM public.unit_of_measure
  WHERE company_id = v_company_id AND code = 'un'
  LIMIT 1;

  SELECT id INTO v_unit_amp_id
  FROM public.unit_of_measure
  WHERE company_id = v_company_id AND code = 'amp'
  LIMIT 1;

  IF v_unit_cp_id IS NULL OR v_unit_un_id IS NULL OR v_unit_amp_id IS NULL THEN
    RAISE EXCEPTION 'Required units (cp, un, amp) not found. Run unit_of_measure seed first.';
  END IF;

  INSERT INTO public.product
    (company_id, item_type, code, name, description, concentration, unit_stock_id, unit_prescription_id, antibiotic, psychotropic, is_active)
  VALUES
    (v_company_id, 'medication', 'E2E-MED-001', 'DIPIRONA', 'Analgésico e antitérmico', '500mg', v_unit_cp_id, v_unit_cp_id, FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-002', 'AMOXICILINA', 'Antibiótico betalactâmico', '500mg', v_unit_cp_id, v_unit_cp_id, TRUE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-003', 'OMEPRAZOL', 'Inibidor de bomba de prótons', '20mg', v_unit_cp_id, v_unit_cp_id, FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-004', 'METFORMINA', 'Antidiabético oral', '850mg', v_unit_cp_id, v_unit_cp_id, FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-005', 'LISINOPRIL', 'Inibidor ECA para hipertensão', '10mg', v_unit_cp_id, v_unit_cp_id, FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-006', 'FLUOXETINA', 'ISRS antidepressivo', '20mg', v_unit_cp_id, v_unit_cp_id, FALSE, TRUE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-007', 'CLORETO DE SÓDIO', 'Solução para limpeza e irrigação', '0.9%', v_unit_amp_id, v_unit_amp_id, FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-008', 'DIFENIDRAMINA', 'Anti-histamínico', '25mg', v_unit_cp_id, v_unit_cp_id, FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-009', 'METOCLOPRAMIDA', 'Antiemético e procinético', '10mg', v_unit_cp_id, v_unit_cp_id, FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-010', 'LOSARTANA', 'Antagonista de receptor de angiotensina II', '50mg', v_unit_cp_id, v_unit_cp_id, FALSE, FALSE, TRUE)
  ON CONFLICT (company_id, code) WHERE code IS NOT NULL DO NOTHING;

  RAISE NOTICE 'Seed 04 applied: products';
END $$;

COMMIT;
