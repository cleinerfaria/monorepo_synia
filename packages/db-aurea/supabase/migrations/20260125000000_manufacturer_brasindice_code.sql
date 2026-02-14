-- =====================================================
-- Migration: Add brasindice_code to manufacturer table
-- =====================================================

-- Add brasindice_code column
ALTER TABLE manufacturer 
ADD COLUMN IF NOT EXISTS brasindice_code VARCHAR(20);

-- Create unique index for brasindice_code per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_manufacturer_brasindice_code_unique 
ON manufacturer(company_id, brasindice_code) 
WHERE brasindice_code IS NOT NULL;

-- Add comment
COMMENT ON COLUMN manufacturer.brasindice_code IS 'Código do fabricante no Brasíndice';

-- =====================================================
-- Function: Get paired manufacturers from CMED + Brasíndice
-- =====================================================

CREATE OR REPLACE FUNCTION get_paired_manufacturers(p_company_id UUID)
RETURNS TABLE (
  brasindice_codigo TEXT,
  nome_fantasia TEXT,
  razao_social TEXT,
  cnpj TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH b AS (
    -- Brasíndice items: manufacturer_code is numeric (e.g., "001", "048")
    SELECT DISTINCT ON (ean, manufacturer_code)
      ean,
      manufacturer_code AS brasindice_codigo,
      manufacturer_name AS nome_fantasia
    FROM public.ref_item
    WHERE company_id = p_company_id
      AND ean IS NOT NULL
      AND manufacturer_code IS NOT NULL
      AND manufacturer_code ~ '^[0-9]+$'
  ),
  c AS (
    -- CMED items: manufacturer_code contains "/" (CNPJ format)
    SELECT DISTINCT ON (ean, manufacturer_code)
      ean,
      manufacturer_code AS cnpj,
      manufacturer_name AS razao_social
    FROM public.ref_item
    WHERE company_id = p_company_id
      AND ean IS NOT NULL
      AND manufacturer_code IS NOT NULL
      AND manufacturer_code ~ '/'
  ),
  paired AS (
    SELECT
      c.cnpj,
      MAX(b.brasindice_codigo) AS brasindice_codigo,
      MAX(b.nome_fantasia) AS nome_fantasia,
      MAX(c.razao_social) AS razao_social
    FROM b
    JOIN c USING (ean)
    GROUP BY c.cnpj
  )
  SELECT
    paired.brasindice_codigo,
    paired.nome_fantasia,
    paired.razao_social,
    paired.cnpj
  FROM paired
  WHERE
    paired.brasindice_codigo IS NOT NULL
    AND paired.nome_fantasia IS NOT NULL
    AND paired.razao_social IS NOT NULL
    AND paired.cnpj IS NOT NULL
  ORDER BY
    paired.nome_fantasia,
    paired.razao_social;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_paired_manufacturers(UUID) TO authenticated;
