-- 1) criar índice compatível com upsert (sem WHERE)
CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_company_code
ON public.supplier (company_id, code);

-- 2) remover o índice parcial antigo
DROP INDEX IF EXISTS public.idx_supplier_code_unique;