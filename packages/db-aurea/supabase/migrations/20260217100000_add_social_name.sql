-- =====================================================
-- MIGRATION: 20260217100000_add_social_name.sql
-- DESCRIPTION: Add social_name to professional and patient tables. 
--              Auto-fill professional.social_name with First + Last name if null.
-- =====================================================

-- 1) Alter Professional Table
ALTER TABLE public.professional 
ADD COLUMN IF NOT EXISTS social_name text;

-- 2) Alter Patient Table
ALTER TABLE public.patient 
ADD COLUMN IF NOT EXISTS social_name text;

-- 3) Create Trigger Function for Professional Social Name Default
CREATE OR REPLACE FUNCTION public.set_default_social_name()
RETURNS TRIGGER AS $$
DECLARE
    parts text[];
BEGIN
    -- Only update if social_name is NULL or empty string
    IF NEW.social_name IS NULL OR trim(NEW.social_name) = '' THEN
        parts := string_to_array(trim(NEW.name), ' ');
        IF array_length(parts, 1) > 1 THEN
            -- First Name + Last Name
            NEW.social_name := parts[1] || ' ' || parts[array_length(parts, 1)];
        ELSE
            -- Single name
            NEW.social_name := NEW.name;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4) Create Trigger
DROP TRIGGER IF EXISTS tr_set_professional_social_name ON public.professional;

CREATE TRIGGER tr_set_professional_social_name
BEFORE INSERT OR UPDATE ON public.professional
FOR EACH ROW
EXECUTE FUNCTION public.set_default_social_name();

-- 5) Backfill existing professionals who have null social_name
--    Using the same logic as the trigger
UPDATE public.professional
SET social_name = (
    CASE 
        WHEN array_length(string_to_array(trim(name), ' '), 1) > 1 THEN
            split_part(trim(name), ' ', 1) || ' ' || split_part(trim(name), ' ', array_length(string_to_array(trim(name), ' '), 1))
        ELSE
            trim(name)
    END
)
WHERE social_name IS NULL OR trim(social_name) = '';
