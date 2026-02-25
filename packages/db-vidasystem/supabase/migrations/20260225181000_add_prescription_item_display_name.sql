-- Add optional display name override for prescription items.
-- Keeps product/equipment/procedure relation intact while allowing custom text in prescription.

ALTER TABLE public.prescription_item
ADD COLUMN IF NOT EXISTS display_name text NULL;

