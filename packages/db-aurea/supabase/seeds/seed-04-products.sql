-- =====================================================
-- Seed 04: Products (medication)
-- =====================================================

BEGIN;

DO $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT id INTO v_company_id
  FROM public.company
  WHERE document = '00.000.000/0001-00'
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Initial company not found. Run migrations first.';
  END IF;

  INSERT INTO public.product
    (company_id, item_type, code, name, description, concentration, antibiotic, psychotropic, active)
  VALUES
    (v_company_id, 'medication', 'E2E-MED-001', 'DIPIRONA', 'Analgésico e antitérmico', '500mg', FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-002', 'AMOXICILINA', 'Antibiótico betalactâmico', '500mg', TRUE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-003', 'OMEPRAZOL', 'Inibidor de bomba de prótons', '20mg', FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-004', 'METFORMINA', 'Antidiabético oral', '850mg', FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-005', 'LISINOPRIL', 'Inibidor ECA para hipertensão', '10mg', FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-006', 'FLUOXETINA', 'ISRS antidepressivo', '20mg', FALSE, TRUE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-007', 'CLORETO DE SÓDIO', 'Solução para limpeza e irrigação', '0,9%', FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-008', 'DIFENIDRAMINA', 'Anti-histamínico', '25mg', FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-009', 'METOCLOPRAMIDA', 'Antiemético e procinético', '10mg', FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-010', 'LOSARTANA', 'Antagonista de receptor de angiotensina II', '50mg', FALSE, FALSE, TRUE)
  ON CONFLICT (company_id, code) WHERE code IS NOT NULL DO NOTHING;

  RAISE NOTICE 'Seed 04 applied: products';
END $$;

COMMIT;
