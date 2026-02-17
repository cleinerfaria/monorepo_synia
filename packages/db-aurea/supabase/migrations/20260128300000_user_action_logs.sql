-- =============================================
-- Tabela de Logs de Ações de Usuários
-- Registra operações de CRUD (create, update, delete)
-- =============================================

-- Criar tabela de logs
CREATE TABLE IF NOT EXISTS user_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  entity TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_action_logs_company_id_fkey'
      AND conrelid = 'public.user_action_logs'::regclass
  ) THEN
    IF to_regclass('public.company') IS NOT NULL THEN
      EXECUTE '
        ALTER TABLE public.user_action_logs
        ADD CONSTRAINT user_action_logs_company_id_fkey
        FOREIGN KEY (company_id) REFERENCES public.company(id) ON DELETE CASCADE
      ';
    ELSIF to_regclass('company') IS NOT NULL THEN
      EXECUTE '
        ALTER TABLE public.user_action_logs
        ADD CONSTRAINT user_action_logs_company_id_fkey
        FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE
      ';
    ELSE
      RAISE EXCEPTION 'Tabela company nao encontrada para criar FK em user_action_logs';
    END IF;
  END IF;
END $$;

-- Índices otimizados para alta taxa de escrita
CREATE INDEX idx_user_action_logs_company_date ON user_action_logs(company_id, created_at DESC);
CREATE INDEX idx_user_action_logs_company_entity_date ON user_action_logs(company_id, entity, created_at DESC);
CREATE INDEX idx_user_action_logs_company_user_date ON user_action_logs(company_id, user_id, created_at DESC);

-- Comentários da tabela
COMMENT ON TABLE user_action_logs IS 'Registra ações de CRUD realizadas pelos usuários';
COMMENT ON COLUMN user_action_logs.action IS 'Tipo de ação: create, update ou delete';
COMMENT ON COLUMN user_action_logs.entity IS 'Nome da entidade afetada (ex: product, nfe, patient)';
COMMENT ON COLUMN user_action_logs.entity_id IS 'ID do registro afetado';
COMMENT ON COLUMN user_action_logs.entity_name IS 'Nome legível do registro para facilitar auditoria';
COMMENT ON COLUMN user_action_logs.old_data IS 'Estado anterior do registro (update/delete)';
COMMENT ON COLUMN user_action_logs.new_data IS 'Novo estado do registro (create/update)';

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE user_action_logs ENABLE ROW LEVEL SECURITY;

-- Usuários podem visualizar logs da sua empresa
CREATE POLICY "Users can view logs from their company"
  ON user_action_logs
  FOR SELECT
  USING (
    company_id IN (
      SELECT au.company_id FROM app_user au WHERE au.auth_user_id = auth.uid()
    )
  );

-- Apenas admins podem deletar logs (para limpeza controlada)
CREATE POLICY "Only admins can delete logs"
  ON user_action_logs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM app_user au
      WHERE au.auth_user_id = auth.uid()
      AND au.company_id = user_action_logs.company_id
      AND au.role = 'admin'
    )
  );

-- =============================================
-- Função RPC para registrar logs (única forma de escrita)
-- =============================================

CREATE OR REPLACE FUNCTION log_user_action(
  p_company_id UUID,
  p_action TEXT,
  p_entity TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_entity_name TEXT DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_user_id UUID;
BEGIN
  -- Obter user_id atual
  v_user_id := auth.uid();

  -- Validar ação
  IF p_action NOT IN ('create', 'update', 'delete') THEN
    RAISE EXCEPTION 'Invalid action: %. Must be create, update or delete', p_action;
  END IF;

  -- Validar vínculo usuário ↔ empresa
  IF NOT EXISTS (
    SELECT 1 FROM app_user au
    WHERE au.auth_user_id = v_user_id
    AND au.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'User is not associated with company %', p_company_id;
  END IF;

  -- Inserir o log
  INSERT INTO user_action_logs (
    company_id,
    user_id,
    action,
    entity,
    entity_id,
    entity_name,
    old_data,
    new_data
  ) VALUES (
    p_company_id,
    v_user_id,
    p_action,
    p_entity,
    p_entity_id,
    p_entity_name,
    p_old_data,
    p_new_data
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Conceder permissão para usuários autenticados executarem a função
GRANT EXECUTE ON FUNCTION log_user_action TO authenticated;
