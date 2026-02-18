-- =====================================================
-- Seed 01: Professions
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

  INSERT INTO public.profession (company_id, code, name, is_active)
  VALUES
    (v_company_id, 'medico', 'Médico', TRUE),
    (v_company_id, 'enfermeiro', 'Enfermeiro', TRUE),
    (v_company_id, 'tecnico', 'Técnico de Enfermagem', TRUE),
    (v_company_id, 'fisioterapeuta', 'Fisioterapeuta', TRUE),
    (v_company_id, 'nutricionista', 'Nutricionista', TRUE),
    (v_company_id, 'farmaceutico', 'Farmacêutico', TRUE),
    (v_company_id, 'psicologo', 'Psicólogo', TRUE),
    (v_company_id, 'fonoaudiologo', 'Fonoaudiólogo', TRUE),
    (v_company_id, 'assistente', 'Assistente Social', TRUE),
    (v_company_id, 'cuidador', 'Cuidador', TRUE),
    (v_company_id, 'outro', 'Outro', TRUE)
  ON CONFLICT (company_id, name) DO UPDATE SET
    code = EXCLUDED.code,
    is_active = TRUE;

  RAISE NOTICE 'Seed 01 applied: professions';
END $$;

COMMIT;
