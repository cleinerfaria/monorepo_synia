-- =====================================================
-- MIGRATION: prescription_item.week_days (dias da semana)
-- Regra: NULL = aplicar todos os dias (padrão)
-- Valores: ISO day of week => 1=seg, 2=ter, ... 7=dom
-- =====================================================

ALTER TABLE public.prescription_item
ADD COLUMN IF NOT EXISTS week_days smallint[] NULL;

COMMENT ON COLUMN public.prescription_item.week_days IS
'Dias da semana (ISO: 1=seg..7=dom) em que o item deve ser usado. NULL = todos os dias.';

ALTER TABLE public.prescription_item
ADD CONSTRAINT chk_prescription_item_week_days_valid
CHECK (
  week_days IS NULL
  OR (
    array_length(week_days, 1) BETWEEN 1 AND 7
    AND week_days <@ ARRAY[1,2,3,4,5,6,7]::smallint[]
  )
);

-- Índice opcional para buscas por dia (ex: pegar itens de hoje)
-- Só faz sentido se você realmente filtrar por week_days com frequência.
