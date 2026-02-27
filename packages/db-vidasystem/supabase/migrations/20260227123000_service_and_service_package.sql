-- =====================================================
-- Split service catalogs:
-- 1) PAD catalog: pad_service -> service_package
-- 2) General catalog: new public.service
-- =====================================================

-- 1) Rename PAD table to service_package (preserve existing data)
DO $$
BEGIN
  IF to_regclass('public.pad_service') IS NOT NULL
     AND to_regclass('public.service_package') IS NULL THEN
    ALTER TABLE public.pad_service RENAME TO service_package;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.ux_pad_service_company_code') IS NOT NULL
     AND to_regclass('public.ux_service_package_company_code') IS NULL THEN
    ALTER INDEX public.ux_pad_service_company_code RENAME TO ux_service_package_company_code;
  END IF;

  IF to_regclass('public.ux_pad_service_company_name') IS NOT NULL
     AND to_regclass('public.ux_service_package_company_name') IS NULL THEN
    ALTER INDEX public.ux_pad_service_company_name RENAME TO ux_service_package_company_name;
  END IF;

  IF to_regclass('public.idx_pad_service_company_active') IS NOT NULL
     AND to_regclass('public.idx_service_package_company_active') IS NULL THEN
    ALTER INDEX public.idx_pad_service_company_active RENAME TO idx_service_package_company_active;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'service_package'
      AND t.tgname = 'update_pad_service_updated_at'
  ) THEN
    ALTER TRIGGER update_pad_service_updated_at ON public.service_package
      RENAME TO update_service_package_updated_at;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.service_package ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_package'
      AND policyname = 'pad_service_select_policy'
  ) THEN
    ALTER POLICY "pad_service_select_policy" ON public.service_package
      RENAME TO "service_package_select_policy";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_package'
      AND policyname = 'pad_service_insert_policy'
  ) THEN
    ALTER POLICY "pad_service_insert_policy" ON public.service_package
      RENAME TO "service_package_insert_policy";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_package'
      AND policyname = 'pad_service_update_policy'
  ) THEN
    ALTER POLICY "pad_service_update_policy" ON public.service_package
      RENAME TO "service_package_update_policy";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_package'
      AND policyname = 'pad_service_delete_policy'
  ) THEN
    ALTER POLICY "pad_service_delete_policy" ON public.service_package
      RENAME TO "service_package_delete_policy";
  END IF;
END $$;

-- Keep PAD guard aligned with renamed table
CREATE OR REPLACE FUNCTION public.pad_company_integrity_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_company uuid;
  v_patient uuid;
BEGIN
  IF NEW.patient_payer_id IS NOT NULL THEN
    SELECT pp.company_id, pp.patient_id
      INTO v_company, v_patient
    FROM public.patient_payer pp
    WHERE pp.id = NEW.patient_payer_id;

    IF v_company IS NULL THEN
      RAISE EXCEPTION 'patient_payer_id invalid';
    END IF;

    IF v_company IS DISTINCT FROM NEW.company_id THEN
      RAISE EXCEPTION 'patient_payer_id belongs to another company';
    END IF;

    IF v_patient IS DISTINCT FROM NEW.patient_id THEN
      RAISE EXCEPTION 'patient_payer_id does not belong to selected patient';
    END IF;
  END IF;

  IF NEW.company_unit_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.company_unit cu
      WHERE cu.id = NEW.company_unit_id
    ) THEN
      RAISE EXCEPTION 'company_unit_id invalid';
    END IF;
  END IF;

  IF NEW.professional_id IS NOT NULL THEN
    SELECT p.company_id
      INTO v_company
    FROM public.professional p
    WHERE p.id = NEW.professional_id;

    IF v_company IS NULL THEN
      RAISE EXCEPTION 'professional_id invalid';
    END IF;

    IF v_company IS DISTINCT FROM NEW.company_id THEN
      RAISE EXCEPTION 'professional_id belongs to another company';
    END IF;
  END IF;

  IF NEW.pad_service_id IS NOT NULL THEN
    SELECT sp.company_id
      INTO v_company
    FROM public.service_package sp
    WHERE sp.id = NEW.pad_service_id;

    IF v_company IS NULL THEN
      RAISE EXCEPTION 'pad_service_id invalid';
    END IF;

    IF v_company IS DISTINCT FROM NEW.company_id THEN
      RAISE EXCEPTION 'pad_service_id belongs to another company';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) New general service catalog per company
CREATE TABLE IF NOT EXISTS public.service (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_service_company_code
  ON public.service (company_id, lower(code));

CREATE UNIQUE INDEX IF NOT EXISTS ux_service_company_name
  ON public.service (company_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_service_company_active
  ON public.service (company_id, is_active, sort_order, name);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_service_updated_at'
      AND tgrelid = 'public.service'::regclass
  ) THEN
    CREATE TRIGGER update_service_updated_at
      BEFORE UPDATE ON public.service
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.service ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_select_policy ON public.service;
DROP POLICY IF EXISTS service_insert_policy ON public.service;
DROP POLICY IF EXISTS service_update_policy ON public.service;
DROP POLICY IF EXISTS service_delete_policy ON public.service;

CREATE POLICY service_select_policy ON public.service
  FOR SELECT
  USING (company_id = (SELECT public.get_user_company_id()));

CREATE POLICY service_insert_policy ON public.service
  FOR INSERT
  WITH CHECK (company_id = (SELECT public.get_user_company_id()));

CREATE POLICY service_update_policy ON public.service
  FOR UPDATE
  USING (company_id = (SELECT public.get_user_company_id()))
  WITH CHECK (company_id = (SELECT public.get_user_company_id()));

CREATE POLICY service_delete_policy ON public.service
  FOR DELETE
  USING (company_id = (SELECT public.get_user_company_id()));
