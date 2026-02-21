-- =====================================================
-- MIGRATION: ASSOCIATE PAGE TO COMPANY_DATABASES
-- =====================================================
-- Objetivo:
-- - Adicionar associação entre tabela page e company_databases
-- - Permitir que uma página acesse dados de um banco de dados específico
-- - Referenciar views no banco de dados para popular filtros dinâmicos

-- =====================================================
-- 1) ADICIONAR COLUNA company_database_id NA TABELA page
-- =====================================================

ALTER TABLE public.page
ADD COLUMN IF NOT EXISTS company_database_id UUID REFERENCES public.company_databases(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.page.company_database_id IS 'ID do banco de dados associado à página (para consultar views de filtros)';

-- Índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_page_company_database_id ON public.page(company_database_id);

-- =====================================================
-- 2) ATUALIZAR POLÍTICAS RLS PARA PAGE (já existem)
-- =====================================================
-- As políticas RLS existentes já cobrem esta nova coluna
-- pois o acesso segue company_id (que é comum entre page e company_databases)

-- =====================================================
-- 3) NOTAS DE USO (BACKEND)
-- =====================================================
-- Recomendações:
-- - Quando um filtro tem options_view, consultar a view no banco indicado em page.company_database_id
-- - As views devem estar disponíveis no banco de dados do cliente
-- - Implementar whitelist de views permitidas no backend (segurança)
-- - Tratamento de erro: se a view não existir ou acesso negado, mostrar mensagem amigável
