-- =====================================================
-- Seed 03: Patients
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

  INSERT INTO public.patient
    (company_id, code, name, cpf, birth_date, gender, phone, email, is_active)
  VALUES
    (v_company_id, 'E2E-PAT-001', 'João da Silva', '12345678900', '1960-05-15', 'male', '(11) 98888-0001', 'joao.silva@e2e.local', TRUE),
    (v_company_id, 'E2E-PAT-002', 'Maria dos Santos', '23456789011', '1965-08-22', 'female', '(11) 98888-0002', 'maria.santos@e2e.local', TRUE),
    (v_company_id, 'E2E-PAT-003', 'Pedro Costa', '34567890122', '1955-12-10', 'male', '(11) 98888-0003', 'pedro.costa@e2e.local', TRUE)
  ON CONFLICT (company_id, code) WHERE code IS NOT NULL DO NOTHING;

  RAISE NOTICE 'Seed 03 applied: patients';
END $$;

COMMIT;
