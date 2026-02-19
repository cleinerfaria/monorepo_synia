-- Migration: Add quantidade field to unified reference items view
-- This updates the view to include quantity from Brasíndice source
-- Need to DROP and recreate because PostgreSQL doesn't allow changing column order with CREATE OR REPLACE

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_views
    WHERE schemaname = 'public'
      AND viewname = 'vw_ref_item_unified'
  ) THEN
    EXECUTE 'DROP VIEW public.vw_ref_item_unified';
  END IF;
END $$;

CREATE VIEW public.vw_ref_item_unified AS
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
        concat_ws(
          ' ',
          NULLIF(b.product_name, ''),
          NULLIF(b.presentation, '')
        )
      ) FILTER (WHERE b.source_id = s.brasindice_source_id),

      MAX(b.product_name)
        FILTER (WHERE b.source_id = s.simpro_source_id),

      MAX(b.product_name)
        FILTER (WHERE b.source_id = s.cmed_source_id),

      MAX(b.product_name)
    ) AS nome,

    /* Quantidade do Brasíndice (numeric direto) */
    MAX(b.quantity)
      FILTER (WHERE b.source_id = s.brasindice_source_id)
      AS quantidade,

    /* Demais campos */
    MAX(b.base_unit)     AS unidade,
    MAX(b.concentration) AS concentracao,
    MAX(b.tiss)          AS tiss,
    MAX(b.tuss)          AS tuss,

    /* Substância (CMED) */
    MAX(b.extra_data->>'substancia')
      FILTER (WHERE b.source_id = s.cmed_source_id)
      AS substancia,

    /* Fabricante (Brasíndice – nome fantasia) */
    MAX(b.manufacturer_name)
      FILTER (WHERE b.source_id = s.brasindice_source_id)
      AS fabricante,

    /* Códigos por fonte */
    MAX(b.external_code)
      FILTER (WHERE b.source_id = s.cmed_source_id)
      AS ggrem,

    MAX(b.external_code)
      FILTER (WHERE b.source_id = s.brasindice_source_id)
      AS brasindice_codigo,

    MAX(b.external_code)
      FILTER (WHERE b.source_id = s.simpro_source_id)
      AS simpro_codigo,

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
  quantidade,
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

-- Update comment
COMMENT ON VIEW public.vw_ref_item_unified IS 'View unificada de itens de referência (CMED, Brasíndice, Simpro) para associação com produtos - inclui quantidade';
