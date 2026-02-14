-- =====================================================
-- SYSTEM SETTINGS TABLE - Migration
-- Configurações globais do sistema (não multi-tenant)
-- Regras:
-- - Tabela global, sem company_id
-- - Somente super admins podem visualizar e atualizar
-- - Nunca usar varchar -> sempre TEXT
-- =====================================================

-- =====================================================
-- CREATE TABLE
-- =====================================================

CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    basic_color TEXT,
    logo_login_light TEXT,
    logo_login_dark TEXT,
    login_frase TEXT,
    favicon TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.system_settings IS 'Configurações globais do sistema (tema, logos, cores)';
COMMENT ON COLUMN public.system_settings.name IS 'Identificador único das configurações (ex: default, branding)';
COMMENT ON COLUMN public.system_settings.basic_color IS 'Cor primária do sistema (hex color)';
COMMENT ON COLUMN public.system_settings.logo_login_light IS 'Path/URL da logo de login - tema claro (no bucket: system_assets/login/logo_login_light.png)';
COMMENT ON COLUMN public.system_settings.logo_login_dark IS 'Path/URL da logo de login - tema escuro (no bucket: system_assets/login/logo_login_dark.png)';
COMMENT ON COLUMN public.system_settings.login_frase IS 'Frase/tagline exibida na página de login';
COMMENT ON COLUMN public.system_settings.favicon IS 'Path/URL do favicon do sistema (no bucket: system_assets/favicon.svg)';

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX idx_system_settings_name ON public.system_settings(name);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings FORCE ROW LEVEL SECURITY;

-- SELECT: somente super admins
CREATE POLICY "Super admins can view system_settings"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (public.is_superadmin());

-- UPDATE: somente super admins
CREATE POLICY "Super admins can update system_settings"
  ON public.system_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- DELETE: somente super admins
CREATE POLICY "Super admins can delete system_settings"
  ON public.system_settings
  FOR DELETE
  TO authenticated
  USING (public.is_superadmin());

-- INSERT: somente super admins
CREATE POLICY "Super admins can insert system_settings"
  ON public.system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_superadmin());

-- =====================================================
-- INITIAL DATA
-- =====================================================

INSERT INTO public.system_settings (name, basic_color, login_frase)
VALUES ('Synia', '#1aa2ff', 'Sistema de gestão de empresas')
ON CONFLICT (name) DO NOTHING;

-- Nota: As URLs dos arquivos (logo_login_light, logo_login_dark, favicon) serão
-- preenchidas após o upload dos arquivos para o bucket via script:
-- node scripts/upload-system-assets.cjs
--
-- As URLs seguem o padrão:
-- logo_login_light: {SUPABASE_URL}/storage/v1/object/public/system_assets/login/logo_login_light.png
-- logo_login_dark: {SUPABASE_URL}/storage/v1/object/public/system_assets/login/logo_login_dark.png
-- favicon: {SUPABASE_URL}/storage/v1/object/public/system_assets/favicon.svg
