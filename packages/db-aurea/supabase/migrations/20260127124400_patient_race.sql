-- PATIENT: add race (Brazil/SUS/IBGE standard) as ENUM
-- Options: white, black, brown, yellow, indigenous, not_informed
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'race_type') THEN
    CREATE TYPE public.race_type AS ENUM (
      'white',
      'black',
      'brown',
      'yellow',
      'indigenous',
      'not_informed'
    );
  END IF;
END $$;

ALTER TABLE public.patient
  ADD COLUMN IF NOT EXISTS race public.race_type;

-- Define default + NOT NULL (recommended)
ALTER TABLE public.patient
  ALTER COLUMN race SET DEFAULT 'not_informed'::public.race_type;

UPDATE public.patient
SET race = 'not_informed'::public.race_type
WHERE race IS NULL;

ALTER TABLE public.patient
  ALTER COLUMN race SET NOT NULL;

