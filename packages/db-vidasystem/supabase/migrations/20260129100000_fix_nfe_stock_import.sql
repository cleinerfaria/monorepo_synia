-- =====================================================
-- CORREÇÃO: NFe Import Stock Issues
-- =====================================================
-- Esta migração corrige problemas relacionados a:
-- 1. Estoque vazio mesmo após importação de NFe
-- 2. Quantidades negativas em movimentações de NFe

-- Verificar se há movimentações com quantidade negativa e corrigi-las
-- (Isso pode ocorrer se a conversão resultou em número negativo)
UPDATE stock_movement
SET quantity = ABS(quantity),
    unit_cost = ABS(unit_cost)
WHERE movement_type = 'in' AND quantity < 0;

-- Atualizar o stock_balance para refletir as correções
-- Este procedimento recalcula o saldo baseado em todas as movimentações
CREATE OR REPLACE PROCEDURE recalculate_stock_balances()
LANGUAGE plpgsql
AS $$
DECLARE
    v_company_id UUID;
    v_location_id UUID;
    v_product_id UUID;
    v_total_qty DECIMAL(15, 3);
    v_avg_cost DECIMAL(15, 4);
BEGIN
    -- Para cada combinação única de company, location e product
    FOR v_company_id, v_location_id, v_product_id IN
        SELECT DISTINCT sm.company_id, sm.location_id, sm.product_id
        FROM stock_movement sm
    LOOP
        -- Calcular quantidade total
        SELECT COALESCE(SUM(
            CASE 
                WHEN movement_type = 'in' THEN quantity
                WHEN movement_type = 'out' THEN -quantity
                WHEN movement_type = 'adjust' THEN quantity
            END
        ), 0)
        INTO v_total_qty
        FROM stock_movement
        WHERE company_id = v_company_id
          AND location_id = v_location_id
          AND product_id = v_product_id;

        -- Calcular custo médio (média ponderada das últimas movimentações IN)
        SELECT COALESCE(AVG(unit_cost), 0)
        INTO v_avg_cost
        FROM (
            SELECT unit_cost
            FROM stock_movement
            WHERE company_id = v_company_id
              AND location_id = v_location_id
              AND product_id = v_product_id
              AND movement_type = 'in'
            ORDER BY created_at DESC
            LIMIT 100
        ) t;

        -- Atualizar ou inserir stock_balance
        INSERT INTO stock_balance (company_id, location_id, product_id, qty_on_hand, avg_cost)
        VALUES (v_company_id, v_location_id, v_product_id, v_total_qty, v_avg_cost)
        ON CONFLICT (company_id, location_id, product_id)
        DO UPDATE SET
            qty_on_hand = v_total_qty,
            avg_cost = v_avg_cost,
            updated_at = NOW();
    END LOOP;
END;
$$;

-- Executar o procedimento para recalcular todos os saldos
CALL recalculate_stock_balances();

-- =====================================================
-- MELHORIAS NA FUNÇÃO update_stock_balance
-- =====================================================
-- Recriar a função para garantir que não há inversão de sinal

CREATE OR REPLACE FUNCTION update_stock_balance()
RETURNS TRIGGER AS $$
DECLARE
    current_balance RECORD;
    new_qty DECIMAL(15, 3);
    new_avg_cost DECIMAL(15, 4);
BEGIN
    -- Garantir que a quantidade nunca seja negativa para movimentos IN
    IF NEW.movement_type = 'in' AND NEW.quantity < 0 THEN
        NEW.quantity := ABS(NEW.quantity);
    END IF;

    -- Get current balance
    SELECT * INTO current_balance
    FROM stock_balance
    WHERE company_id = NEW.company_id
      AND location_id = NEW.location_id
      AND product_id = NEW.product_id;

    -- Calculate new quantity based on movement type
    IF NEW.movement_type = 'in' THEN
        new_qty := COALESCE(current_balance.qty_on_hand, 0) + NEW.quantity;
        -- Calculate weighted average cost
        IF COALESCE(current_balance.qty_on_hand, 0) + NEW.quantity > 0 THEN
            new_avg_cost := (
                (COALESCE(current_balance.qty_on_hand, 0) * COALESCE(current_balance.avg_cost, 0)) +
                (NEW.quantity * COALESCE(NEW.unit_cost, 0))
            ) / (COALESCE(current_balance.qty_on_hand, 0) + NEW.quantity);
        ELSE
            new_avg_cost := COALESCE(NEW.unit_cost, 0);
        END IF;
    ELSIF NEW.movement_type = 'out' THEN
        new_qty := COALESCE(current_balance.qty_on_hand, 0) - NEW.quantity;
        new_avg_cost := COALESCE(current_balance.avg_cost, 0);
    ELSE -- ADJUST
        new_qty := NEW.quantity;
        new_avg_cost := COALESCE(NEW.unit_cost, current_balance.avg_cost, 0);
    END IF;

    -- Upsert stock balance
    INSERT INTO stock_balance (company_id, location_id, product_id, qty_on_hand, avg_cost)
    VALUES (NEW.company_id, NEW.location_id, NEW.product_id, new_qty, new_avg_cost)
    ON CONFLICT (company_id, location_id, product_id)
    DO UPDATE SET
        qty_on_hand = new_qty,
        avg_cost = new_avg_cost,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ADICIONAR CONSTRAINT DE VALIDAÇÃO
-- =====================================================
-- Garantir que movimentos IN sempre têm quantidade positiva
DO $$
BEGIN
    BEGIN
        ALTER TABLE stock_movement
        ADD CONSTRAINT check_in_movement_positive_qty
        CHECK (
            (movement_type != 'in') OR (quantity > 0)
        );
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;

-- Garantir que movimentos out sempre têm quantidade positiva
DO $$
BEGIN
    BEGIN
        ALTER TABLE stock_movement
        ADD CONSTRAINT check_out_movement_positive_qty
        CHECK (
            (movement_type != 'out') OR (quantity > 0)
        );
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;

COMMENT ON PROCEDURE recalculate_stock_balances() IS 'Recalcula todos os saldos de estoque com base nas movimentações existentes';

