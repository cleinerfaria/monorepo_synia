-- =====================================================
-- Supabase Seed File - VidaSystem
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
  v_medico_id UUID;
  v_enfermeiro_id UUID;
  v_tec_enfermagem_id UUID;
  v_fisioterapeuta_id UUID;
BEGIN
  -- Buscar a empresa criada na migration inicial
  SELECT id INTO v_company_id FROM public.company 
  WHERE document = '00.000.000/0001-00' LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Empresa inicial não encontrada. Verifique se as migrations foram executadas.';
  END IF;

  -- Buscar access profiles da empresa
  SELECT id INTO v_admin_profile_id FROM public.access_profile 
  WHERE code = 'admin' AND company_id = v_company_id LIMIT 1;
  
  SELECT id INTO v_manager_profile_id FROM public.access_profile 
  WHERE code = 'manager' AND company_id = v_company_id LIMIT 1;
  
  SELECT id INTO v_viewer_profile_id FROM public.access_profile 
  WHERE code = 'viewer' AND company_id = v_company_id LIMIT 1;

  -- Buscar auth users já criados (criados pelo lib.cjs)
  SELECT id INTO v_system_admin_auth_id FROM auth.users 
  WHERE email = 'superadmin@vidasystem.com' LIMIT 1;
  
  SELECT id INTO v_admin_auth_id FROM auth.users 
  WHERE email = 'admin@vidasystem.com' LIMIT 1;
  
  SELECT id INTO v_manager_auth_id FROM auth.users 
  WHERE email = 'manager@vidasystem.com' LIMIT 1;
  
  SELECT id INTO v_user_auth_id FROM auth.users 
  WHERE email = 'user@vidasystem.com' LIMIT 1;

  -- =====================================================
  -- 0) PROFISSÕES (Novas)
  -- =====================================================
  INSERT INTO public.profession (company_id, name, is_active)
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
  ON CONFLICT (company_id, name) DO UPDATE SET is_active = TRUE;

  -- Recuperar IDs das profissões para uso posterior
  SELECT id INTO v_medico_id FROM public.profession WHERE company_id = v_company_id AND name = 'Médico';
  SELECT id INTO v_enfermeiro_id FROM public.profession WHERE company_id = v_company_id AND name = 'Enfermeiro';
  SELECT id INTO v_tec_enfermagem_id FROM public.profession WHERE company_id = v_company_id AND name = 'Técnico de Enfermagem';
  SELECT id INTO v_fisioterapeuta_id FROM public.profession WHERE company_id = v_company_id AND name = 'Fisioterapeuta';

  -- =====================================================
  -- 1) PROFISSIONAIS
  -- =====================================================
  INSERT INTO public.professional 
    (company_id, code, name, profession_id, council_type, council_number, council_uf, phone, email, is_active)
  VALUES 
    (v_company_id, 'E2E-PRO-001', 'Ana Maria Silva', v_medico_id, 'CRM', '123456', 'RN', '84999990001', 'ana.silva@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-002', 'Carlos Alexandre Santos', v_enfermeiro_id, 'COREN', '654321', 'RN', '84999990002', 'carlos.santos@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-003', 'Maria Silva Oliveira', v_fisioterapeuta_id, 'CREFITO', '987654', 'RN', '84999990003', 'maria.oliveira@e2e.local', TRUE),
    -- Técnicos de Enfermagem
    (v_company_id, 'E2E-PRO-004', 'Juliana Melo Lima', v_tec_enfermagem_id, 'COREN', '111111', 'RN', '84999990004', 'juliana.lima@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-005', 'Roberto Carlos de Souza', v_tec_enfermagem_id, 'COREN', '222222', 'RN', '84999990005', 'roberto.souza@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-006', 'Fernanda Silva da Costa', v_tec_enfermagem_id, 'COREN', '333333', 'RN', '84999990006', 'fernanda.costa@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-007', 'Ricardo Emanuel Alves', v_tec_enfermagem_id, 'COREN', '444444', 'RN', '84999990007', 'ricardo.alves@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-008', 'Maria de Fátima Costa e Silva', v_tec_enfermagem_id, 'COREN', '555555', 'RN', '84999990008', 'maria.costa@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-009', 'Pedro Emanuel Lobo Alves', v_tec_enfermagem_id, 'COREN', '666666', 'RN', '84999990009', 'pedro.alves@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-010', 'Rafaela Faria', v_tec_enfermagem_id, 'COREN', '777777', 'RN', '84999990010', 'rafaela.faria@e2e.local', TRUE),
    (v_company_id, 'E2E-PRO-011', 'Helena Santos', v_tec_enfermagem_id, 'COREN', '888888', 'RN', '84999990011', 'helena.santos@e2e.local', TRUE)
  ON CONFLICT (company_id, code) WHERE code IS NOT NULL DO NOTHING;

  -- =====================================================
  -- 2) PACIENTES (3 pacientes)
  -- =====================================================
  INSERT INTO public.patient 
    (company_id, code, name, cpf, birth_date, gender, phone, email, is_active)
  VALUES 
    (v_company_id, 'E2E-PAT-001', 'João da Silva', '12345678900', '1960-05-15', 'male', '11988880001', 'joao.silva@e2e.local', TRUE),
    (v_company_id, 'E2E-PAT-002', 'Maria dos Santos', '23456789011', '1965-08-22', 'female', '11988880002', 'maria.santos@e2e.local', TRUE),
    (v_company_id, 'E2E-PAT-003', 'Pedro Costa', '34567890122', '1955-12-10', 'male', '11988880003', 'pedro.costa@e2e.local', TRUE)
  ON CONFLICT (company_id, code) WHERE code IS NOT NULL DO NOTHING;

  -- =====================================================
  -- 3) MEDICAÇÕES (10 produtos de tipo medication)
  -- =====================================================
  INSERT INTO public.product 
    (company_id, item_type, code, name, description, concentration, antibiotic, psychotropic, is_active)
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
      'superadmin@vidasystem.com'
    )
    ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;

  -- =====================================================
  -- 5) APP USERS (Vinculação com auth users)
  -- =====================================================
  IF v_system_admin_auth_id IS NOT NULL THEN
    INSERT INTO public.app_user 
      (company_id, auth_user_id, name, email, is_active, access_profile_id)
    VALUES 
      (v_company_id, v_system_admin_auth_id, 'Super Admin', 'superadmin@vidasystem.com', true, v_admin_profile_id)
    ON CONFLICT (auth_user_id, company_id) DO NOTHING;
  END IF;

  IF v_admin_auth_id IS NOT NULL THEN
    INSERT INTO public.app_user 
      (company_id, auth_user_id, name, email, is_active, access_profile_id)
    VALUES 
      (v_company_id, v_admin_auth_id, 'Admin', 'admin@vidasystem.com', true, v_admin_profile_id)
    ON CONFLICT (auth_user_id, company_id) DO NOTHING;
  END IF;

  IF v_manager_auth_id IS NOT NULL THEN
    INSERT INTO public.app_user 
      (company_id, auth_user_id, name, email, is_active, access_profile_id)
    VALUES 
      (v_company_id, v_manager_auth_id, 'Manager', 'manager@vidasystem.com', true, v_manager_profile_id)
    ON CONFLICT (auth_user_id, company_id) DO NOTHING;
  END IF;

  IF v_user_auth_id IS NOT NULL THEN
    INSERT INTO public.app_user 
      (company_id, auth_user_id, name, email, is_active, access_profile_id)
    VALUES 
      (v_company_id, v_user_auth_id, 'User', 'user@vidasystem.com', true, v_viewer_profile_id)
    ON CONFLICT (auth_user_id, company_id) DO NOTHING;
  END IF;

  RAISE NOTICE 'Aplicado seed para ambiente de desenvolvimento com sucesso!';
  RAISE NOTICE 'Criado Company ID: %', v_company_id;
  RAISE NOTICE 'Inserido: 11 profissionais, 3 pacientes, 10 medicamentos, 1 system user + 3 app users';

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'SEED FALHOU: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  RAISE EXCEPTION 'Seed abortado devido a erro: %', SQLERRM;
END $$;

COMMIT;
