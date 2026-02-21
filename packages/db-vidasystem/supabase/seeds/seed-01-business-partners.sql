-- =====================================================
-- Seed 01: Business Partners
-- =====================================================

BEGIN;

DO $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT id INTO v_company_id
  FROM public.company
  WHERE document = '00.000.000/0001-00'
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Initial company not found. Run migrations first.';
  END IF;

  INSERT INTO public.business_partner (company_id, name, legal_name)
  SELECT v_company_id, v.name, v.legal_name
  FROM (
    VALUES
      ('COOPERN', 'COOPERN'),
      ('HUMANIZE', 'HUMANIZE'),
      ('SALUD CARE', 'SALUD CARE')
  ) AS v(name, legal_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.business_partner bp
    WHERE bp.company_id = v_company_id
      AND bp.name = v.name
  );
END $$;

COMMIT;
