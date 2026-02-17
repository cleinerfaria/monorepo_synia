
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND n.nspname = 'public'
      AND c.relname = 'idx_patient_cpf'
  ) THEN
    EXECUTE 'DROP INDEX public.idx_patient_cpf';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'patient_address_type') THEN
    CREATE TYPE public.patient_address_type AS ENUM ('home', 'billing', 'service', 'other');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.patient_address (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patient(id) ON DELETE CASCADE,

  type public.patient_address_type NOT NULL DEFAULT 'home',
  label text NULL,

  zip text NULL,
  street text NULL,
  number text NULL,
  complement text NULL,
  district text NULL,
  city text NULL,
  state text NULL,
  country text NULL DEFAULT 'BR',
  reference text NULL,

  is_primary boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT patient_address_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_patient_address_company
ON public.patient_address (company_id);

CREATE INDEX IF NOT EXISTS idx_patient_address_patient
ON public.patient_address (patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_address_patient_active
ON public.patient_address (patient_id, active);

CREATE INDEX IF NOT EXISTS idx_patient_address_patient_city
ON public.patient_address (patient_id, city);

-- Garante no máximo 1 endereço primário ativo por paciente
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_address_primary_unique
ON public.patient_address (patient_id)
WHERE is_primary IS TRUE AND active IS TRUE;

CREATE TRIGGER update_patient_address_updated_at
BEFORE UPDATE ON public.patient_address
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'patient_contact_type') THEN
    CREATE TYPE public.patient_contact_type AS ENUM ('phone', 'whatsapp', 'email', 'other');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.patient_contact (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patient(id) ON DELETE CASCADE,

  name text NULL,
  relationship text NULL,         -- ex: "filha", "cuidador", "responsável financeiro"
  type public.patient_contact_type NOT NULL DEFAULT 'phone',
  value text NOT NULL,            -- número, email, etc
  notes text NULL,

  is_primary boolean NOT NULL DEFAULT false,
  can_receive_updates boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT patient_contact_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_patient_contact_company
ON public.patient_contact (company_id);

CREATE INDEX IF NOT EXISTS idx_patient_contact_patient
ON public.patient_contact (patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_contact_patient_type
ON public.patient_contact (patient_id, type);

-- Evita duplicar o mesmo contato (por paciente, tipo, valor) enquanto ativo
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_contact_unique_active
ON public.patient_contact (patient_id, type, value)
WHERE active IS TRUE;

-- No máximo 1 contato primário ativo por paciente
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_contact_primary_unique
ON public.patient_contact (patient_id)
WHERE is_primary IS TRUE AND active IS TRUE;

CREATE TRIGGER update_patient_contact_updated_at
BEFORE UPDATE ON public.patient_contact
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'patient_identifier_type') THEN
    CREATE TYPE public.patient_identifier_type AS ENUM (
      'cns',
      'prontuario',
      'operadora',
      'externo',
      'other'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.patient_identifier (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patient(id) ON DELETE CASCADE,

  type public.patient_identifier_type NOT NULL DEFAULT 'externo',
  source text NOT NULL,          -- ex: "Unimed", "MV", "Tasy", "Sistema X"
  identifier text NOT NULL,      -- o código em si
  notes text NULL,

  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT patient_identifier_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_patient_identifier_company
ON public.patient_identifier (company_id);

CREATE INDEX IF NOT EXISTS idx_patient_identifier_patient
ON public.patient_identifier (patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_identifier_patient_source
ON public.patient_identifier (patient_id, source);

-- Um identificador por fonte/tipo por paciente (enquanto ativo)
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_identifier_unique_active
ON public.patient_identifier (patient_id, type, source)
WHERE active IS TRUE;

-- Opcional (forte): evitar repetir o mesmo identifier na empresa para mesma fonte/tipo
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_identifier_company_unique_active
ON public.patient_identifier (company_id, type, source, identifier)
WHERE active IS TRUE;

CREATE TRIGGER update_patient_identifier_updated_at
BEFORE UPDATE ON public.patient_identifier
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.patient_payer (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patient(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.client(id) ON DELETE RESTRICT,

  is_primary boolean NOT NULL DEFAULT false,
  coverage_percent numeric(5,2) NULL,  -- ex: 80.00 (opcional)
  start_date date NULL,
  end_date date NULL,
  notes text NULL,

  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT patient_payer_pkey PRIMARY KEY (id),

  CONSTRAINT patient_payer_coverage_check
    CHECK (coverage_percent IS NULL OR (coverage_percent >= 0 AND coverage_percent <= 100)),

  CONSTRAINT patient_payer_dates_check
    CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date)
);

CREATE INDEX IF NOT EXISTS idx_patient_payer_company
ON public.patient_payer (company_id);

CREATE INDEX IF NOT EXISTS idx_patient_payer_patient
ON public.patient_payer (patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_payer_client
ON public.patient_payer (client_id);

CREATE INDEX IF NOT EXISTS idx_patient_payer_patient_active
ON public.patient_payer (patient_id, active);

-- No máximo 1 pagador primário ativo por paciente
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_payer_primary_unique
ON public.patient_payer (patient_id)
WHERE is_primary IS TRUE AND active IS TRUE;

CREATE TRIGGER update_patient_payer_updated_at
BEFORE UPDATE ON public.patient_payer
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

