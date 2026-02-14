-- =====================================================
-- SYSTEM SETTINGS - Public read policy for login/bootstrap
-- =====================================================
-- Why:
-- - Login page and initial app bootstrap run without authenticated session.
-- - These screens need to read system branding (name, color, logos, favicon).
-- - Previous policy allowed SELECT only for super admins (authenticated).
--
-- Result:
-- - Any role (anon/authenticated) can read rows from system_settings.
-- - Write operations remain restricted to super admins (existing policies).

DROP POLICY IF EXISTS "Super admins can view system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Public can view system_settings" ON public.system_settings;

CREATE POLICY "Public can view system_settings"
  ON public.system_settings
  FOR SELECT
  TO public
  USING (true);

