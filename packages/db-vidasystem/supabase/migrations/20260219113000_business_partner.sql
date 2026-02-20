BEGIN;

-- =====================================================
-- BUSINESS PARTNER
-- Suppliers of workforce/services (not material/medication suppliers)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.business_partner (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  code text NULL,
  name text NOT NULL,
  legal_name text NULL,
  document text NULL,
  email text NULL,
  phone text NULL,
  zip text NULL,
  street text NULL,
  number text NULL,
  complement text NULL,
  district text NULL,
  city text NULL,
  state text NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_partner_pkey PRIMARY KEY (id),
  CONSTRAINT chk_business_partner_document_digits CHECK (
    NULLIF(btrim(document), '') IS NULL
    OR btrim(document) ~ '^[0-9]+$'
  )
);

CREATE INDEX IF NOT EXISTS idx_business_partner_company
ON public.business_partner (company_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_business_partner_company_code
ON public.business_partner (company_id, code)
WHERE code IS NOT NULL;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_business_partner_updated_at'
      AND tgrelid = 'public.business_partner'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER update_business_partner_updated_at
      BEFORE UPDATE ON public.business_partner
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- =====================================================
-- BUSINESS PARTNER x PROFESSION
-- =====================================================
CREATE TABLE IF NOT EXISTS public.business_partner_profession (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  business_partner_id uuid NOT NULL REFERENCES public.business_partner(id) ON DELETE CASCADE,
  profession_id uuid NOT NULL REFERENCES public.profession(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_partner_profession_pkey PRIMARY KEY (id),
  CONSTRAINT uq_business_partner_profession UNIQUE (business_partner_id, profession_id)
);

CREATE INDEX IF NOT EXISTS idx_business_partner_profession_company
ON public.business_partner_profession (company_id);

CREATE INDEX IF NOT EXISTS idx_business_partner_profession_partner
ON public.business_partner_profession (business_partner_id);

CREATE INDEX IF NOT EXISTS idx_business_partner_profession_profession
ON public.business_partner_profession (profession_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_business_partner_profession_updated_at'
      AND tgrelid = 'public.business_partner_profession'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER update_business_partner_profession_updated_at
      BEFORE UPDATE ON public.business_partner_profession
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Tenant consistency guard between relation table and referenced entities.
CREATE OR REPLACE FUNCTION public.business_partner_profession_company_integrity_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company uuid;
BEGIN
  SELECT bp.company_id
    INTO v_company
  FROM public.business_partner bp
  WHERE bp.id = NEW.business_partner_id;

  IF v_company IS NULL THEN
    RAISE EXCEPTION 'business_partner_id invalid';
  END IF;

  IF v_company IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'business_partner_id belongs to another company';
  END IF;

  SELECT p.company_id
    INTO v_company
  FROM public.profession p
  WHERE p.id = NEW.profession_id;

  IF v_company IS NULL THEN
    RAISE EXCEPTION 'profession_id invalid';
  END IF;

  IF v_company IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'profession_id belongs to another company';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'business_partner_profession_company_integrity_guard'
      AND tgrelid = 'public.business_partner_profession'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER business_partner_profession_company_integrity_guard
      BEFORE INSERT OR UPDATE OF company_id, business_partner_id, profession_id
      ON public.business_partner_profession
      FOR EACH ROW
      EXECUTE FUNCTION public.business_partner_profession_company_integrity_guard();
  END IF;
END $$;

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE public.business_partner ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_partner_profession ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_partner_select_policy"
  ON public.business_partner
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "business_partner_insert_policy"
  ON public.business_partner
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "business_partner_update_policy"
  ON public.business_partner
  FOR UPDATE
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "business_partner_delete_policy"
  ON public.business_partner
  FOR DELETE
  USING (company_id = public.get_user_company_id());

CREATE POLICY "business_partner_profession_select_policy"
  ON public.business_partner_profession
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "business_partner_profession_insert_policy"
  ON public.business_partner_profession
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "business_partner_profession_update_policy"
  ON public.business_partner_profession
  FOR UPDATE
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "business_partner_profession_delete_policy"
  ON public.business_partner_profession
  FOR DELETE
  USING (company_id = public.get_user_company_id());

COMMIT;
