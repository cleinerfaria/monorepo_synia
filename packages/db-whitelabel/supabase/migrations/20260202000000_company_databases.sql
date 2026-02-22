-- =====================================================
-- COMPANY DATABASES: Conexões de banco de dados externos por empresa
-- Schema: PUBLIC (acessível via PostgREST)
-- Criptografia: pgcrypto (AES-256-CBC)
-- =====================================================

-- =====================================================
-- 1) Tabela de chaves de criptografia
-- =====================================================

CREATE TABLE IF NOT EXISTS public.encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  key_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir chave para company_databases (se não existir)
INSERT INTO public.encryption_keys (name, key_value)
VALUES ('company_db_encryption', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

-- RLS para encryption_keys (somente service_role pode acessar)
ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encryption_keys FORCE ROW LEVEL SECURITY;

-- Políticas para encryption_keys - apenas service_role tem acesso
-- Não permitir acesso a usuários normais ou authenticated users
CREATE POLICY "encryption_keys_service_role_only"
  ON public.encryption_keys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Bloquear explicitamente acesso de authenticated users
CREATE POLICY "encryption_keys_block_authenticated"
  ON public.encryption_keys
  FOR ALL
  TO authenticated
  USING (false);

-- Bloquear explicitamente acesso de anon
CREATE POLICY "encryption_keys_block_anon"
  ON public.encryption_keys
  FOR ALL
  TO anon
  USING (false);

-- =====================================================
-- 2) ENUMs para tipos de banco de dados
-- =====================================================

DO $$ BEGIN
  CREATE TYPE public.enum_db_type AS ENUM (
    'postgres',
    'mysql',
    'mssql',
    'oracle',
    'sqlite',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.enum_ssl_mode AS ENUM (
    'disable',
    'allow',
    'prefer',
    'require',
    'verify-ca',
    'verify-full'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 3) Tabela principal: company_databases
-- =====================================================

CREATE TABLE IF NOT EXISTS public.company_databases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  
  -- Metadados da conexão
  name TEXT NOT NULL,
  description TEXT,
  db_type public.enum_db_type NOT NULL DEFAULT 'postgres',
  
  -- Dados de conexão
  db_host TEXT NOT NULL,
  db_port INTEGER NOT NULL DEFAULT 5432,
  db_name TEXT NOT NULL,
  db_user TEXT NOT NULL,
  
  -- Senha criptografada (AES-256-CBC via pgcrypto)
  db_password_ciphertext TEXT NOT NULL,
  db_password_nonce TEXT NOT NULL,
  db_password_key_id TEXT NOT NULL DEFAULT 'company_db_encryption',
  
  -- Opções de conexão
  db_ssl_mode public.enum_ssl_mode NOT NULL DEFAULT 'require',
  connection_options JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  last_connection_test TIMESTAMPTZ,
  last_connection_status TEXT,
  last_connection_error TEXT,
  
  -- Auditoria
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Restrição: nome único por empresa
  CONSTRAINT uq_company_databases_name UNIQUE (company_id, name)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_company_databases_company ON public.company_databases(company_id);
CREATE INDEX IF NOT EXISTS idx_company_databases_active ON public.company_databases(company_id, is_active) WHERE is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_databases_default ON public.company_databases(company_id) WHERE is_default = true;

-- =====================================================
-- 4) Função handle_updated_at (se não existir)
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- 5) Triggers
-- =====================================================

-- Trigger para updated_at
CREATE TRIGGER set_company_databases_updated_at
  BEFORE UPDATE ON public.company_databases
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para garantir apenas 1 default por empresa
CREATE OR REPLACE FUNCTION public.company_databases_enforce_single_default()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE public.company_databases
    SET is_default = FALSE
    WHERE company_id = NEW.company_id
      AND id <> NEW.id
      AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_company_databases_single_default
  BEFORE INSERT OR UPDATE OF is_default ON public.company_databases
  FOR EACH ROW
  WHEN (NEW.is_default = TRUE)
  EXECUTE FUNCTION public.company_databases_enforce_single_default();

-- =====================================================
-- 6) Funções de criptografia (pgcrypto)
-- =====================================================

