-- =====================================================
-- Seed 02: Professionals
-- Depends on: seed-01-professions.sql
-- =====================================================

BEGIN;

DO $$
DECLARE
  v_company_id UUID;
  v_medico_id UUID;
  v_enfermeiro_id UUID;
  v_tec_enfermagem_id UUID;
  v_fisioterapeuta_id UUID;
BEGIN
  SELECT id INTO v_company_id
  FROM public.company
  WHERE document = '00.000.000/0001-00'
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Initial company not found. Run migrations first.';
  END IF;

  SELECT id INTO v_medico_id FROM public.profession WHERE company_id = v_company_id AND code = 'medico';
  SELECT id INTO v_enfermeiro_id FROM public.profession WHERE company_id = v_company_id AND code = 'enfermeiro';
  SELECT id INTO v_tec_enfermagem_id FROM public.profession WHERE company_id = v_company_id AND code = 'tecnico';
  SELECT id INTO v_fisioterapeuta_id FROM public.profession WHERE company_id = v_company_id AND code = 'fisioterapeuta';

  IF v_medico_id IS NULL OR v_enfermeiro_id IS NULL OR v_tec_enfermagem_id IS NULL OR v_fisioterapeuta_id IS NULL THEN
    RAISE EXCEPTION 'Missing required profession ids. Verify seed-01-professions.sql execution.';
  END IF;

  INSERT INTO public.professional
    (company_id, code, name, profession_id, council_type, council_number, council_uf, phone, email, is_active)
  VALUES
    (v_company_id, 'E2E-PRO-001', 'Ana Maria Silva', v_medico_id, 'CRM', '123456', 'RN', '(84) 99999-0001', 'ana.silva@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-002', 'Carlos Alexandre Santos', v_enfermeiro_id, 'COREN', '654321', 'RN', '(84) 99999-0002', 'carlos.santos@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-003', 'Maria Silva Oliveira', v_fisioterapeuta_id, 'CREFITO', '987654', 'RN', '(84) 99999-0003', 'maria.oliveira@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-004', 'Juliana Melo Lima', v_tec_enfermagem_id, 'COREN', '111111', 'RN', '(84) 99999-0004', 'juliana.lima@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-005', 'Roberto Carlos de Souza', v_tec_enfermagem_id, 'COREN', '222222', 'RN', '(84) 99999-0005', 'roberto.souza@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-006', 'Fernanda Silva da Costa', v_tec_enfermagem_id, 'COREN', '333333', 'RN', '(84) 99999-0006', 'fernanda.costa@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-007', 'Ricardo Emanuel Alves', v_tec_enfermagem_id, 'COREN', '444444', 'RN', '(84) 99999-0007', 'ricardo.alves@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-008', 'Maria de Fátima Costa e Silva', v_tec_enfermagem_id, 'COREN', '555555', 'RN', '(84) 99999-0008', 'maria.costa@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-009', 'Pedro Emanuel Lobo Alves', v_tec_enfermagem_id, 'COREN', '666666', 'RN', '(84) 99999-0009', 'pedro.alves@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-010', 'Rafaela Faria', v_tec_enfermagem_id, 'COREN', '777777', 'RN', '(84) 99999-0010', 'rafaela.faria@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-011', 'Helena Santos', v_tec_enfermagem_id, 'COREN', '888888', 'RN', '(84) 99999-0011', 'helena.santos@e2e.local', TRUE)
  ON CONFLICT (company_id, code) WHERE code IS NOT NULL DO NOTHING;

  RAISE NOTICE 'Seed 02 applied: professionals';
END $$;

COMMIT;
