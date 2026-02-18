-- =====================================================
-- ÁUREA CARE - Client Contact Management
-- Adiciona tabela de contatos para clientes
-- =====================================================

-- Criar enum para tipos de contato de cliente (reutilizando a mesma estrutura dos pacientes)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_contact_type') THEN
    CREATE TYPE public.client_contact_type AS ENUM ('phone', 'whatsapp', 'email', 'other');
  END IF;
END $$;

-- Tabela de contatos de clientes
CREATE TABLE IF NOT EXISTS public.client_contact (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.client(id) ON DELETE CASCADE,

  name text NULL,                 -- nome do contato (ex: "João Silva")
  department text NULL,           -- departamento/setor (ex: "Financeiro", "Atendimento", "Gerência")
  position text NULL,             -- cargo (ex: "Gerente", "Analista", "Coordenador")
  type public.client_contact_type NOT NULL DEFAULT 'phone',
  value text NOT NULL,            -- número, email, etc
  notes text NULL,                -- observações sobre o contato

  is_primary boolean NOT NULL DEFAULT false,
  can_receive_updates boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT client_contact_pkey PRIMARY KEY (id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_client_contact_company
ON public.client_contact (company_id);

CREATE INDEX IF NOT EXISTS idx_client_contact_client
ON public.client_contact (client_id);

CREATE INDEX IF NOT EXISTS idx_client_contact_client_type
ON public.client_contact (client_id, type);

-- Evita duplicar o mesmo contato (por cliente, tipo, valor) enquanto ativo
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_contact_unique_active
ON public.client_contact (client_id, type, value)
WHERE is_active IS TRUE;

-- No máximo 1 contato primário ativo por cliente
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_contact_primary_unique
ON public.client_contact (client_id)
WHERE is_primary IS TRUE AND is_active IS TRUE;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_client_contact_updated_at
BEFORE UPDATE ON public.client_contact
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();