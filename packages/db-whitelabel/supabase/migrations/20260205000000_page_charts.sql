-- =====================================================
-- MIGRATION: PAGE CHARTS - Gráficos Dinâmicos por Página
-- =====================================================
-- Objetivo:
-- - Criar tabela para gerenciar gráficos dinâmicos em páginas
-- - Permitir configuração de eixos X e Y
-- - Associar gráficos a filtros de página
-- - Buscar dados de views no banco externo
-- =====================================================

-- =====================================================
-- 1) ENUM PARA TIPOS DE GRÁFICO
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_chart_type') THEN
    CREATE TYPE public.enum_chart_type AS ENUM (
      'area',
      'line',
      'bar',
      'pie',
      'donut',
      'column',
      'stacked_bar',
      'stacked_area',
      'scatter',
      'radar',
      'treemap',
      'heatmap'
    );
  END IF;
END
$$;

COMMENT ON TYPE public.enum_chart_type IS 'Tipos de gráfico disponíveis (area, line, bar, pie, etc.)';

-- =====================================================
-- 2) TABELA PAGE_CHART
-- =====================================================

CREATE TABLE IF NOT EXISTS public.page_chart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES public.page(id) ON DELETE CASCADE,

  -- Identificação do gráfico
  name TEXT NOT NULL,
  title TEXT,
  description TEXT,

  -- Tipo de gráfico
  type public.enum_chart_type NOT NULL DEFAULT 'area',

  -- View para buscar dados
  options_view TEXT NOT NULL,

  -- Configuração dos eixos
  -- x_axis: campo da view para eixo X (geralmente data ou categoria)
  -- y_axis: campos da view para eixo Y (podem ser múltiplos para gráficos com séries)
  x_axis TEXT NOT NULL,
  y_axis JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Exemplo de y_axis:
  -- [
  --   { "field": "valor_total", "label": "Faturamento", "color": "#10B981" },
  --   { "field": "custo", "label": "Custos", "color": "#EF4444" }
  -- ]

  -- Configurações visuais
  colors JSONB DEFAULT '["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"]'::jsonb,
  show_legend BOOLEAN NOT NULL DEFAULT TRUE,
  show_grid BOOLEAN NOT NULL DEFAULT TRUE,
  stacked BOOLEAN NOT NULL DEFAULT FALSE,
  curve_type TEXT DEFAULT 'smooth', -- 'smooth', 'linear', 'step'

  -- Formatação
  x_axis_format TEXT DEFAULT 'auto', -- 'date', 'datetime', 'number', 'currency', 'auto'
  y_axis_format TEXT DEFAULT 'number', -- 'number', 'currency', 'percent', 'auto'
  y_axis_prefix TEXT,
  y_axis_suffix TEXT,

  -- Ordenação e exibição
  order_index INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Dimensões (para layout responsivo)
  width TEXT DEFAULT 'full', -- 'full', 'half', 'third', 'quarter'
  height INT DEFAULT 300, -- altura em pixels

  -- Metadados adicionais
  meta_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT page_chart_page_name_unique UNIQUE (page_id, name)
);

