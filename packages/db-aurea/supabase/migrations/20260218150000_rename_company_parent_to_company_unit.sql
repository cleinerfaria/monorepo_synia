-- Create enum for company unit kind (matriz/filial)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'enum_company_unit_type'
  ) THEN
    CREATE TYPE public.enum_company_unit_type AS ENUM ('matriz', 'filial');
  END IF;
END;
$$;

-- Rename company_parent table to company_unit
DO $$
BEGIN
  IF to_regclass('public.company_parent') IS NOT NULL
    AND to_regclass('public.company_unit') IS NULL THEN
    ALTER TABLE public.company_parent RENAME TO company_unit;
  END IF;
END;
$$;

-- Rename foreign key columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'company'
      AND column_name = 'company_parent_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'company'
      AND column_name = 'company_unit_id'
  ) THEN
    ALTER TABLE public.company RENAME COLUMN company_parent_id TO company_unit_id;
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pad'
      AND column_name = 'company_parent_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pad'
      AND column_name = 'company_unit_id'
  ) THEN
    ALTER TABLE public.pad RENAME COLUMN company_parent_id TO company_unit_id;
  END IF;
END;
$$;

-- Add enum field to classify unit as matriz/filial
ALTER TABLE public.company_unit
  ADD COLUMN IF NOT EXISTS unit_type public.enum_company_unit_type NOT NULL DEFAULT 'matriz';

-- Keep existing rows as matriz by default
UPDATE public.company_unit
SET unit_type = 'matriz'
WHERE unit_type IS NULL;

-- Rename FK constraints (if they still have old names)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'company'
      AND constraint_name = 'company_company_parent_id_fkey'
  ) THEN
    ALTER TABLE public.company
      RENAME CONSTRAINT company_company_parent_id_fkey TO company_company_unit_id_fkey;
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'pad'
      AND constraint_name = 'pad_company_parent_id_fkey'
  ) THEN
    ALTER TABLE public.pad
      RENAME CONSTRAINT pad_company_parent_id_fkey TO pad_company_unit_id_fkey;
  END IF;
END;
$$;

-- Rename indexes for consistency
DO $$
BEGIN
  IF to_regclass('public.idx_company_parent_id') IS NOT NULL
    AND to_regclass('public.idx_company_unit_id') IS NULL THEN
    ALTER INDEX public.idx_company_parent_id RENAME TO idx_company_unit_id;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.idx_pad_company_parent_id') IS NOT NULL
    AND to_regclass('public.idx_pad_company_unit_id') IS NULL THEN
    ALTER INDEX public.idx_pad_company_parent_id RENAME TO idx_pad_company_unit_id;
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_company_parent_updated_at'
      AND tgrelid = 'public.company_unit'::regclass
  ) THEN
    ALTER TRIGGER update_company_parent_updated_at
      ON public.company_unit
      RENAME TO update_company_unit_updated_at;
  END IF;
END;
$$;

ALTER TABLE public.company_unit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_parent_select_policy" ON public.company_unit;
DROP POLICY IF EXISTS "company_parent_insert_policy" ON public.company_unit;
DROP POLICY IF EXISTS "company_parent_update_policy" ON public.company_unit;
DROP POLICY IF EXISTS "company_parent_delete_policy" ON public.company_unit;


CREATE POLICY "company_unit_select_policy" ON public.company_unit
  FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');


CREATE POLICY "company_unit_insert_policy" ON public.company_unit
  FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'authenticated');


CREATE POLICY "company_unit_update_policy" ON public.company_unit
  FOR UPDATE
  USING ((SELECT auth.role()) = 'authenticated');


CREATE POLICY "company_unit_delete_policy" ON public.company_unit
  FOR DELETE
  USING ((SELECT auth.role()) = 'authenticated');

