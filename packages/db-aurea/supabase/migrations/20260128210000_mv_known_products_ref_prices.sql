-- Create materialized view for latest reference prices (PF/PMC) for known EANs
-- Optimized: limits ref_price_history scan to item_ids that are "known" (EAN exists in product_presentation for same company)

CREATE MATERIALIZED VIEW public.mv_known_products_ref_prices AS
WITH known_items AS (
  SELECT DISTINCT
    ri.id AS item_id,
    ri.company_id,
    ri.ean,
    rs.code AS source
  FROM public.ref_item ri
  JOIN public.ref_source rs
    ON rs.id = ri.source_id
  JOIN public.product_presentation pp
    ON pp.company_id = ri.company_id
   AND pp.barcode = ri.ean
  WHERE ri.ean IS NOT NULL
    AND btrim(ri.ean) <> ''
    AND pp.barcode IS NOT NULL
    AND btrim(pp.barcode) <> ''
),
latest_price AS (
  SELECT
    rph.item_id,
    rph.price_type,
    rph.price_value,
    rph.valid_from,
    rph.price_meta,
    ROW_NUMBER() OVER (
      PARTITION BY rph.item_id, rph.price_type
      ORDER BY rph.valid_from DESC, rph.created_at DESC
    ) AS rn
  FROM public.ref_price_history rph
  JOIN known_items ki
    ON ki.item_id = rph.item_id
  WHERE rph.price_type IN ('pf', 'pmc')
),
pf AS (
  SELECT
    item_id,
    price_value,
    valid_from,
    price_meta
  FROM latest_price
  WHERE price_type = 'pf' AND rn = 1
),
pmc AS (
  SELECT
    item_id,
    price_value,
    valid_from,
    price_meta
  FROM latest_price
  WHERE price_type = 'pmc' AND rn = 1
),
item_prices AS (
  SELECT
    ki.company_id,
    ki.ean,
    ki.source,
    pf.price_value AS pf,
    pf.price_meta->>'label' AS pf_label,
    pmc.price_value AS pmc,
    pmc.price_meta->>'label' AS pmc_label,
    COALESCE(
      GREATEST(pf.valid_from, pmc.valid_from),
      pf.valid_from,
      pmc.valid_from
    ) AS price_date
  FROM known_items ki
  LEFT JOIN pf
    ON pf.item_id = ki.item_id
  LEFT JOIN pmc
    ON pmc.item_id = ki.item_id
  WHERE pf.price_value IS NOT NULL OR pmc.price_value IS NOT NULL
),
dedup_source AS (
  SELECT DISTINCT ON (company_id, ean, source)
    *
  FROM item_prices
  ORDER BY company_id, ean, source, price_date DESC NULLS LAST
),
final AS (
  SELECT DISTINCT ON (company_id, ean)
    d.company_id,
    d.ean,
    d.source,
    d.pf,
    d.pf_label,
    d.pmc,
    d.pmc_label,
    d.price_date
  FROM dedup_source d
  ORDER BY
    d.company_id,
    d.ean,
    d.price_date DESC NULLS LAST,
    CASE d.source
      WHEN 'brasindice' THEN 1
      WHEN 'cmed' THEN 2
      WHEN 'simpro' THEN 3
      ELSE 99
    END
)
SELECT
  f.company_id,
  f.ean,
  f.source,
  f.pf,
  f.pf_label,
  f.pmc,
  f.pmc_label,
  f.price_date,
  NOW() AS last_refresh
FROM final f;

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_mv_known_products_ref_prices_company_ean
  ON public.mv_known_products_ref_prices(company_id, ean);

-- Supporting indexes

-- Base-table indexes to speed up refresh



-- Optional: notify on presentation barcode changes (does not refresh by itself)
CREATE OR REPLACE FUNCTION trigger_notify_refresh_known_products_ref_prices()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.barcode IS NOT NULL AND btrim(NEW.barcode) <> '') OR
     (TG_OP = 'UPDATE' AND COALESCE(btrim(OLD.barcode), '') = '' AND COALESCE(btrim(NEW.barcode), '') <> '') OR
     (TG_OP = 'UPDATE' AND OLD.barcode IS DISTINCT FROM NEW.barcode AND COALESCE(btrim(NEW.barcode), '') <> '') THEN
    PERFORM pg_notify('refresh_known_products_ref_prices', 'refresh_needed');
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger t
    WHERE t.tgname = 'trigger_product_presentation_notify_known_products_ref_prices'
      AND t.tgrelid = 'public.product_presentation'::regclass
      AND NOT t.tgisinternal
  ) THEN
    EXECUTE 'DROP TRIGGER trigger_product_presentation_notify_known_products_ref_prices ON public.product_presentation';
  END IF;
END $$;

CREATE TRIGGER trigger_product_presentation_notify_known_products_ref_prices
  AFTER INSERT OR UPDATE OF barcode ON public.product_presentation
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notify_refresh_known_products_ref_prices();

-- Refresh function (non-concurrent). Prefer running CONCURRENTLY as a standalone statement in your scheduler/app.
CREATE OR REPLACE FUNCTION refresh_known_products_ref_prices_view()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.mv_known_products_ref_prices;
END;
$$;

-- Permissions
GRANT SELECT ON public.mv_known_products_ref_prices TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_known_products_ref_prices_view() TO service_role;

-- Comment
COMMENT ON MATERIALIZED VIEW public.mv_known_products_ref_prices IS
'Materialized view containing the latest PF/PMC prices per company and EAN, filtered to EANs that exist in product presentations. Optimized by limiting history scan to known item_ids. One row per (company_id, ean); deterministic tie-break by source priority (brasindice > cmed > simpro).';