CREATE OR REPLACE FUNCTION public.encrypt_db_password_v2(p_plain_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_key text;
  v_iv bytea;
  v_cipher bytea;
BEGIN
  -- Buscar a chave de criptografia
  SELECT key_value INTO v_key FROM public.encryption_keys WHERE name = 'company_db_encryption';
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not found: company_db_encryption';
  END IF;
  
  -- Gerar IV (Initialization Vector) de 16 bytes
  v_iv := extensions.gen_random_bytes(16);
  
  -- Criptografar usando AES-256-CBC via pgcrypto
  v_cipher := extensions.encrypt_iv(
    convert_to(p_plain_password, 'UTF8'),
    decode(v_key, 'hex'),
    v_iv,
    'aes-cbc'
  );
  
  RETURN jsonb_build_object(
    'ciphertext', encode(v_cipher, 'base64'), 
    'nonce', encode(v_iv, 'base64'), 
    'key_id', 'company_db_encryption'
  );
END;
$$;

ALTER FUNCTION public.encrypt_db_password_v2(text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.encrypt_db_password_v2(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_db_password_v2(text) TO service_role;

COMMENT ON FUNCTION public.encrypt_db_password_v2(text) IS 'Criptografa senha usando AES-256-CBC via pgcrypto';

-- Função de descriptografia
CREATE OR REPLACE FUNCTION public.decrypt_db_password_v2(p_ciphertext text, p_nonce text, p_key_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_key text;
  v_plain bytea;
BEGIN
  IF p_key_id IS NULL OR p_key_id = '' THEN
    RAISE EXCEPTION 'Missing key_id';
  END IF;
  
  -- Buscar a chave de criptografia
  SELECT key_value INTO v_key FROM public.encryption_keys WHERE name = p_key_id;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not found: %', p_key_id;
  END IF;
  
  -- Descriptografar usando AES-256-CBC
  v_plain := extensions.decrypt_iv(
    decode(p_ciphertext, 'base64'),
    decode(v_key, 'hex'),
    decode(p_nonce, 'base64'),
    'aes-cbc'
  );
  
  RETURN convert_from(v_plain, 'UTF8');
END;
$$;

ALTER FUNCTION public.decrypt_db_password_v2(text, text, text) OWNER TO postgres;

-- Revogar acesso público à função de decrypt (somente service_role)
REVOKE EXECUTE ON FUNCTION public.decrypt_db_password_v2(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrypt_db_password_v2(text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_db_password_v2(text, text, text) TO service_role;

COMMENT ON FUNCTION public.decrypt_db_password_v2(text, text, text) IS 'Descriptografa senha (server-side only). Parâmetros em base64/text.';

-- =====================================================
-- 7) Função para atualizar status de conexão
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_database_connection_status(
  p_database_id uuid,
  p_status text,
  p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.company_databases
  SET 
    last_connection_test = NOW(),
    last_connection_status = p_status,
    last_connection_error = p_error
  WHERE id = p_database_id;
END;
$$;

ALTER FUNCTION public.update_database_connection_status(uuid, text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.update_database_connection_status(uuid, text, text) TO service_role;

-- =====================================================
-- 8) View segura (sem expor senha)
-- =====================================================


CREATE OR REPLACE VIEW public.company_databases_safe
WITH (security_invoker=true)
AS
SELECT
  id,
  company_id,
  name,
  description,
  db_type,
  db_host,
  db_port,
  db_name,
  db_user,
  -- Não expõe: db_password_ciphertext, db_password_nonce, db_password_key_id
  db_ssl_mode,
  connection_options,
  is_active,
  is_default,
  last_connection_test,
  last_connection_status,
  last_connection_error,
  created_by,
  updated_by,
  created_at,
  updated_at
FROM public.company_databases;

COMMENT ON VIEW public.company_databases_safe IS 'View segura de company_databases sem campos de senha criptografada';

-- =====================================================
-- 9) RLS Policies
-- =====================================================

ALTER TABLE public.company_databases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_databases FORCE ROW LEVEL SECURITY;

-- Superadmin: acesso total
CREATE POLICY company_databases_superadmin_select
ON public.company_databases
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.system_user su
    WHERE su.auth_user_id = auth.uid()
      AND su.is_superadmin = true
  )
);

CREATE POLICY company_databases_superadmin_insert
ON public.company_databases
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.system_user su
    WHERE su.auth_user_id = auth.uid()
      AND su.is_superadmin = true
  )
);

CREATE POLICY company_databases_superadmin_update
ON public.company_databases
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.system_user su
    WHERE su.auth_user_id = auth.uid()
      AND su.is_superadmin = true
  )
);

CREATE POLICY company_databases_superadmin_delete
ON public.company_databases
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.system_user su
    WHERE su.auth_user_id = auth.uid()
      AND su.is_superadmin = true
  )
);

-- Admin de empresa: acesso à sua própria empresa
CREATE POLICY company_databases_admin_select
ON public.company_databases
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.app_user au
    JOIN public.access_profile ap ON au.access_profile_id = ap.id
    WHERE au.auth_user_id = auth.uid()
      AND au.company_id = company_databases.company_id
      AND au.active = true
      AND ap.code = 'admin'
  )
);

CREATE POLICY company_databases_admin_insert
ON public.company_databases
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.app_user au
    JOIN public.access_profile ap ON au.access_profile_id = ap.id
    WHERE au.auth_user_id = auth.uid()
      AND au.company_id = company_databases.company_id
      AND au.active = true
      AND ap.code = 'admin'
  )
);

CREATE POLICY company_databases_admin_update
ON public.company_databases
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.app_user au
    JOIN public.access_profile ap ON au.access_profile_id = ap.id
    WHERE au.auth_user_id = auth.uid()
      AND au.company_id = company_databases.company_id
      AND au.active = true
      AND ap.code = 'admin'
  )
);

CREATE POLICY company_databases_admin_delete
ON public.company_databases
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.app_user au
    JOIN public.access_profile ap ON au.access_profile_id = ap.id
    WHERE au.auth_user_id = auth.uid()
      AND au.company_id = company_databases.company_id
      AND au.active = true
      AND ap.code = 'admin'
  )
);

-- =====================================================
-- 10) Trigger para impedir mudança de company_id
-- =====================================================

CREATE OR REPLACE FUNCTION public.company_databases_block_company_id_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.company_id <> NEW.company_id THEN
    RAISE EXCEPTION 'Não é permitido alterar company_id de uma conexão de banco';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_company_databases_block_company_id_change
  BEFORE UPDATE ON public.company_databases
  FOR EACH ROW
  EXECUTE FUNCTION public.company_databases_block_company_id_change();

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
