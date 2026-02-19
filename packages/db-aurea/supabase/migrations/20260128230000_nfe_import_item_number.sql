-- Add item_number to preserve original NFe item order

ALTER TABLE nfe_import_item
ADD COLUMN IF NOT EXISTS item_number INTEGER;

COMMENT ON COLUMN nfe_import_item.item_number IS 'Número do item na NFe (nItem) para preservar a ordem original';

-- Backfill existing items using created_at/id ordering within each NFe
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY nfe_import_id
      ORDER BY created_at, id
    ) AS rn
  FROM nfe_import_item
  WHERE item_number IS NULL
)
UPDATE nfe_import_item i
SET item_number = r.rn
FROM ranked r
WHERE i.id = r.id;

