-- =====================================================
-- SYSTEM SETTINGS - Client customization permissions
-- =====================================================
-- Adds explicit flags to indicate whether whitelabel managers
-- are allowed to customize client branding options.

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS allow_client_color_adjustment BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allow_client_logo_adjustment BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.system_settings.allow_client_color_adjustment
  IS 'Allows whitelabel managers to enable color customization for clients';

COMMENT ON COLUMN public.system_settings.allow_client_logo_adjustment
  IS 'Allows whitelabel managers to enable logo customization for clients';
