-- =====================================================
-- SYSTEM SETTINGS - Rename login logo columns to generic logo columns
-- =====================================================
-- Goal:
-- - Replace logo_login_light/logo_login_dark with:
--   logo_light, logo_light_small, logo_dark, logo_dark_small
-- - Preserve existing values during migration

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'system_settings'
      AND column_name = 'logo_login_light'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'system_settings'
      AND column_name = 'logo_light'
  ) THEN
    ALTER TABLE public.system_settings
      RENAME COLUMN logo_login_light TO logo_light;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'system_settings'
      AND column_name = 'logo_login_dark'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'system_settings'
      AND column_name = 'logo_dark'
  ) THEN
    ALTER TABLE public.system_settings
      RENAME COLUMN logo_login_dark TO logo_dark;
  END IF;
END $$;

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS logo_light TEXT,
  ADD COLUMN IF NOT EXISTS logo_light_small TEXT,
  ADD COLUMN IF NOT EXISTS logo_dark TEXT,
  ADD COLUMN IF NOT EXISTS logo_dark_small TEXT;

-- Backup fill for environments where rename was not applied.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'system_settings'
      AND column_name = 'logo_login_light'
  ) THEN
    EXECUTE '
      UPDATE public.system_settings
      SET logo_light = COALESCE(logo_light, logo_login_light)
    ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'system_settings'
      AND column_name = 'logo_login_dark'
  ) THEN
    EXECUTE '
      UPDATE public.system_settings
      SET logo_dark = COALESCE(logo_dark, logo_login_dark)
    ';
  END IF;
END $$;

ALTER TABLE public.system_settings
  DROP COLUMN IF EXISTS logo_login_light,
  DROP COLUMN IF EXISTS logo_login_dark;

COMMENT ON COLUMN public.system_settings.logo_light
  IS 'Path/URL da logo principal para tema claro (ex: system_assets/logo_light.png)';
COMMENT ON COLUMN public.system_settings.logo_light_small
  IS 'Path/URL da logo compacta para tema claro (ex: system_assets/logo_light_small.png)';
COMMENT ON COLUMN public.system_settings.logo_dark
  IS 'Path/URL da logo principal para tema escuro (ex: system_assets/logo_dark.png)';
COMMENT ON COLUMN public.system_settings.logo_dark_small
  IS 'Path/URL da logo compacta para tema escuro (ex: system_assets/logo_dark_small.png)';
