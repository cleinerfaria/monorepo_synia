-- =====================================================
-- Theme Preference Enum and app_user column - Migration
-- Supabase (PostgreSQL)
-- =====================================================

DO $$
BEGIN

  -- Create enum for theme preference if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_theme_preference') THEN
    CREATE TYPE public.enum_theme_preference AS ENUM (
      'light',
      'dark',
      'system'
    );
  END IF;

END
$$;

-- Add theme column to app_user table if it doesn't exist
ALTER TABLE public.app_user
ADD COLUMN IF NOT EXISTS theme public.enum_theme_preference DEFAULT 'system'::public.enum_theme_preference;

COMMENT ON COLUMN public.app_user.theme
  IS 'User theme preference: light, dark, or system (follows OS preference)';
