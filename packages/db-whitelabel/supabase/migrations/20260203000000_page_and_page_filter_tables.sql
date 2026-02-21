-- =====================================================
-- MIGRATION: PAGE AND PAGE FILTER (com label/order_index/active)
-- =====================================================
-- Objetivo:
-- - Criar tabelas para gerenciar páginas e filtros dinâmicos
-- - Permitir filtros editáveis com ordenação e habilitar/desabilitar
-- - Multi-tenant seguro via RLS (company_id)
-- - Remover campo "sql" e substituir por "options_view" (view segura/whitelisted)
-- =====================================================

-- =====================================================
-- 0) EXTENSÕES / PRÉ-REQUISITOS
-- =====================================================
-- Requer:
-- - public.update_updated_at_column()
-- - public.app_user (com auth_user_id, company_id, access_profile_id)
-- - public.access_profile (com is_admin, code)
-- - public.company (id)

-- =====================================================
-- 1) ENUMS PARA PAGE_FILTER
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_page_filter_type') THEN
    CREATE TYPE public.enum_page_filter_type AS ENUM (
      'select',
      'multiselect',
      'input',
      'textarea',
      'date',
      'daterange',
      'number',
      'checkbox',
      'radio'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_page_filter_subtype') THEN
    CREATE TYPE public.enum_page_filter_subtype AS ENUM (
      'text',
      'email',
      'phone',
      'url',
      'password',
      'search',
      'company',
      'user',
      'status',
      'category',
      'tag',
      'period',
      'custom'
    );
  END IF;
END
$$;

COMMENT ON TYPE public.enum_page_filter_type IS 'Tipos de filtro disponíveis (select, input, date, etc.)';
COMMENT ON TYPE public.enum_page_filter_subtype IS 'Subtipos de filtro para especificações adicionais';

-- =====================================================
-- 2) TABELA PAGE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.page (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  meta_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT page_company_name_unique UNIQUE (company_id, name)
);

COMMENT ON TABLE public.page IS 'Tabela de páginas do sistema - cada página pode ter múltiplos filtros';
COMMENT ON COLUMN public.page.company_id IS 'ID da empresa proprietária da página';
COMMENT ON COLUMN public.page.name IS 'Nome identificador da página';
COMMENT ON COLUMN public.page.meta_data IS 'Metadados adicionais da página em formato JSON';

-- Trigger para manter updated_at sempre atualizado
DROP TRIGGER IF EXISTS trg_page_updated_at ON public.page;
CREATE TRIGGER trg_page_updated_at
  BEFORE UPDATE ON public.page
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_page_company_id ON public.page(company_id);

-- =====================================================
-- 3) TABELA PAGE_FILTER
-- =====================================================
-- Mudanças:
-- - Adiciona: label, order_index, active
-- - Remove: sql
-- - Adiciona: options_view (nome de view para opções de select/multiselect)
--   Observação: options_view é o "ponteiro" para a view que o backend irá consultar
--   para obter opções (pode ser whitelisted no backend).

CREATE TABLE IF NOT EXISTS public.page_filter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES public.page(id) ON DELETE CASCADE,

  type public.enum_page_filter_type NOT NULL DEFAULT 'input',
  subtype public.enum_page_filter_subtype DEFAULT 'text',

  name TEXT NOT NULL,
  label TEXT,
  placeholder TEXT,

  -- Nome da VIEW usada para popular opções em filtros select/multiselect
  -- Ex: 'vw_filter_clientes' (o backend deve restringir/validar)
  options_view TEXT,

  order_index INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,

  meta_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT page_filter_page_name_unique UNIQUE (page_id, name)
);

COMMENT ON TABLE public.page_filter IS 'Tabela de filtros dinâmicos para páginas - permite criar filtros editáveis';
COMMENT ON COLUMN public.page_filter.company_id IS 'ID da empresa proprietária do filtro';
COMMENT ON COLUMN public.page_filter.page_id IS 'ID da página à qual o filtro pertence';
COMMENT ON COLUMN public.page_filter.type IS 'Tipo do filtro (select, input, date, etc.)';
COMMENT ON COLUMN public.page_filter.subtype IS 'Subtipo do filtro para especificações adicionais';
COMMENT ON COLUMN public.page_filter.name IS 'Nome identificador do filtro';
COMMENT ON COLUMN public.page_filter.label IS 'Rótulo exibido na interface (texto amigável)';
COMMENT ON COLUMN public.page_filter.placeholder IS 'Texto de placeholder para o filtro';
COMMENT ON COLUMN public.page_filter.options_view IS 'Nome da view para popular opções (select/multiselect) - validar/whitelist no backend';
COMMENT ON COLUMN public.page_filter.order_index IS 'Ordem de exibição do filtro na UI (menor vem primeiro)';
COMMENT ON COLUMN public.page_filter.active IS 'Indica se o filtro está ativo/habilitado';
COMMENT ON COLUMN public.page_filter.meta_data IS 'Metadados adicionais do filtro em formato JSON';

-- Trigger para manter updated_at sempre atualizado
DROP TRIGGER IF EXISTS trg_page_filter_updated_at ON public.page_filter;
CREATE TRIGGER trg_page_filter_updated_at
  BEFORE UPDATE ON public.page_filter
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_page_filter_company_id ON public.page_filter(company_id);
CREATE INDEX IF NOT EXISTS idx_page_filter_page_id ON public.page_filter(page_id);
CREATE INDEX IF NOT EXISTS idx_page_filter_type ON public.page_filter(type);
CREATE INDEX IF NOT EXISTS idx_page_filter_active_order ON public.page_filter(page_id, active, order_index);