COMMENT ON TABLE public.page_chart IS 'Tabela de gráficos dinâmicos para páginas configuráveis';
COMMENT ON COLUMN public.page_chart.company_id IS 'ID da empresa proprietária do gráfico';
COMMENT ON COLUMN public.page_chart.page_id IS 'ID da página à qual o gráfico pertence';
COMMENT ON COLUMN public.page_chart.name IS 'Nome identificador do gráfico';
COMMENT ON COLUMN public.page_chart.title IS 'Título exibido no gráfico';
COMMENT ON COLUMN public.page_chart.description IS 'Descrição ou subtítulo do gráfico';
COMMENT ON COLUMN public.page_chart.type IS 'Tipo do gráfico (area, line, bar, pie, etc.)';
COMMENT ON COLUMN public.page_chart.options_view IS 'Nome da view para buscar dados do gráfico';
COMMENT ON COLUMN public.page_chart.x_axis IS 'Campo da view para eixo X';
COMMENT ON COLUMN public.page_chart.y_axis IS 'Configuração dos campos para eixo Y (JSON array)';
COMMENT ON COLUMN public.page_chart.colors IS 'Paleta de cores para as séries';
COMMENT ON COLUMN public.page_chart.show_legend IS 'Exibir legenda do gráfico';
COMMENT ON COLUMN public.page_chart.show_grid IS 'Exibir grade do gráfico';
COMMENT ON COLUMN public.page_chart.stacked IS 'Empilhar séries (para bar/area)';
COMMENT ON COLUMN public.page_chart.curve_type IS 'Tipo de curva (smooth, linear, step)';
COMMENT ON COLUMN public.page_chart.x_axis_format IS 'Formato do eixo X (date, number, etc.)';
COMMENT ON COLUMN public.page_chart.y_axis_format IS 'Formato do eixo Y (number, currency, percent)';
COMMENT ON COLUMN public.page_chart.order_index IS 'Ordem de exibição do gráfico na página';
COMMENT ON COLUMN public.page_chart.active IS 'Indica se o gráfico está ativo';
COMMENT ON COLUMN public.page_chart.width IS 'Largura do gráfico (full, half, third, quarter)';
COMMENT ON COLUMN public.page_chart.height IS 'Altura do gráfico em pixels';
COMMENT ON COLUMN public.page_chart.meta_data IS 'Metadados adicionais do gráfico';

-- Trigger para manter updated_at sempre atualizado
DROP TRIGGER IF EXISTS trg_page_chart_updated_at ON public.page_chart;
CREATE TRIGGER trg_page_chart_updated_at
  BEFORE UPDATE ON public.page_chart
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_page_chart_company_id ON public.page_chart(company_id);
CREATE INDEX IF NOT EXISTS idx_page_chart_page_id ON public.page_chart(page_id);
CREATE INDEX IF NOT EXISTS idx_page_chart_type ON public.page_chart(type);
CREATE INDEX IF NOT EXISTS idx_page_chart_active_order ON public.page_chart(page_id, active, order_index);

-- =====================================================
-- 3) ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.page_chart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_chart FORCE ROW LEVEL SECURITY;

-- =====================================================
-- 4) POLÍTICAS RLS PARA PAGE_CHART
-- =====================================================

DROP POLICY IF EXISTS page_chart_select_policy ON public.page_chart;
CREATE POLICY "page_chart_select_policy"
  ON public.page_chart
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT au.company_id
      FROM public.app_user au
      WHERE au.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS page_chart_insert_policy ON public.page_chart;
CREATE POLICY "page_chart_insert_policy"
  ON public.page_chart
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
      WHERE p.company_id = page_chart.company_id
    )
  );

DROP POLICY IF EXISTS page_chart_update_policy ON public.page_chart;
CREATE POLICY "page_chart_update_policy"
  ON public.page_chart
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
      WHERE p.company_id = page_chart.company_id
    )
  );

DROP POLICY IF EXISTS page_chart_delete_policy ON public.page_chart;
CREATE POLICY "page_chart_delete_policy"
  ON public.page_chart
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
-- 5) GRANTS E PERMISSÕES
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_chart TO authenticated;

-- =====================================================
-- 6) NOTAS DE USO (BACKEND/FRONTEND)
-- =====================================================
-- Recomendações:
-- 
-- Exemplo de configuração de gráfico de área:
-- {
--   "name": "faturamento_mensal",
--   "title": "Faturamento Mensal",
--   "type": "area",
--   "options_view": "vw_faturamento_mensal",
--   "x_axis": "mes",
--   "y_axis": [
--     { "field": "faturamento", "label": "Faturamento", "color": "#10B981" },
--     { "field": "meta", "label": "Meta", "color": "#3B82F6" }
--   ],
--   "x_axis_format": "date",
--   "y_axis_format": "currency",
--   "y_axis_prefix": "R$ "
-- }
--
-- A view deve retornar dados no formato:
-- | mes        | faturamento | meta     |
-- |------------|-------------|----------|
-- | 2026-01-01 | 150000.00   | 140000.00|
-- | 2026-02-01 | 180000.00   | 150000.00|
--
-- Os filtros da página podem ser aplicados à query da view via WHERE clause
