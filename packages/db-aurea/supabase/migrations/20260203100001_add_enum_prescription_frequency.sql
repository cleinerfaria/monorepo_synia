ALTER TYPE public.enum_prescription_frequency_mode
ADD VALUE IF NOT EXISTS 'shift'
AFTER 'times_per';
