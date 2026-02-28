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

  INSERT INTO public.client
    (company_id, type, code, name, document, email, phone, ans_code, color, is_active)
  VALUES
    (v_company_id, 'insurer', 'E2E-CLI-001', 'Unimed Natal', '11111111000101', 'contato@unimed-natal.e2e.local', '11977770001', '000001', '#00995D', TRUE),
    (v_company_id, 'insurer', 'E2E-CLI-002', 'Hapvida RN', '22222222000102', 'contato@hapvida-rn.e2e.local', '11977770002', '000002', '#F97316', TRUE),
    (v_company_id, 'insurer', 'E2E-CLI-003', 'SulAmerica Saude', '33333333000103', 'contato@sulamerica.e2e.local', '11977770003', '000003', '#2563EB', TRUE)
  ON CONFLICT (company_id, code) WHERE code IS NOT NULL
  DO UPDATE SET
    type = EXCLUDED.type,
    name = EXCLUDED.name,
    document = EXCLUDED.document,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    ans_code = EXCLUDED.ans_code,
    color = EXCLUDED.color,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

  INSERT INTO public.patient
    (company_id, code, name, cpf, birth_date, gender, phone, email, is_active)
  VALUES
    (v_company_id, 'E2E-PAT-001', 'João da Silva', '12345678900', '1960-05-15', 'male', '11988880001', 'joao.silva@e2e.local', TRUE),
    (v_company_id, 'E2E-PAT-002', 'Maria dos Santos', '23456789011', '1965-08-22', 'female', '11988880002', 'maria.santos@e2e.local', TRUE),
    (v_company_id, 'E2E-PAT-003', 'Pedro Costa', '34567890122', '1955-12-10', 'male', '11988880003', 'pedro.costa@e2e.local', TRUE)
  ON CONFLICT (company_id, code) WHERE code IS NOT NULL DO NOTHING;

  UPDATE public.patient AS p
  SET
    billing_client_id = c.id,
    updated_at = NOW()
  FROM public.client AS c
  WHERE p.company_id = v_company_id
    AND c.company_id = v_company_id
    AND (
      (p.code = 'E2E-PAT-001' AND c.code = 'E2E-CLI-001') OR
      (p.code = 'E2E-PAT-002' AND c.code = 'E2E-CLI-002') OR
      (p.code = 'E2E-PAT-003' AND c.code = 'E2E-CLI-003')
    );

  UPDATE public.patient_payer AS pp
  SET
    client_id = c.id,
    coverage_percent = 80.00,
    start_date = DATE '2026-01-01',
    notes = 'Fonte pagadora principal do seed',
    is_primary = TRUE,
    is_active = TRUE,
    updated_at = NOW()
  FROM public.patient AS p
  JOIN public.client AS c
    ON c.company_id = v_company_id
   AND c.code = 'E2E-CLI-001'
  WHERE pp.company_id = v_company_id
    AND pp.patient_id = p.id
    AND p.company_id = v_company_id
    AND p.code = 'E2E-PAT-001'
    AND pp.is_primary IS TRUE;

  INSERT INTO public.patient_payer
    (company_id, patient_id, client_id, is_primary, coverage_percent, start_date, notes, is_active)
  SELECT
    v_company_id,
    p.id,
    c.id,
    TRUE,
    80.00,
    DATE '2026-01-01',
    'Fonte pagadora principal do seed',
    TRUE
  FROM public.patient AS p
  JOIN public.client AS c
    ON c.company_id = v_company_id
   AND c.code = 'E2E-CLI-001'
  WHERE p.company_id = v_company_id
    AND p.code = 'E2E-PAT-001'
    AND NOT EXISTS (
      SELECT 1
      FROM public.patient_payer AS pp
      WHERE pp.company_id = v_company_id
        AND pp.patient_id = p.id
        AND pp.is_primary IS TRUE
        AND pp.is_active IS TRUE
    );

END $$;

COMMIT;
