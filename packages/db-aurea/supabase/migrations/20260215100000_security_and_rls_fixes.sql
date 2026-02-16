-- =====================================================
-- MIGRATION: Security and RLS Fixes - Consolidated
--
-- Consolida 3 migrations de 15/02:
-- 1. Enable RLS em prescription_item_occurrence
-- 2. Add RLS policies para prescription_item_occurrence
-- 3. Fix security definer views
-- =====================================================

BEGIN;

-- =====================================================
-- PARTE 1: Enable RLS on prescription_item_occurrence
--    This table contains patient-related data (patient_id is sensitive)
-- =====================================================

ALTER TABLE public.prescription_item_occurrence ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PARTE 2: Safe RLS policies using LATERAL subqueries
--    to avoid infinite recursion and maintain performance
-- =====================================================

-- SELECT: Users can view prescription_item_occurrence records from their company
CREATE POLICY "prescription_item_occurrence_select_policy" 
  ON public.prescription_item_occurrence
  FOR SELECT 
  USING (
    company_id = (
      SELECT get_user_company_id()
    )
  );

-- INSERT: Users can create prescription_item_occurrence records for their company
CREATE POLICY "prescription_item_occurrence_insert_policy" 
  ON public.prescription_item_occurrence
  FOR INSERT 
  WITH CHECK (
    company_id = (
      SELECT get_user_company_id()
    )
  );

-- UPDATE: Users can update prescription_item_occurrence records from their company
CREATE POLICY "prescription_item_occurrence_update_policy" 
  ON public.prescription_item_occurrence
  FOR UPDATE 
  USING (
    company_id = (
      SELECT get_user_company_id()
    )
  );

-- DELETE: Users can delete prescription_item_occurrence records from their company
CREATE POLICY "prescription_item_occurrence_delete_policy" 
  ON public.prescription_item_occurrence
  FOR DELETE 
  USING (
    company_id = (
      SELECT get_user_company_id()
    )
  );

-- =====================================================
-- PARTE 3: Fix Security Definer Views
--
-- Corrige alertas do Supabase Linter (SECURITY DEFINER):
-- 1. Remove vw_ref_source_stats (não utilizada)
-- 2. Recria vw_ref_item_current_price com security_invoker
-- 3. Recria vw_ref_item_unified corrigindo isolamento multi-tenant
--    (remove CROSS JOIN company, usa company_id de ref_item)
-- 4. Recria mv_known_products_ref (dependência de vw_ref_item_unified)
-- =====================================================

-- 1. Remover vw_ref_source_stats (não utilizada na aplicação)
DROP VIEW IF EXISTS public.vw_ref_source_stats;

-- 2. Recriar vw_ref_item_current_price com security_invoker
--    RLS de ref_price_history filtra via item_id → ref_item.company_id
DROP VIEW IF EXISTS public.vw_ref_item_current_price;
CREATE VIEW public.vw_ref_item_current_price
WITH (security_invoker = true)
AS
SELECT DISTINCT ON (item_id, price_type)
    id as price_id,
    item_id,
    price_type,
    price_value,
    currency,
    valid_from,
    price_meta,
    import_batch_id,
    created_at
FROM ref_price_history
ORDER BY item_id, price_type, valid_from DESC, created_at DESC;

-- 3. Recriar vw_ref_item_unified
--    - Adiciona security_invoker = true
--    - Remove CROSS JOIN company (incorreto para multi-tenant)
--    - Agrupa por (company_id, ean) usando company_id de ref_item

-- Dropar materialized view dependente primeiro
DROP MATERIALIZED VIEW IF EXISTS public.mv_known_products_ref;
DROP VIEW IF EXISTS public.vw_ref_item_unified;

