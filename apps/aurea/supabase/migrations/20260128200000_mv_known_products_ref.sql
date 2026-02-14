-- Create materialized view for known products reference data
-- This view contains only reference data for EANs that exist in our product presentations
-- Significantly reduces query time by avoiding scanning millions of records

-- First, update the base view to include company_id for multi-tenant support
DROP VIEW IF EXISTS public.vw_ref_item_unified;
CREATE VIEW public.vw_ref_item_unified AS
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
    b.ean,

    /* Name: Brasíndice first (product_name + presentation), fallback Simpro, fallback CMED (product_name + presentation) */
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
  GROUP BY b.ean
)
SELECT
  c.id AS company_id,
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
CROSS JOIN company c
WHERE agg.name IS NOT NULL
ORDER BY c.id, agg.name;
-- Now create the materialized view for known products
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
-- Create composite index on company_id and EAN for fast lookups
CREATE INDEX idx_mv_known_products_ref_company_ean
  ON mv_known_products_ref(company_id, ean);
-- Create index on last_refresh for maintenance
CREATE INDEX idx_mv_known_products_ref_last_refresh
  ON mv_known_products_ref(last_refresh);
-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_known_products_ref_view()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_known_products_ref;
END;
$$;
-- Create a trigger function to refresh the view when presentations are added/updated
CREATE OR REPLACE FUNCTION trigger_refresh_known_products_ref()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only refresh if barcode was added or changed
  IF (TG_OP = 'INSERT' AND NEW.barcode IS NOT NULL AND NEW.barcode != '') OR
     (TG_OP = 'UPDATE' AND
      (OLD.barcode IS NULL OR OLD.barcode = '') AND
      (NEW.barcode IS NOT NULL AND NEW.barcode != '')) OR
     (TG_OP = 'UPDATE' AND OLD.barcode != NEW.barcode AND NEW.barcode IS NOT NULL AND NEW.barcode != '') THEN

    -- Use pg_notify to queue a refresh (to avoid blocking the transaction)
    PERFORM pg_notify('refresh_known_products_ref', 'refresh_needed');
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
-- Create trigger on product_presentation table
CREATE TRIGGER trigger_product_presentation_refresh_known_products_ref
  AFTER INSERT OR UPDATE OF barcode ON product_presentation
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_known_products_ref();
-- Grant permissions
GRANT SELECT ON mv_known_products_ref TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_known_products_ref_view() TO service_role;
-- Add comment explaining the purpose
COMMENT ON MATERIALIZED VIEW mv_known_products_ref IS
'Materialized view containing reference data only for EANs that exist in product presentations.
This significantly improves performance by avoiding queries on millions of records in ref_item tables.
Should be refreshed when new presentations with barcodes are added.';