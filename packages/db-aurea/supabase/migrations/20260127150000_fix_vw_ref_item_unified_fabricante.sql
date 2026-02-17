-- Migration: Fix vw_ref_item_unified to include manufacturer from SIMPRO
-- Problem: The view only fetched manufacturer from Brasíndice, excluding products 
-- that only exist in SIMPRO (like VITAMINA D 500UI SOL.ORAL 10ML - EAN: 7891317021702)

CREATE OR REPLACE VIEW public.vw_ref_item_unified AS
WITH src AS (
  SELECT
    '2377a4cd-91a8-4e38-896f-ef90d58adcfc'::uuid AS cmed_source_id,
    '6665ca85-3393-47d4-9cc4-78bdad61d35b'::uuid AS brasindice_source_id,
    '12416fc1-d035-409d-87ea-3f08e0be0fab'::uuid AS simpro_source_id
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

    /* Nome: Brasíndice primeiro (product_name + presentation), fallback Simpro, fallback CMED */
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

      MAX(NULLIF(btrim(b.product_name), ''))
        FILTER (WHERE b.source_id = s.cmed_source_id),

      MAX(NULLIF(btrim(b.product_name), ''))
    ) AS nome,

    /* Demais campos */
    MAX(NULLIF(btrim(b.base_unit), '')) AS unidade,
    MAX(NULLIF(btrim(b.concentration), '')) AS concentracao,
    MAX(NULLIF(btrim(b.tiss), '')) AS tiss,
    MAX(NULLIF(btrim(b.tuss), '')) AS tuss,

    /* Substância (CMED) */
    MAX(NULLIF(btrim(b.extra_data->>'substancia'), ''))
      FILTER (WHERE b.source_id = s.cmed_source_id) AS substancia,

    /* Fabricante: Brasíndice primeiro, fallback SIMPRO, fallback CMED */
    COALESCE(
      MAX(NULLIF(btrim(b.manufacturer_name), ''))
        FILTER (WHERE b.source_id = s.brasindice_source_id),
      MAX(NULLIF(btrim(b.manufacturer_name), ''))
        FILTER (WHERE b.source_id = s.simpro_source_id),
      MAX(NULLIF(btrim(b.manufacturer_name), ''))
        FILTER (WHERE b.source_id = s.cmed_source_id)
    ) AS fabricante,

    /* Códigos por fonte (external_code) */
    MAX(NULLIF(btrim(b.external_code), ''))
      FILTER (WHERE b.source_id = s.cmed_source_id) AS ggrem,

    MAX(NULLIF(btrim(b.external_code), ''))
      FILTER (WHERE b.source_id = s.brasindice_source_id) AS brasindice_codigo,

    MAX(NULLIF(btrim(b.external_code), ''))
      FILTER (WHERE b.source_id = s.simpro_source_id) AS simpro_codigo,

    /* IDs por fonte */
    MAX(b.id::text) FILTER (WHERE b.source_id = s.cmed_source_id)::uuid AS cmed_id,
    MAX(b.id::text) FILTER (WHERE b.source_id = s.brasindice_source_id)::uuid AS brasindice_id,
    MAX(b.id::text) FILTER (WHERE b.source_id = s.simpro_source_id)::uuid AS simpro_id

  FROM base b
  CROSS JOIN src s
  GROUP BY b.ean
)
SELECT
  ean,
  nome,
  unidade,
  concentracao,
  fabricante,
  tiss,
  tuss,
  substancia,
  ggrem,
  brasindice_codigo,
  simpro_codigo,
  cmed_id,
  brasindice_id,
  simpro_id
FROM agg
WHERE
  nome IS NOT NULL
  AND fabricante IS NOT NULL
ORDER BY
  nome;

-- Add comment to the view
COMMENT ON VIEW public.vw_ref_item_unified IS 'View unificada de itens de referência (CMED, Brasíndice, Simpro) para associação com produtos - Fabricante com fallback para todas as fontes';
