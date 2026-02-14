-- Migration: allow PRN items in "every" mode without initial time
-- Business rule: for PRN (is_prn = true), time_start can be null even with interval.

BEGIN;

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
    AND times_value IS NOT NULL
    AND times_value > 0
    AND times_unit IS NOT NULL
    AND interval_minutes IS NOT NULL
    AND interval_minutes > 0
    AND (is_prn = TRUE OR time_start IS NOT NULL)
  )
  OR
  (
    frequency_mode = 'times_per'
    AND times_value IS NOT NULL
    AND times_value > 0
    AND times_unit IS NOT NULL
  )
  OR
  (
    frequency_mode = 'shift'
    AND times_value IS NOT NULL
    AND times_value > 0
    AND times_unit IS NOT NULL
  )
);

COMMIT;
