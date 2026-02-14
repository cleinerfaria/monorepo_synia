-- =============================================
-- Tabela de Logs de Ações de Usuários
-- Registra operações de CRUD (create, update, delete)
-- Multi-tenant seguro: sempre escopado por company_id
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,

  -- Referência ao usuário do app via ID único
  user_id UUID REFERENCES public.app_user(id) ON DELETE SET NULL,

  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  entity TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices (alta taxa de escrita + consultas por período)
CREATE INDEX IF NOT EXISTS idx_user_action_logs_company_date
  ON public.user_action_logs(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_action_logs_company_entity_date
  ON public.user_action_logs(company_id, entity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_action_logs_company_user_date
  ON public.user_action_logs(company_id, user_id, created_at DESC);

COMMENT ON TABLE public.user_action_logs IS 'Registra ações de CRUD realizadas pelos usuários';
COMMENT ON COLUMN public.user_action_logs.action IS 'Tipo de ação: create, update ou delete';
COMMENT ON COLUMN public.user_action_logs.entity IS 'Nome da entidade afetada (ex: product, patient)';
COMMENT ON COLUMN public.user_action_logs.entity_id IS 'ID do registro afetado';
COMMENT ON COLUMN public.user_action_logs.entity_name IS 'Nome legível do registro para facilitar auditoria';
COMMENT ON COLUMN public.user_action_logs.old_data IS 'Estado anterior do registro (update/delete)';
COMMENT ON COLUMN public.user_action_logs.new_data IS 'Novo estado do registro (create/update)';

-- =============================================
-- RLS
-- =============================================

ALTER TABLE public.user_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_action_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view logs from their company" ON public.user_action_logs;
DROP POLICY IF EXISTS "Only admins can delete logs" ON public.user_action_logs;

-- Usuários autenticados: ver apenas logs do próprio tenant
CREATE POLICY "Users can view logs from their company"
  ON public.user_action_logs
  FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id());

-- Admin: pode deletar logs do próprio tenant (se você quiser permitir limpeza controlada)
CREATE POLICY "Only admins can delete logs"
  ON public.user_action_logs
  FOR DELETE
  TO authenticated
  USING (company_id = public.get_user_company_id() AND public.is_user_admin());

-- =============================================
-- RPC: única forma de escrita (SECURITY DEFINER)
-- =============================================

CREATE OR REPLACE FUNCTION public.log_user_action(
  p_company_id UUID,
  p_action TEXT,
  p_entity TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_entity_name TEXT DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_log_id UUID;
  v_user_id UUID;
  v_company_id UUID;
BEGIN
  v_user_id := auth.uid();
  v_company_id := public.get_user_company_id();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is null (no authenticated user)';
  END IF;

  IF p_action NOT IN ('create', 'update', 'delete') THEN
    RAISE EXCEPTION 'Invalid action: %. Must be create, update or delete', p_action;
  END IF;

  -- trava multi-tenant: não permite logar fora do tenant do usuário
  IF p_company_id IS DISTINCT FROM v_company_id THEN
    RAISE EXCEPTION 'Invalid company_id. Must match current user company';
  END IF;

  INSERT INTO public.user_action_logs (
    company_id,
    user_id,
    action,
    entity,
    entity_id,
    entity_name,
    old_data,
    new_data,
    ip_address,
    user_agent
  ) VALUES (
    v_company_id,
    v_user_id,
    p_action,
    p_entity,
    p_entity_id,
    p_entity_name,
    p_old_data,
    p_new_data,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_user_action(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, INET, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_user_action(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, INET, TEXT) TO authenticated;
