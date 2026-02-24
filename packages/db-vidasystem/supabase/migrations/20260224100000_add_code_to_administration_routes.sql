-- =============================================
-- Adicionar coluna code em administration_routes
-- =============================================

ALTER TABLE public.administration_routes
ADD COLUMN IF NOT EXISTS code TEXT;

-- Backfill dos registros existentes a partir de abbreviation em lowercase
UPDATE public.administration_routes
SET code = lower(abbreviation)
WHERE code IS NULL
  AND abbreviation IS NOT NULL;

-- Índice único composto: garante unicidade de code por empresa e atende o requisito de índice
CREATE UNIQUE INDEX IF NOT EXISTS administration_routes_company_id_code_uk
  ON public.administration_routes (company_id, code);
