-- Add geolocation fields to patient_address
-- latitude, longitude for geographic coordinates
-- use_for_service to indicate if this address should be used for service visits

ALTER TABLE public.patient_address
  ADD COLUMN IF NOT EXISTS latitude numeric(10, 8) NULL,
  ADD COLUMN IF NOT EXISTS longitude numeric(10, 8) NULL,
  ADD COLUMN IF NOT EXISTS use_for_service boolean NOT NULL DEFAULT false;

-- Create index for service addresses for faster queries
CREATE INDEX IF NOT EXISTS idx_patient_address_use_for_service
ON public.patient_address (patient_id, use_for_service)
WHERE use_for_service IS TRUE AND active IS TRUE;

-- Create index for geographic queries
CREATE INDEX IF NOT EXISTS idx_patient_address_geolocation
ON public.patient_address (latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