-- =====================================================
-- 4) ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.page ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page FORCE ROW LEVEL SECURITY;

ALTER TABLE public.page_filter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_filter FORCE ROW LEVEL SECURITY;

-- =====================================================
-- 5) POLÍTICAS RLS PARA PAGE
-- =====================================================

DROP POLICY IF EXISTS page_select_policy ON public.page;
CREATE POLICY "page_select_policy"
  ON public.page
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT au.company_id
      FROM public.app_user au
      WHERE au.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS page_insert_policy ON public.page;
CREATE POLICY "page_insert_policy"
  ON public.page
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT au.company_id
      FROM public.app_user au
      WHERE au.auth_user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1
      FROM public.app_user au
      LEFT JOIN public.access_profile ap ON ap.id = au.access_profile_id
      WHERE au.auth_user_id = auth.uid()
        AND (ap.is_admin = TRUE OR ap.code = 'manager')
    )
  );

-- IMPORTANTE:
-- - USING controla quais linhas podem ser atualizadas
-- - WITH CHECK controla para quais valores a linha pode ser alterada
DROP POLICY IF EXISTS page_update_policy ON public.page;
CREATE POLICY "page_update_policy"
  ON public.page
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT au.company_id
      FROM public.app_user au
      WHERE au.auth_user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1
      FROM public.app_user au
      LEFT JOIN public.access_profile ap ON ap.id = au.access_profile_id
      WHERE au.auth_user_id = auth.uid()
        AND (ap.is_admin = TRUE OR ap.code = 'manager')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT au.company_id
      FROM public.app_user au
      WHERE au.auth_user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1
      FROM public.app_user au
      LEFT JOIN public.access_profile ap ON ap.id = au.access_profile_id
      WHERE au.auth_user_id = auth.uid()
        AND (ap.is_admin = TRUE OR ap.code = 'manager')
    )
  );

DROP POLICY IF EXISTS page_delete_policy ON public.page;
CREATE POLICY "page_delete_policy"
  ON public.page
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT au.company_id
      FROM public.app_user au
      WHERE au.auth_user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1
      FROM public.app_user au
      LEFT JOIN public.access_profile ap ON ap.id = au.access_profile_id
      WHERE au.auth_user_id = auth.uid()
        AND (ap.is_admin = TRUE OR ap.code = 'manager')
    )
  );

-- =====================================================
-- 6) POLÍTICAS RLS PARA PAGE_FILTER
-- =====================================================

DROP POLICY IF EXISTS page_filter_select_policy ON public.page_filter;
CREATE POLICY "page_filter_select_policy"
  ON public.page_filter
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT au.company_id
      FROM public.app_user au
      WHERE au.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS page_filter_insert_policy ON public.page_filter;
CREATE POLICY "page_filter_insert_policy"
  ON public.page_filter
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT au.company_id
      FROM public.app_user au
      WHERE au.auth_user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1
      FROM public.app_user au
      LEFT JOIN public.access_profile ap ON ap.id = au.access_profile_id
      WHERE au.auth_user_id = auth.uid()
        AND (ap.is_admin = TRUE OR ap.code = 'manager')
    )
    AND
    page_id IN (
      SELECT p.id
      FROM public.page p
      WHERE p.company_id = page_filter.company_id
    )
  );

DROP POLICY IF EXISTS page_filter_update_policy ON public.page_filter;
CREATE POLICY "page_filter_update_policy"
  ON public.page_filter
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT au.company_id
      FROM public.app_user au
      WHERE au.auth_user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1
      FROM public.app_user au
      LEFT JOIN public.access_profile ap ON ap.id = au.access_profile_id
      WHERE au.auth_user_id = auth.uid()
        AND (ap.is_admin = TRUE OR ap.code = 'manager')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT au.company_id
      FROM public.app_user au
      WHERE au.auth_user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1
      FROM public.app_user au
      LEFT JOIN public.access_profile ap ON ap.id = au.access_profile_id
      WHERE au.auth_user_id = auth.uid()
        AND (ap.is_admin = TRUE OR ap.code = 'manager')
    )
    AND
    page_id IN (
      SELECT p.id
      FROM public.page p
      WHERE p.company_id = page_filter.company_id
    )
  );

DROP POLICY IF EXISTS page_filter_delete_policy ON public.page_filter;
CREATE POLICY "page_filter_delete_policy"
  ON public.page_filter
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT au.company_id
      FROM public.app_user au
      WHERE au.auth_user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1
      FROM public.app_user au
      LEFT JOIN public.access_profile ap ON ap.id = au.access_profile_id
      WHERE au.auth_user_id = auth.uid()
        AND (ap.is_admin = TRUE OR ap.code = 'manager')
    )
  );

-- =====================================================
-- 7) GRANTS E PERMISSÕES
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.page TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_filter TO authenticated;

-- Observação:
-- - Como os IDs são UUID (gen_random_uuid), não há sequências a liberar aqui.
-- - Evite grants amplos em ALL SEQUENCES no schema public, a menos que seja necessário.

-- =====================================================
-- 8) NOTAS DE USO (BACKEND)
-- =====================================================
-- Recomendações:
-- - Para filtros do tipo select/multiselect, consultar a view indicada em options_view
-- - Validar options_view via whitelist (lista de views permitidas) no backend
-- - As views devem respeitar RLS ou filtrar por company_id quando aplicável
