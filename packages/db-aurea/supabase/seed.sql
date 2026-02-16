-- =====================================================
-- Supabase Seed File - Aurea
-- =====================================================
-- Executado automaticamente em:
-- - supabase db reset
-- - supabase db push
-- 
-- Este arquivo carrega os dados de desenvolvimento
-- para E2E testing: Profissionais, Pacientes, Medicações
--
-- IMPORTANTE: Este arquivo utiliza a empresa criada
-- pela migration inicial (document: 00.000.000/0001-00)
-- =====================================================================

BEGIN;

-- Declarar variáveis para a empresa criada na migration
DO $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Buscar a empresa criada na migration inicial
  SELECT id INTO v_company_id FROM public.company 
  WHERE document = '00.000.000/0001-00' LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Empresa inicial não encontrada. Verifique se as migrations foram executadas.';
  END IF;

  -- =====================================================
  -- 1) PROFISSIONAIS (3 profissionais)
  -- =====================================================
  INSERT INTO public.professional 
    (company_id, code, name, role, council_type, council_number, council_uf, phone, email, active)
  VALUES 
    (v_company_id, 'E2E-PRO-001', 'Dra. Ana Silva', 'Médico', 'CRM', '123456', 'SP', '(11) 99999-0001', 'ana.silva@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-002', 'Enf. Carlos Santos', 'Enfermeiro', 'COREN', '654321', 'SP', '(11) 99999-0002', 'carlos.santos@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-003', 'Fisio. Maria Oliveira', 'Fisioterapeuta', 'CREFITO', '987654', 'SP', '(11) 99999-0003', 'maria.oliveira@e2e.local', TRUE)
  ON CONFLICT (company_id, code) DO NOTHING;

  -- =====================================================
  -- 2) PACIENTES (3 pacientes)
  -- =====================================================
  INSERT INTO public.patient 
    (company_id, code, name, cpf, birth_date, gender, phone, email, active)
  VALUES 
    (v_company_id, 'E2E-PAT-001', 'João da Silva', '123.456.789-00', '1960-05-15', 'M', '(11) 98888-0001', 'joao.silva@e2e.local', TRUE),
    (v_company_id, 'E2E-PAT-002', 'Maria dos Santos', '234.567.890-11', '1965-08-22', 'F', '(11) 98888-0002', 'maria.santos@e2e.local', TRUE),
    (v_company_id, 'E2E-PAT-003', 'Pedro Costa', '345.678.901-22', '1955-12-10', 'M', '(11) 98888-0003', 'pedro.costa@e2e.local', TRUE)
  ON CONFLICT (company_id, code) DO NOTHING;

  -- =====================================================
  -- 3) MEDICAÇÕES (10 produtos de tipo medication)
  -- =====================================================
  INSERT INTO public.product 
    (company_id, item_type, code, name, description, concentration, antibiotic, psychotropic, active)
  VALUES 
    (v_company_id, 'medication', 'E2E-MED-001', 'Dipirona 500mg', 'Analgésico e antitérmico', '500mg', FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-002', 'Amoxicilina 500mg', 'Antibiótico betalactâmico', '500mg', TRUE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-003', 'Omeprazol 20mg', 'Inibidor de bomba de prótons', '20mg', FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-004', 'Metformina 850mg', 'Antidiabético oral', '850mg', FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-005', 'Lisinopril 10mg', 'Inibidor ECA para hipertensão', '10mg', FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-006', 'Fluoxetina 20mg', 'ISRS antidepressivo', '20mg', FALSE, TRUE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-007', 'Soro Fisiológico 0,9%', 'Solução para limpeza e irrigação', '0,9%', FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-008', 'Difenidramina 25mg', 'Anti-histamínico', '25mg', FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-009', 'Metoclopramida 10mg', 'Antiemético e procinético', '10mg', FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-010', 'Losartana 50mg', 'Antagonista de receptor de angiotensina II', '50mg', FALSE, FALSE, TRUE)
  ON CONFLICT (company_id, code) DO NOTHING;

  RAISE NOTICE 'Dev seed data applied successfully!';
  RAISE NOTICE 'Company ID: %', v_company_id;
  RAISE NOTICE 'Inserted: 3 professionals, 3 patients, 10 medications';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Aviso ao aplicar seed (pode ser normal em ambientes de produção): %', SQLERRM;
END $$;

COMMIT;
