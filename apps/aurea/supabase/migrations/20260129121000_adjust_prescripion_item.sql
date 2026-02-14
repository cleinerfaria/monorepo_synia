BEGIN;

-- =====================================================
-- 1) ENUMS (padronizados com prefixo enum_)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_prescription_item_type') THEN
    CREATE TYPE public.enum_prescription_item_type AS ENUM (
      'medication',
      'material',
      'diet',
      'procedure',
      'equipment'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_prescription_times_unit') THEN
    CREATE TYPE public.enum_prescription_times_unit AS ENUM (
      'day',
      'week',
      'month'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_prescription_frequency_mode') THEN
    CREATE TYPE public.enum_prescription_frequency_mode AS ENUM (
      'every',
      'times_per'
    );
  END IF;
END$$;

-- =====================================================
-- 1.1) BACKWARD-COMPAT RENAME (se enums antigos existirem)
-- - Execute com segurança: só renomeia se o novo não existe e o antigo existe
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_prescription_item_type')
     AND EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prescription_item_type') THEN
    ALTER TYPE public.prescription_item_type RENAME TO enum_prescription_item_type;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_prescription_times_unit')
     AND EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prescription_times_unit') THEN
    ALTER TYPE public.prescription_times_unit RENAME TO enum_prescription_times_unit;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_prescription_frequency_mode')
     AND EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prescription_frequency_mode') THEN
    ALTER TYPE public.prescription_frequency_mode RENAME TO enum_prescription_frequency_mode;
  END IF;
END$$;

-- =====================================================
-- 2) PRESCRIPTION_ITEM: ALTER TABLE
-- =====================================================

-- 2.1) procedure_id (relation to public.procedure)
ALTER TABLE public.prescription_item
ADD COLUMN IF NOT EXISTS procedure_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prescription_item_procedure_id_fkey'
  ) THEN
    ALTER TABLE public.prescription_item
    ADD CONSTRAINT prescription_item_procedure_id_fkey
    FOREIGN KEY (procedure_id) REFERENCES public.procedure(id) ON DELETE SET NULL;
  END IF;
END$$;

-- 2.2) item_type -> enum_prescription_item_type
ALTER TABLE public.prescription_item
DROP CONSTRAINT IF EXISTS prescription_item_item_type_check;

ALTER TABLE public.prescription_item
ALTER COLUMN item_type TYPE public.enum_prescription_item_type
USING (item_type::text::public.enum_prescription_item_type);

-- 2.3) qty -> quantity (canonical)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'prescription_item'
      AND column_name = 'qty'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'prescription_item'
      AND column_name = 'quantity'
  ) THEN
    ALTER TABLE public.prescription_item RENAME COLUMN qty TO quantity;
  END IF;
END$$;

-- 2.4) Remove legacy free-text columns
ALTER TABLE public.prescription_item
DROP COLUMN IF EXISTS dosage_text,
DROP COLUMN IF EXISTS frequency_text,
DROP COLUMN IF EXISTS notes,
DROP COLUMN IF EXISTS route_text;

-- 2.5) Clinical / control fields
ALTER TABLE public.prescription_item
ADD COLUMN IF NOT EXISTS is_prn boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_continuous_use boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS justification text NULL,
ADD COLUMN IF NOT EXISTS instructions_use text NULL,
ADD COLUMN IF NOT EXISTS instructions_pharmacy text NULL,
ADD COLUMN IF NOT EXISTS diluent_text text NULL;

-- 2.6) Frequency structured fields (shifts handled via prescription_item_shift)
ALTER TABLE public.prescription_item
ADD COLUMN IF NOT EXISTS frequency_mode public.enum_prescription_frequency_mode NULL,
ADD COLUMN IF NOT EXISTS interval_minutes integer NULL,
ADD COLUMN IF NOT EXISTS time_start time NULL,
ADD COLUMN IF NOT EXISTS times_value integer NULL,
ADD COLUMN IF NOT EXISTS times_unit public.enum_prescription_times_unit NULL,
ADD COLUMN IF NOT EXISTS time_checks time[] NULL;

-- =====================================================
-- 3) CONSTRAINTS
-- =====================================================

-- 3.1) Exactly one target per item_type
ALTER TABLE public.prescription_item
DROP CONSTRAINT IF EXISTS chk_prescription_item_target_by_type;

ALTER TABLE public.prescription_item
ADD CONSTRAINT chk_prescription_item_target_by_type CHECK (
  (
    item_type IN ('medication','material','diet')
    AND product_id IS NOT NULL
    AND equipment_id IS NULL
    AND procedure_id IS NULL
  )
  OR
  (
    item_type = 'equipment'
    AND equipment_id IS NOT NULL
    AND product_id IS NULL
    AND procedure_id IS NULL
  )
  OR
  (
    item_type = 'procedure'
    AND procedure_id IS NOT NULL
    AND product_id IS NULL
    AND equipment_id IS NULL
  )
);

-- 3.2) Frequency fields consistency
ALTER TABLE public.prescription_item
DROP CONSTRAINT IF EXISTS chk_prescription_item_frequency_mode_fields;

ALTER TABLE public.prescription_item
ADD CONSTRAINT chk_prescription_item_frequency_mode_fields CHECK (
  (
    frequency_mode IS NULL
    AND interval_minutes IS NULL
    AND time_start IS NULL
    AND times_value IS NULL
    AND times_unit IS NULL
    AND time_checks IS NULL
  )
  OR
  (
    frequency_mode = 'every'
    AND interval_minutes IS NOT NULL
    AND interval_minutes > 0
    AND time_start IS NOT NULL
    AND times_value IS NULL
    AND times_unit IS NULL
  )
  OR
  (
    frequency_mode = 'times_per'
    AND times_value IS NOT NULL
    AND times_value > 0
    AND times_unit IS NOT NULL
    AND interval_minutes IS NULL
    AND time_start IS NULL
  )
);

-- 3.3) time_checks validation
ALTER TABLE public.prescription_item
DROP CONSTRAINT IF EXISTS chk_prescription_item_time_checks_len;

ALTER TABLE public.prescription_item
ADD CONSTRAINT chk_prescription_item_time_checks_len CHECK (
  time_checks IS NULL
  OR array_length(time_checks, 1) IS NULL
  OR (
    frequency_mode = 'times_per'
    AND times_unit = 'day'
    AND times_value IS NOT NULL
    AND array_length(time_checks, 1) = times_value
  )
  OR (
    frequency_mode = 'every'
    AND array_length(time_checks, 1) >= 1
  )
);

-- =====================================================
-- 4) INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_prescription_item_company_type
  ON public.prescription_item USING btree (company_id, item_type) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_prescription_item_company_frequency
  ON public.prescription_item USING btree (company_id, frequency_mode) TABLESPACE pg_default;

COMMIT;
