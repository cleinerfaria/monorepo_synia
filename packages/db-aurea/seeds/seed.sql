-- =====================================================
-- Aurea Development Seed Data - Centralized Reference
-- =====================================================
-- 
-- Este arquivo é a REFERÊNCIA CENTRAL de dados de seed.
-- 
-- EXECUÇÃO AUTOMÁTICA (pelo Supabase):
-- O arquivo real executado é: supabase/seed.sql
-- Este é executado automaticamente em:
--   - supabase db reset
--   - supabase db push
--
-- DADOS INSERIDOS:
-- - 3 Profissionais (Médico, Enfermeiro, Fisioterapeuta)
-- - 3 Pacientes (com dados demográficos)
-- - 10 Medicações (com classificações: antibiotic, psychotropic)
--
-- EMPRESA UTILIZADA:
-- Document: 00.000.000/0001-00 (criada pela migration inicial)
--
-- RESPONSABILIDADES:
-- Migrations:     Unit of Measure, Administration Routes
-- seed.sql:       Profissionais, Pacientes, Medicações
-- lib.cjs:        Auth Users (system_user, app_user)
-- =====================================================

BEGIN;

DO $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Buscar empresa criada pela migration inicial
  SELECT id INTO v_company_id FROM public.company 
  WHERE document = '00.000.000/0001-00' LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Empresa inicial não encontrada. Verifique se as migrations foram executadas.';
  END IF;

  -- =====================================================
  -- 1) PROFISSIONAIS
  -- =====================================================
  INSERT INTO public.professional 
    (company_id, code, name, role, council_type, council_number, council_uf, phone, email, active)
  VALUES 
    (v_company_id, 'E2E-PRO-001', 'Dra. Ana Silva', 'Médico', 'CRM', '123456', 'SP', '(11) 99999-0001', 'ana.silva@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-002', 'Enf. Carlos Santos', 'Enfermeiro', 'COREN', '654321', 'SP', '(11) 99999-0002', 'carlos.santos@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-003', 'Fisio. Maria Oliveira', 'Fisioterapeuta', 'CREFITO', '987654', 'SP', '(11) 99999-0003', 'maria.oliveira@e2e.local', TRUE)
  ON CONFLICT (company_id, code) DO NOTHING;

  -- =====================================================
  -- 2) PACIENTES
  -- =====================================================
  INSERT INTO public.patient 
    (company_id, code, name, cpf, birth_date, gender, phone, email, active)
  VALUES 
    (v_company_id, 'E2E-PAT-001', 'João da Silva', '123.456.789-00', '1960-05-15', 'M', '(11) 98888-0001', 'joao.silva@e2e.local', TRUE),
    (v_company_id, 'E2E-PAT-002', 'Maria dos Santos', '234.567.890-11', '1965-08-22', 'F', '(11) 98888-0002', 'maria.santos@e2e.local', TRUE),
    (v_company_id, 'E2E-PAT-003', 'Pedro Costa', '345.678.901-22', '1955-12-10', 'M', '(11) 98888-0003', 'pedro.costa@e2e.local', TRUE)
  ON CONFLICT (company_id, code) DO NOTHING;

  -- =====================================================
  -- 3) MEDICAÇÕES
  -- =====================================================
  INSERT INTO public.product 
    (company_id, item_type, code, name, description, concentration, antibiotic, psychotropic, active)
  VALUES 
    (v_company_id, 'medication', 'E2E-MED-001', 'Dipirona 500mg', 'Analgésico e antitérmico', '500mg', FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-002', 'Amoxicilina 500mg', '🚨 ANTIBIOTIC', '500mg', TRUE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-003', 'Omeprazol 20mg', 'Inibidor de bomba de prótons', '20mg', FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-004', 'Metformina 850mg', 'Antidiabético oral', '850mg', FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-005', 'Lisinopril 10mg', 'Inibidor ECA para hipertensão', '10mg', FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-006', 'Fluoxetina 20mg', '🚨 PSYCHOTROPIC ISRS', '20mg', FALSE, TRUE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-007', 'Soro Fisiológico 0,9%', 'Solução para limpeza', '0,9%', FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-008', 'Difenidramina 25mg', 'Anti-histamínico', '25mg', FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-009', 'Metoclopramida 10mg', 'Antiemético', '10mg', FALSE, FALSE, TRUE),
    (v_company_id, 'medication', 'E2E-MED-010', 'Losartana 50mg', 'AT2 Antagonista', '50mg', FALSE, FALSE, TRUE)
  ON CONFLICT (company_id, code) DO NOTHING;

  RAISE NOTICE 'Seed data applied: 3 professionals, 3 patients, 10 medications';
  RAISE NOTICE 'Company ID: %', v_company_id;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Seed warning (pode ser normal se já inseridos): %', SQLERRM;
END $$;

COMMIT;
