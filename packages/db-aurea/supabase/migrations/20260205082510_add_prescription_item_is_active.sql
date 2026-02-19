-- =====================================================
-- ADD IS_ACTIVE FIELD TO PRESCRIPTION_ITEM
-- Permite ativar/desativar itens de prescrição
-- =====================================================

BEGIN;

-- Adiciona campo is_active na tabela prescription_item
ALTER TABLE public.prescription_item
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE public.prescription_item
SET is_active = true
WHERE is_active IS NULL;

-- Cria índice para consultas por status ativo/inativo dentro da empresa

-- Comentário explicativo
COMMENT ON COLUMN public.prescription_item.is_active IS 
'Indica se o item da prescrição está ativo (true) ou desativado (false). Itens desativados podem ser reativados posteriormente.';

COMMIT;