CREATE VIEW public.vw_ref_item_unified
WITH (security_invoker = true)
AS
WITH src AS (
  SELECT
    MIN(id::text) FILTER (WHERE code = 'cmed')::uuid       AS cmed_source_id,
    MIN(id::text) FILTER (WHERE code = 'brasindice')::uuid AS brasindice_source_id,
    MIN(id::text) FILTER (WHERE code = 'simpro')::uuid     AS simpro_source_id
  FROM public.ref_source
),
base AS (
  SELECT
    ri.*
  FROM public.ref_item ri
  CROSS JOIN src s
  WHERE ri.ean IS NOT NULL
    AND ri.source_id IN (
      s.cmed_source_id,
      s.brasindice_source_id,
      s.simpro_source_id
    )
),
agg AS (
  SELECT
    b.company_id,
    b.ean,

    /* Name: Brasíndice first (product_name + presentation), fallback Simpro, fallback CMED */
    COALESCE(
      MAX(
        NULLIF(
          btrim(
            concat_ws(' ', NULLIF(btrim(b.product_name), ''), NULLIF(btrim(b.presentation), ''))
          ),
          ''
        )
      ) FILTER (WHERE b.source_id = s.brasindice_source_id),

      MAX(NULLIF(btrim(b.product_name), ''))
        FILTER (WHERE b.source_id = s.simpro_source_id),

      MAX(
        NULLIF(
          btrim(
            concat_ws(' ', NULLIF(btrim(b.product_name), ''), NULLIF(btrim(b.presentation), ''))
          ),
          ''
        )
      ) FILTER (WHERE b.source_id = s.cmed_source_id),

      MAX(
        NULLIF(
          btrim(
            concat_ws(' ', NULLIF(btrim(b.product_name), ''), NULLIF(btrim(b.presentation), ''))
          ),
          ''
        )
      )
    ) AS name,

    /* Quantity: Brasíndice first, fallback Simpro, fallback CMED */
    COALESCE(
      MAX(b.quantity) FILTER (WHERE b.source_id = s.brasindice_source_id),
      MAX(b.quantity) FILTER (WHERE b.source_id = s.simpro_source_id),
      MAX(b.quantity) FILTER (WHERE b.source_id = s.cmed_source_id)
    ) AS quantity,

    /* Other fields */
    MAX(NULLIF(btrim(b.base_unit), '')) AS unit,
    MAX(NULLIF(btrim(b.concentration), '')) AS concentration,
    MAX(NULLIF(btrim(b.tiss), '')) AS tiss,
    MAX(NULLIF(btrim(b.tuss), '')) AS tuss,

    /* Substance (CMED) */
    MAX(NULLIF(btrim(b.extra_data->>'substancia'), ''))
      FILTER (WHERE b.source_id = s.cmed_source_id) AS substance,

    /* Manufacturer (Brasíndice – trade name) */
    MAX(NULLIF(btrim(b.manufacturer_name), ''))
      FILTER (WHERE b.source_id = s.brasindice_source_id) AS manufacturer,

    /* Manufacturer tax id (CMED) */
    MAX(NULLIF(btrim(b.extra_data->>'cnpj'), ''))
      FILTER (WHERE b.source_id = s.cmed_source_id) AS cnpj,

    /* Source codes (external_code) */
    MAX(NULLIF(btrim(b.external_code), ''))
      FILTER (WHERE b.source_id = s.cmed_source_id) AS ggrem_code,

    MAX(NULLIF(btrim(b.external_code), ''))
      FILTER (WHERE b.source_id = s.brasindice_source_id) AS brasindice_code,

    MAX(NULLIF(btrim(b.external_code), ''))
      FILTER (WHERE b.source_id = s.simpro_source_id) AS simpro_code,

    /* Source ids */
    MAX(b.id::text) FILTER (WHERE b.source_id = s.cmed_source_id)::uuid AS cmed_item_id,
    MAX(b.id::text) FILTER (WHERE b.source_id = s.brasindice_source_id)::uuid AS brasindice_item_id,
    MAX(b.id::text) FILTER (WHERE b.source_id = s.simpro_source_id)::uuid AS simpro_item_id

  FROM base b
  CROSS JOIN src s
  GROUP BY b.company_id, b.ean
)
SELECT
  agg.company_id,
  agg.ean,
  agg.name,
  agg.quantity,
  agg.unit,
  agg.concentration,
  agg.manufacturer,
  agg.cnpj,
  agg.tiss,
  agg.tuss,
  agg.substance,
  agg.ggrem_code,
  agg.brasindice_code,
  agg.simpro_code,
  agg.cmed_item_id,
  agg.brasindice_item_id,
  agg.simpro_item_id
FROM agg
WHERE agg.name IS NOT NULL
ORDER BY agg.company_id, agg.name;

-- 4. Recriar mv_known_products_ref (dependência de vw_ref_item_unified)

CREATE MATERIALIZED VIEW mv_known_products_ref AS
SELECT DISTINCT
  vru.company_id,
  vru.ean,
  vru.name,
  vru.quantity,
  vru.unit,
  vru.concentration,
  vru.manufacturer,
  vru.cnpj,
  vru.tiss,
  vru.tuss,
  vru.substance,
  vru.ggrem_code,
  vru.brasindice_code,
  vru.simpro_code,
  vru.cmed_item_id,
  vru.brasindice_item_id,
  vru.simpro_item_id,
  NOW() AS last_refresh
FROM vw_ref_item_unified vru
INNER JOIN product_presentation pp
  ON pp.barcode = vru.ean
 AND pp.company_id = vru.company_id
WHERE pp.barcode IS NOT NULL
  AND pp.barcode != ''
  AND LENGTH(pp.barcode) >= 8;

-- Recriar índices
CREATE INDEX idx_mv_known_products_ref_company_ean
  ON mv_known_products_ref(company_id, ean);

CREATE INDEX idx_mv_known_products_ref_last_refresh
  ON mv_known_products_ref(last_refresh);

-- Recriar função de refresh (CREATE OR REPLACE — idempotente)
CREATE OR REPLACE FUNCTION refresh_known_products_ref_view()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_known_products_ref;
END;
$$;

-- Recriar trigger function (CREATE OR REPLACE — idempotente)
CREATE OR REPLACE FUNCTION trigger_refresh_known_products_ref()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.barcode IS NOT NULL AND NEW.barcode != '') OR
     (TG_OP = 'UPDATE' AND
      (OLD.barcode IS NULL OR OLD.barcode = '') AND
      (NEW.barcode IS NOT NULL AND NEW.barcode != '')) OR
     (TG_OP = 'UPDATE' AND OLD.barcode != NEW.barcode AND NEW.barcode IS NOT NULL AND NEW.barcode != '') THEN
    PERFORM pg_notify('refresh_known_products_ref', 'refresh_needed');
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recriar trigger (drop + create para garantir)
DROP TRIGGER IF EXISTS trigger_product_presentation_refresh_known_products_ref
  ON product_presentation;

CREATE TRIGGER trigger_product_presentation_refresh_known_products_ref
  AFTER INSERT OR UPDATE OF barcode ON product_presentation
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_known_products_ref();

-- Permissões
GRANT SELECT ON mv_known_products_ref TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_known_products_ref_view() TO service_role;

COMMENT ON MATERIALIZED VIEW mv_known_products_ref IS
'Materialized view containing reference data only for EANs that exist in product presentations.
This significantly improves performance by avoiding queries on millions of records in ref_item tables.
Should be refreshed when new presentations with barcodes are added.';

COMMIT;
