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
  v_system_admin_auth_id UUID;
  v_admin_auth_id UUID;
  v_manager_auth_id UUID;
  v_user_auth_id UUID;
  v_admin_profile_id UUID;
  v_manager_profile_id UUID;
  v_viewer_profile_id UUID;
BEGIN
  -- Buscar a empresa criada na migration inicial
  SELECT id INTO v_company_id FROM public.company 
  WHERE document = '00.000.000/0001-00' LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Empresa inicial não encontrada. Verifique se as migrations foram executadas.';
  END IF;

  -- Buscar access profiles do sistema
  SELECT id INTO v_admin_profile_id FROM public.access_profile 
  WHERE code = 'admin' AND is_system = true LIMIT 1;
  
  SELECT id INTO v_manager_profile_id FROM public.access_profile 
  WHERE code = 'manager' AND is_system = true LIMIT 1;
  
  SELECT id INTO v_viewer_profile_id FROM public.access_profile 
  WHERE code = 'viewer' AND is_system = true LIMIT 1;

  -- Buscar auth users já criados (criados pelo lib.cjs)
  SELECT id INTO v_system_admin_auth_id FROM auth.users 
  WHERE email = 'superadmin@aurea.com' LIMIT 1;
  
  SELECT id INTO v_admin_auth_id FROM auth.users 
  WHERE email = 'admin@aurea.com' LIMIT 1;
  
  SELECT id INTO v_manager_auth_id FROM auth.users 
  WHERE email = 'manager@aurea.com' LIMIT 1;
  
  SELECT id INTO v_user_auth_id FROM auth.users 
  WHERE email = 'user@aurea.com' LIMIT 1;

  -- =====================================================
  -- 1) PROFISSIONAIS (3 profissionais)
  -- =====================================================
  INSERT INTO public.professional 
    (company_id, code, name, role, council_type, council_number, council_uf, phone, email, active)
  VALUES 
    (v_company_id, 'E2E-PRO-001', 'Dra. Ana Silva', 'Médico', 'CRM', '123456', 'SP', '(11) 99999-0001', 'ana.silva@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-002', 'Enf. Carlos Santos', 'Enfermeiro', 'COREN', '654321', 'SP', '(11) 99999-0002', 'carlos.santos@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-003', 'Fisio. Maria Oliveira', 'Fisioterapeuta', 'CREFITO', '987654', 'SP', '(11) 99999-0003', 'maria.oliveira@e2e.local', TRUE)
  ON CONFLICT (company_id, code) WHERE code IS NOT NULL DO NOTHING;

  -- =====================================================
  -- 2) PACIENTES (3 pacientes)
  -- =====================================================
  INSERT INTO public.patient 
    (company_id, code, name, cpf, birth_date, gender, phone, email, active)
  VALUES 
    (v_company_id, 'E2E-PAT-001', 'João da Silva', '12345678900', '1960-05-15', 'male', '(11) 98888-0001', 'joao.silva@e2e.local', TRUE),
    (v_company_id, 'E2E-PAT-002', 'Maria dos Santos', '23456789011', '1965-08-22', 'female', '(11) 98888-0002', 'maria.santos@e2e.local', TRUE),
    (v_company_id, 'E2E-PAT-003', 'Pedro Costa', '34567890122', '1955-12-10', 'male', '(11) 98888-0003', 'pedro.costa@e2e.local', TRUE)
  ON CONFLICT (company_id, code) WHERE code IS NOT NULL DO NOTHING;

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
  ON CONFLICT (company_id, code) WHERE code IS NOT NULL DO NOTHING;

  -- =====================================================
  -- 4) SYSTEM USER (Superadmin Bootstrap)
  -- =====================================================
  IF v_system_admin_auth_id IS NOT NULL THEN
    INSERT INTO public.system_user (auth_user_id, is_superadmin, name, email)
    VALUES (
      v_system_admin_auth_id,
      TRUE,
      'Super Admin',
      'superadmin@aurea.com'
    )
    ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;

  -- =====================================================
  -- 5) APP USERS (Vinculação com auth users)
  -- =====================================================
  IF v_system_admin_auth_id IS NOT NULL THEN
    INSERT INTO public.app_user 
      (company_id, auth_user_id, name, email, role, active, access_profile_id)
    VALUES 
      (v_company_id, v_system_admin_auth_id, 'Super Admin', 'superadmin@aurea.com', 'admin', true, v_admin_profile_id)
    ON CONFLICT (auth_user_id, company_id) DO NOTHING;
  END IF;

  IF v_admin_auth_id IS NOT NULL THEN
    INSERT INTO public.app_user 
      (company_id, auth_user_id, name, email, role, active, access_profile_id)
    VALUES 
      (v_company_id, v_admin_auth_id, 'Admin', 'admin@aurea.com', 'admin', true, v_admin_profile_id)
    ON CONFLICT (auth_user_id, company_id) DO NOTHING;
  END IF;

  IF v_manager_auth_id IS NOT NULL THEN
    INSERT INTO public.app_user 
      (company_id, auth_user_id, name, email, role, active, access_profile_id)
    VALUES 
      (v_company_id, v_manager_auth_id, 'Manager', 'manager@aurea.com', 'manager', true, v_manager_profile_id)
    ON CONFLICT (auth_user_id, company_id) DO NOTHING;
  END IF;

  IF v_user_auth_id IS NOT NULL THEN
    INSERT INTO public.app_user 
      (company_id, auth_user_id, name, email, role, active, access_profile_id)
    VALUES 
      (v_company_id, v_user_auth_id, 'User', 'user@aurea.com', 'viewer', true, v_viewer_profile_id)
    ON CONFLICT (auth_user_id, company_id) DO NOTHING;
  END IF;

  RAISE NOTICE 'Dev seed data applied successfully!';
  RAISE NOTICE 'Company ID: %', v_company_id;
  RAISE NOTICE 'Inserted: 3 professionals, 3 patients, 10 medications, 1 system user + 3 app users';

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'SEED FALHOU: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  RAISE EXCEPTION 'Seed abortado devido a erro: %', SQLERRM;
END $$;

COMMIT;
