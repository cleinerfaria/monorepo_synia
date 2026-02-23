BEGIN;

-- =====================================================
-- Rename logo columns to new URL-based naming standard
-- =====================================================

ALTER TABLE public.system_settings
RENAME COLUMN logo_light TO logo_url_expanded_light;

ALTER TABLE public.system_settings
RENAME COLUMN logo_dark TO logo_url_expanded_dark;

ALTER TABLE public.system_settings
RENAME COLUMN logo_light_small TO logo_url_collapsed_light;

ALTER TABLE public.system_settings
RENAME COLUMN logo_dark_small TO logo_url_collapsed_dark;

COMMIT;