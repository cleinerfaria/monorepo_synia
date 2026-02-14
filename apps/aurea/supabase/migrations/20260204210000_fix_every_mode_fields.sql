-- =====================================================
-- FIX EVERY MODE: Update existing records with interval_minutes and time_start
-- =====================================================

BEGIN;

-- Update prescription items in 'every' mode to have interval_minutes calculated
-- and time_start set to a default value if null
UPDATE public.prescription_item
SET 
  interval_minutes = CASE 
    WHEN times_unit = 'day' THEN times_value * 1440
    WHEN times_unit = 'week' THEN times_value * 10080
    WHEN times_unit = 'month' THEN times_value * 43200
    ELSE NULL
  END,
  time_start = COALESCE(time_start, '08:00:00')
WHERE frequency_mode = 'every' 
  AND (interval_minutes IS NULL OR time_start IS NULL);

-- Now drop and recreate the constraint with the new requirements
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

COMMIT;
