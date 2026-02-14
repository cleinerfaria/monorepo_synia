BEGIN;

-- Ensure no legacy 1..7 check constraint blocks period selections above 7 days.
DO $$
DECLARE
  v_constraint record;
BEGIN
  IF to_regclass('public.prescription_print') IS NULL THEN
    RETURN;
  END IF;

  -- Drop known legacy constraints and any 7-day cap variants.
  FOR v_constraint IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.prescription_print'::regclass
      AND c.contype = 'c'
      AND (
        c.conname = 'chk_prescription_print_period'
        OR (
          pg_get_constraintdef(c.oid) ILIKE '%period_end%'
          AND pg_get_constraintdef(c.oid) ILIKE '%period_start%'
          AND (
            pg_get_constraintdef(c.oid) ILIKE '%<= 7%'
            OR pg_get_constraintdef(c.oid) ILIKE '%< 8%'
            OR pg_get_constraintdef(c.oid) ILIKE '%between 1 and 7%'
          )
        )
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE public.prescription_print DROP CONSTRAINT %I',
      v_constraint.conname
    );
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.prescription_print'::regclass
      AND c.contype = 'c'
      AND c.conname = 'prescription_print_period_range_check'
  ) THEN
    EXECUTE '
      ALTER TABLE public.prescription_print
      DROP CONSTRAINT prescription_print_period_range_check
    ';
  END IF;

  EXECUTE '
    ALTER TABLE public.prescription_print
    ADD CONSTRAINT prescription_print_period_range_check
    CHECK (
      period_end >= period_start
      AND (period_end - period_start + 1) BETWEEN 1 AND 14
    )
  ';
END;
$$;

COMMIT;

