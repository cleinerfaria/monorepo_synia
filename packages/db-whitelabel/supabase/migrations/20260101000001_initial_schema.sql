-- =====================================================
-- BASE MULTI-TENANT (GENÉRICA) - Migration 01
-- Supabase (PostgreSQL)
-- Regras:
-- - Nunca usar varchar -> sempre TEXT
-- - Multi-tenant com company + app_user
-- - Funções SECURITY DEFINER com search_path travado
-- =====================================================

-- =====================================================
-- A) MULTI-EMPRESA E USUÁRIOS
-- =====================================================

-- Tabela de empresas (tenant)
CREATE TABLE public.company (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    trade_name TEXT,
    document TEXT,

    -- Logos
    logo_url_expanded_dark TEXT,
    logo_url_collapsed_dark TEXT,
    logo_url_expanded_light TEXT,
    logo_url_collapsed_light TEXT,

    primary_color TEXT DEFAULT '#1aa2ff',
    theme_preference TEXT DEFAULT 'light'
      CHECK (theme_preference IN ('light', 'dark', 'system')),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN public.company.logo_url_expanded_dark
  IS 'Logo completa para exibição em áreas amplas (menu expandido) - tema escuro';
COMMENT ON COLUMN public.company.logo_url_collapsed_dark
  IS 'Logo reduzida/ícone para exibição em áreas compactas (menu colapsado) - tema escuro';
COMMENT ON COLUMN public.company.logo_url_expanded_light
  IS 'Logo completa para exibição em áreas amplas (menu expandido) - tema claro';
COMMENT ON COLUMN public.company.logo_url_collapsed_light
  IS 'Logo reduzida/ícone para exibição em áreas compactas (menu colapsado) - tema claro';


-- Unicidade flexível para document (somente quando preenchido)
CREATE UNIQUE INDEX IF NOT EXISTS ux_company_document
ON public.company (document)
WHERE document IS NOT NULL
  AND btrim(document) <> '';

-- =====================================================
-- ENUM: theme preference (app_user)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_theme_preference') THEN
    CREATE TYPE public.enum_theme_preference AS ENUM ('light', 'dark', 'system');
  END IF;
END
$$;

-- Tabela de usuários (vinculada ao Supabase Auth)
CREATE TABLE public.app_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
    auth_user_id UUID NOT NULL, -- Referência ao auth.users.id (permite múltiplas empresas)
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    access_profile_id UUID NOT NULL,
    theme public.enum_theme_preference DEFAULT 'system'::public.enum_theme_preference,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint que permite um usuário estar em múltiplas empresas, mas apenas uma vez por empresa
    UNIQUE (auth_user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_app_user_company ON public.app_user(company_id);
CREATE INDEX IF NOT EXISTS idx_app_user_auth ON public.app_user(auth_user_id);

COMMENT ON COLUMN public.app_user.theme
  IS 'User theme preference: light, dark, or system (follows OS preference)';

-- =====================================================
-- TRIGGER: updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_company_updated_at
BEFORE UPDATE ON public.company
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_app_user_updated_at
BEFORE UPDATE ON public.app_user
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FUNÇÃO: obter company_id do usuário autenticado
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    company_uuid UUID;
BEGIN
    SELECT au.company_id
      INTO company_uuid
    FROM public.app_user au
    WHERE au.auth_user_id = auth.uid();

    RETURN company_uuid;
END;
$$;

-- =====================================================
-- FUNÇÃO: verificar se usuário autenticado é admin
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Placeholder: redefine this function after access_profile exists
    RETURN FALSE;
END;
$$;

-- =====================================================
-- OBS:
-- - Não criamos "company inicial" aqui para manter a base genérica.
-- - A criação do tenant + primeiro admin deve ocorrer no onboarding
--   (backend/service role) ou em uma seed separada de DEV.
-- =====================================================
