-- =====================================================
-- MIGRATION: ADD SEARCH AND PAGINATION TO PAGE FILTERS
-- =====================================================
-- Objetivo:
-- - Adicionar campo has_search para indicar se o filtro tem busca
-- - Adicionar campo page_size para controlar paginação (padrão 20)
-- =====================================================

-- Adicionar coluna has_search
ALTER TABLE public.page_filter 
ADD COLUMN IF NOT EXISTS has_search BOOLEAN NOT NULL DEFAULT FALSE;

-- Adicionar coluna page_size (para paginação)
ALTER TABLE public.page_filter 
ADD COLUMN IF NOT EXISTS page_size INTEGER NOT NULL DEFAULT 20;

-- Comentários
COMMENT ON COLUMN public.page_filter.has_search IS 'Indica se o filtro exibe campo de busca';
COMMENT ON COLUMN public.page_filter.page_size IS 'Quantidade de itens por página na busca (padrão 20)';

-- Constraint para page_size
ALTER TABLE public.page_filter 
ADD CONSTRAINT page_filter_page_size_check 
CHECK (page_size > 0 AND page_size <= 100);
