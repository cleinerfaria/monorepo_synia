-- =====================================================
-- MIGRATION: 20260227110000_all_phone_fields_numeric_max_11.sql
-- DESCRIPTION: Normalize and enforce numeric-only phone fields (max 11 digits) across VidaSystem tables
-- =====================================================

-- 1) Normalize phone fields: keep only digits and convert empty values to NULL.
UPDATE public.professional
SET phone = NULLIF(regexp_replace(phone, '\D', '', 'g'), '')
WHERE phone IS NOT NULL
  AND company_id IS NOT NULL;

UPDATE public.client
SET phone = NULLIF(regexp_replace(phone, '\D', '', 'g'), '')
WHERE phone IS NOT NULL
  AND company_id IS NOT NULL;

UPDATE public.patient
SET phone = NULLIF(regexp_replace(phone, '\D', '', 'g'), '')
WHERE phone IS NOT NULL
  AND company_id IS NOT NULL;

UPDATE public.manufacturer
SET phone = NULLIF(regexp_replace(phone, '\D', '', 'g'), '')
WHERE phone IS NOT NULL
  AND company_id IS NOT NULL;

UPDATE public.supplier
SET phone = NULLIF(regexp_replace(phone, '\D', '', 'g'), '')
WHERE phone IS NOT NULL
  AND company_id IS NOT NULL;

UPDATE public.supplier
SET contact_phone = NULLIF(regexp_replace(contact_phone, '\D', '', 'g'), '')
WHERE contact_phone IS NOT NULL
  AND company_id IS NOT NULL;

UPDATE public.business_partner
SET phone = NULLIF(regexp_replace(phone, '\D', '', 'g'), '')
WHERE phone IS NOT NULL
  AND company_id IS NOT NULL;

-- 2) If value exceeds 11 digits and starts with 55, keep the last 11 digits.
UPDATE public.professional
SET phone = RIGHT(phone, 11)
WHERE phone IS NOT NULL
  AND company_id IS NOT NULL
  AND LENGTH(phone) > 11
  AND phone LIKE '55%';

UPDATE public.client
SET phone = RIGHT(phone, 11)
WHERE phone IS NOT NULL
  AND company_id IS NOT NULL
  AND LENGTH(phone) > 11
  AND phone LIKE '55%';

UPDATE public.patient
SET phone = RIGHT(phone, 11)
WHERE phone IS NOT NULL
  AND company_id IS NOT NULL
  AND LENGTH(phone) > 11
  AND phone LIKE '55%';

UPDATE public.manufacturer
SET phone = RIGHT(phone, 11)
WHERE phone IS NOT NULL
  AND company_id IS NOT NULL
  AND LENGTH(phone) > 11
  AND phone LIKE '55%';

UPDATE public.supplier
SET phone = RIGHT(phone, 11)
WHERE phone IS NOT NULL
  AND company_id IS NOT NULL
  AND LENGTH(phone) > 11
  AND phone LIKE '55%';

UPDATE public.supplier
SET contact_phone = RIGHT(contact_phone, 11)
WHERE contact_phone IS NOT NULL
  AND company_id IS NOT NULL
  AND LENGTH(contact_phone) > 11
  AND contact_phone LIKE '55%';

UPDATE public.business_partner
SET phone = RIGHT(phone, 11)
WHERE phone IS NOT NULL
  AND company_id IS NOT NULL
  AND LENGTH(phone) > 11
  AND phone LIKE '55%';

-- 3) Fail fast if there are still invalid values.
DO $$
DECLARE
  v_invalid_count integer;
BEGIN
  SELECT COUNT(*)
    INTO v_invalid_count
  FROM (
    SELECT phone AS value
    FROM public.professional
    WHERE company_id IS NOT NULL AND phone IS NOT NULL

    UNION ALL

    SELECT phone AS value
    FROM public.client
    WHERE company_id IS NOT NULL AND phone IS NOT NULL

    UNION ALL

    SELECT phone AS value
    FROM public.patient
    WHERE company_id IS NOT NULL AND phone IS NOT NULL

    UNION ALL

    SELECT phone AS value
    FROM public.manufacturer
    WHERE company_id IS NOT NULL AND phone IS NOT NULL

    UNION ALL

    SELECT phone AS value
    FROM public.supplier
    WHERE company_id IS NOT NULL AND phone IS NOT NULL

    UNION ALL

    SELECT contact_phone AS value
    FROM public.supplier
    WHERE company_id IS NOT NULL AND contact_phone IS NOT NULL

    UNION ALL

    SELECT phone AS value
    FROM public.business_partner
    WHERE company_id IS NOT NULL AND phone IS NOT NULL
  ) t
  WHERE t.value !~ '^[0-9]{1,11}$';

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION
      'Cannot enforce phone format globally. % row(s) still invalid (must be digits only and at most 11 chars).',
      v_invalid_count;
  END IF;
END $$;

-- 4) Enforce constraints on all phone fields.
ALTER TABLE public.professional
  DROP CONSTRAINT IF EXISTS ck_professional_phone_numeric_max_11;
ALTER TABLE public.professional
  ADD CONSTRAINT ck_professional_phone_numeric_max_11
  CHECK (phone IS NULL OR phone ~ '^[0-9]{1,11}$');

ALTER TABLE public.client
  DROP CONSTRAINT IF EXISTS ck_client_phone_numeric_max_11;
ALTER TABLE public.client
  ADD CONSTRAINT ck_client_phone_numeric_max_11
  CHECK (phone IS NULL OR phone ~ '^[0-9]{1,11}$');

ALTER TABLE public.patient
  DROP CONSTRAINT IF EXISTS ck_patient_phone_numeric_max_11;
ALTER TABLE public.patient
  ADD CONSTRAINT ck_patient_phone_numeric_max_11
  CHECK (phone IS NULL OR phone ~ '^[0-9]{1,11}$');

ALTER TABLE public.manufacturer
  DROP CONSTRAINT IF EXISTS ck_manufacturer_phone_numeric_max_11;
ALTER TABLE public.manufacturer
  ADD CONSTRAINT ck_manufacturer_phone_numeric_max_11
  CHECK (phone IS NULL OR phone ~ '^[0-9]{1,11}$');

ALTER TABLE public.supplier
  DROP CONSTRAINT IF EXISTS ck_supplier_phone_numeric_max_11;
ALTER TABLE public.supplier
  ADD CONSTRAINT ck_supplier_phone_numeric_max_11
  CHECK (phone IS NULL OR phone ~ '^[0-9]{1,11}$');

ALTER TABLE public.supplier
  DROP CONSTRAINT IF EXISTS ck_supplier_contact_phone_numeric_max_11;
ALTER TABLE public.supplier
  ADD CONSTRAINT ck_supplier_contact_phone_numeric_max_11
  CHECK (contact_phone IS NULL OR contact_phone ~ '^[0-9]{1,11}$');

ALTER TABLE public.business_partner
  DROP CONSTRAINT IF EXISTS ck_business_partner_phone_numeric_max_11;
ALTER TABLE public.business_partner
  ADD CONSTRAINT ck_business_partner_phone_numeric_max_11
  CHECK (phone IS NULL OR phone ~ '^[0-9]{1,11}$');
