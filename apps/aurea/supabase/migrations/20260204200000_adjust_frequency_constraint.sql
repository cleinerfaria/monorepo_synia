-- =====================================================
-- ADJUST PRESCRIPTION_ITEM FREQUENCY CONSTRAINT
-- Allow times_value and times_unit in 'every' mode
-- =====================================================

BEGIN;

-- Drop the existing constraint
ALTER TABLE public.prescription_item
DROP CONSTRAINT IF EXISTS chk_prescription_item_frequency_mode_fields;

-- Add the new, more flexible constraint
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
    AND time_start IS NOT NULL
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

-- Also update the time_checks constraint to be more flexible
ALTER TABLE public.prescription_item
DROP CONSTRAINT IF EXISTS chk_prescription_item_time_checks_len;

ALTER TABLE public.prescription_item
ADD CONSTRAINT chk_prescription_item_time_checks_len CHECK (
  time_checks IS NULL
  OR array_length(time_checks, 1) IS NULL
  OR array_length(time_checks, 1) >= 1
);

COMMIT;