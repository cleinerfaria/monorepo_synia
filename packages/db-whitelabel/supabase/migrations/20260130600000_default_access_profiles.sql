-- =====================================================
-- MIGRATION: Perfis básicos automáticos para empresas
-- =====================================================

-- =====================================================
-- 1) Função para criar perfis básicos de uma empresa
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_default_access_profiles_for_company(company_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir perfis básicos para a empresa
  INSERT INTO public.access_profile (company_id, code, name, description, is_system, is_admin, active)
  VALUES
    (company_uuid, 'admin', 'Administrador', 'Acesso total à empresa', false, true, true),
    (company_uuid, 'manager', 'Gerente', 'Acesso de gerenciamento', false, false, true),
    (company_uuid, 'user', 'Usuário', 'Acesso básico do usuário', false, false, true),
    (company_uuid, 'viewer', 'Visualizador', 'Apenas visualização', false, false, true)
  ON CONFLICT (company_id, code) DO NOTHING; -- Evitar duplicatas
END;
$$;

-- =====================================================
-- 2) Trigger para criar perfis automaticamente
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_default_profiles_on_company_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Chamar função para criar perfis básicos
  PERFORM public.create_default_access_profiles_for_company(NEW.id);

  RETURN NEW;
END;
$$;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trg_create_default_profiles ON public.company;

-- Criar trigger que executa após inserção de empresa
CREATE TRIGGER trg_create_default_profiles
AFTER INSERT ON public.company
FOR EACH ROW
EXECUTE FUNCTION public.create_default_profiles_on_company_insert();

-- =====================================================
-- 3) Criar perfis para empresas existentes
-- =====================================================

-- Inserir perfis para todas as empresas que ainda não os têm
DO $$
DECLARE
  company_record RECORD;
BEGIN
  FOR company_record IN
    SELECT id FROM public.company
    WHERE id NOT IN (
      SELECT DISTINCT company_id
      FROM public.access_profile
      WHERE company_id IS NOT NULL
    )
  LOOP
    PERFORM public.create_default_access_profiles_for_company(company_record.id);
  END LOOP;
END;
$$;

-- =====================================================
-- 4) Revogar permissões públicas das funções
-- =====================================================

REVOKE ALL ON FUNCTION public.create_default_access_profiles_for_company(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.create_default_access_profiles_for_company(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.create_default_profiles_on_company_insert() FROM public;
GRANT EXECUTE ON FUNCTION public.create_default_profiles_on_company_insert() TO authenticated;
