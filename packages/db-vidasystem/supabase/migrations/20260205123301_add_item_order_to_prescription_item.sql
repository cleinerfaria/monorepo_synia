-- =============================================
-- Adicionar coluna item_order aos itens de prescrição
-- =============================================

-- Adicionar coluna item_order à tabela prescription_item
ALTER TABLE prescription_item
ADD COLUMN item_order INTEGER DEFAULT 999;

-- Criar índice para melhorar performance ao buscar itens ordenados

-- Comentário da coluna
COMMENT ON COLUMN prescription_item.item_order IS 'Ordem de exibição do item na prescrição. Calculada baseado na prescription_order da via de administração. Atualizada automaticamente quando itens são adicionados/modificados.';
