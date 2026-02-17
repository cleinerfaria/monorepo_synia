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

  INSERT INTO public.profession (company_id, name, active)
  VALUES
    (v_company_id, 'Médico', TRUE),
    (v_company_id, 'Enfermeiro', TRUE),
    (v_company_id, 'Técnico de Enfermagem', TRUE),
    (v_company_id, 'Fisioterapeuta', TRUE),
    (v_company_id, 'Nutricionista', TRUE),
    (v_company_id, 'Farmacêutico', TRUE),
    (v_company_id, 'Psicólogo', TRUE),
    (v_company_id, 'Fonoaudiólogo', TRUE),
    (v_company_id, 'Assistente Social', TRUE),
    (v_company_id, 'Cuidador', TRUE),
    (v_company_id, 'Outro', TRUE)
  ON CONFLICT (company_id, name) DO UPDATE SET active = TRUE;

  RAISE NOTICE 'Seed 01 applied: professions';
END $$;

COMMIT;
