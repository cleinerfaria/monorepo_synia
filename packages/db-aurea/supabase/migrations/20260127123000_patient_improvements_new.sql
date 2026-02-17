-- 1) Converter VARCHAR -> TEXT (somente se ainda estiver como varchar)
DO $$
BEGIN
  -- code
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'patient'
      AND column_name = 'code'
      AND data_type = 'character varying'
  ) THEN
    ALTER TABLE public.patient
      ALTER COLUMN code TYPE text;
  END IF;

  -- name
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'patient'
      AND column_name = 'name'
      AND data_type = 'character varying'
  ) THEN
    ALTER TABLE public.patient
      ALTER COLUMN name TYPE text;
  END IF;

  -- phone
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'patient'
      AND column_name = 'phone'
      AND data_type = 'character varying'
  ) THEN
    ALTER TABLE public.patient
      ALTER COLUMN phone TYPE text;
  END IF;

  -- email
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'patient'
      AND column_name = 'email'
      AND data_type = 'character varying'
  ) THEN
    ALTER TABLE public.patient
      ALTER COLUMN email TYPE text;
  END IF;
END $$;

-- 2) Adicionar name_normalized
ALTER TABLE public.patient
  ADD COLUMN IF NOT EXISTS name_normalized text;

-- 3) Extensão unaccent (se quiser usar para normalizar nome futuramente)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 4) (Opcional) preencher name_normalized para registros existentes
-- Como você disse que o banco é zerado, isso não é necessário,
-- mas não atrapalha se tiver poucos registros.
UPDATE public.patient
SET name_normalized =
  NULLIF(
    regexp_replace(
      lower(unaccent(btrim(name))),
      '\s+',
      ' ',
      'g'
    ),
    ''
  )
WHERE name IS NOT NULL
  AND (name_normalized IS NULL OR btrim(name_normalized) = '');

-- 5) CPF: garantir somente dígitos e 11 chars quando preenchido
ALTER TABLE public.patient
  DROP CONSTRAINT IF EXISTS patient_cpf_digits_check;

ALTER TABLE public.patient
  ADD CONSTRAINT patient_cpf_digits_check
  CHECK (
    cpf IS NULL
    OR cpf = ''
    OR cpf ~ '^\d{11}$'
  );

-- 6) (Opcional, recomendado) unique do code por company (parcial)
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_code_unique
ON public.patient (company_id, code)
WHERE code IS NOT NULL AND btrim(code) <> '';

-- 7) Ajustar o índice unique de cpf para ignorar '' também (se o do Copilot não ignorar direito)
-- Ele já criou: WHERE cpf IS NOT NULL AND cpf <> ''
-- Aqui garantimos com btrim e sem erro se já existe.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND n.nspname = 'public'
      AND c.relname = 'idx_patient_cpf_unique'
  ) THEN
    EXECUTE 'DROP INDEX public.idx_patient_cpf_unique';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_cpf_unique
ON public.patient (company_id, cpf)
WHERE cpf IS NOT NULL AND btrim(cpf) <> '';

ALTER TABLE public.patient
  ADD COLUMN IF NOT EXISTS father_name text,
  ADD COLUMN IF NOT EXISTS mother_name text;
