-- =====================================================
-- PROCEDURE (ajustada)
-- - Categoria operacional via ENUM (visit/care/therapy/administration/evaluation)
-- - unit_id -> unit_of_measure
-- =====================================================

-- 1) Enum de categoria (cria se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'procedure_category') THEN
    CREATE TYPE public.procedure_category AS ENUM (
      'visit',
      'care',
      'therapy',
      'administration',
      'evaluation'
    );
  END IF;
END$$;

-- 2) Tabela
CREATE TABLE IF NOT EXISTS public.procedure (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  code text NULL,
  name text NOT NULL,
  category public.procedure_category NOT NULL,
  unit_id uuid NULL,
  description text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT procedure_pkey PRIMARY KEY (id),
  CONSTRAINT procedure_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.company(id) ON DELETE CASCADE,
  CONSTRAINT procedure_unit_id_fkey
    FOREIGN KEY (unit_id) REFERENCES public.unit_of_measure(id) ON DELETE SET NULL,
  CONSTRAINT procedure_code_unique UNIQUE (company_id, code)
) TABLESPACE pg_default;

-- 3) Índices
CREATE INDEX IF NOT EXISTS idx_procedure_company
  ON public.procedure USING btree (company_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_procedure_company_category
  ON public.procedure USING btree (company_id, category) TABLESPACE pg_default;

--  4) Trigger updated_at
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger t
    WHERE t.tgname = 'update_procedure_updated_at'
      AND t.tgrelid = 'public.procedure'::regclass
      AND NOT t.tgisinternal
  ) THEN
    EXECUTE 'DROP TRIGGER update_procedure_updated_at ON public.procedure';
  END IF;
END $$;
CREATE TRIGGER update_procedure_updated_at
BEFORE UPDATE ON public.procedure
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 5) PROCEDURE: ADD RLS POLICIES
-- =====================================================

-- 5.1) Enable RLS on procedure table if not already enabled
ALTER TABLE public.procedure ENABLE ROW LEVEL SECURITY;

-- 5.2) Drop existing policies if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'procedure'
      AND policyname = 'Users can view procedures in their company'
  ) THEN
    EXECUTE 'DROP POLICY "Users can view procedures in their company" ON public.procedure';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'procedure'
      AND policyname = 'Users can insert procedures in their company'
  ) THEN
    EXECUTE 'DROP POLICY "Users can insert procedures in their company" ON public.procedure';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'procedure'
      AND policyname = 'Users can update procedures in their company'
  ) THEN
    EXECUTE 'DROP POLICY "Users can update procedures in their company" ON public.procedure';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'procedure'
      AND policyname = 'Users can delete procedures in their company'
  ) THEN
    EXECUTE 'DROP POLICY "Users can delete procedures in their company" ON public.procedure';
  END IF;
END $$;

-- 5.3) Create SELECT policy
CREATE POLICY "Users can view procedures in their company"
    ON public.procedure FOR SELECT
    USING (company_id = get_user_company_id());

-- 5.4) Create INSERT policy
CREATE POLICY "Users can insert procedures in their company"
    ON public.procedure FOR INSERT
    WITH CHECK (company_id = get_user_company_id());

-- 5.5) Create UPDATE policy
CREATE POLICY "Users can update procedures in their company"
    ON public.procedure FOR UPDATE
    USING (company_id = get_user_company_id())
    WITH CHECK (company_id = get_user_company_id());

-- 5.6) Create DELETE policy
CREATE POLICY "Users can delete procedures in their company"
    ON public.procedure FOR DELETE
    USING (company_id = get_user_company_id());