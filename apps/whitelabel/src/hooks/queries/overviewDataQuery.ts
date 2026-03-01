/**
 * Query SQL para buscar dados mensais completos da visão geral
 *
 * Esta query utiliza CTEs para calcular:
 * - Faturamento e volume por mês
 * - Clientes ativos por mês
 * - Ticket médio
 * - Share do produto líder
 * - Comparações MoM (Month over Month)
 * - Comparações YoY (Year over Year)
 *
 * Busca sempre os últimos 12 meses + 12 meses anteriores para YoY
 */
export function buildOverviewDataQuery(
  filialFilter: string | null,
  clienteFilter: string | null,
  grupoFilter: string | null,
  regionalFilter: string | null
): string {
  return `
WITH base AS (
  SELECT
    date_trunc('month', m.dt_mov)::date AS mes,
    m.cod_cliente::text AS cod_cliente,
    m.cod_filial::text AS cod_filial,
    gr.id::text AS grupo_id,
    gr.regional_id::text AS regional_id,
    mi.id_produto,
    mi.vr_venda,
    mi.qtd_litros
  FROM public.movimentacao m
  JOIN public.movimentacao_item mi
    ON mi.id_movimentacao = m.id_movimentacao
  LEFT JOIN public.grupo_relacionamento grr
    ON grr.cliente_id = m.cod_cliente
  LEFT JOIN public.grupo gr
    ON gr.id = grr.grupo_id
  WHERE m.dt_mov >= date_trunc('month', current_date) - interval '23 months'
    AND m.dt_mov <  date_trunc('month', current_date) + interval '1 month'
    ${filialFilter ? `AND m.cod_filial IN (${filialFilter})` : ''}
    ${clienteFilter ? `AND m.cod_cliente IN (${clienteFilter})` : ''}
    ${grupoFilter ? `AND gr.id IN (${grupoFilter})` : ''}
    ${regionalFilter ? `AND gr.regional_id IN (${regionalFilter})` : ''}
),

totais_mes AS (
  SELECT
    mes,
    sum(vr_venda) AS faturamento_total,
    sum(qtd_litros) AS volume_litros,
    count(DISTINCT cod_cliente) AS clientes_ativos
  FROM base
  GROUP BY mes
),

produto_mes AS (
  SELECT
    mes,
    id_produto,
    sum(vr_venda) AS faturamento_produto
  FROM base
  GROUP BY mes, id_produto
),

produto_lider AS (
  SELECT
    mes,
    max(faturamento_produto) / nullif(sum(faturamento_produto), 0) AS produto_lider_share
  FROM produto_mes
  GROUP BY mes
),

-- Meta do mês (somando metas cadastradas no mês)
-- =====================================================
meta_mes AS (
  SELECT
    date_trunc('month', mt.mes)::date AS mes,
    sum(mt.valor)::numeric AS meta_faturamento
  FROM public.meta mt
  LEFT JOIN public.grupo gr
    ON gr.id = mt.grupo_id
  WHERE ${clienteFilter ? 'false' : 'true'}
    ${grupoFilter ? `AND mt.grupo_id::text IN (${grupoFilter})` : ''}
    ${regionalFilter ? `AND gr.regional_id::text IN (${regionalFilter})` : ''}
  GROUP BY 1
),

kpis AS (
  SELECT
    t.mes,

    t.faturamento_total AS faturamento,
    lag(t.faturamento_total) OVER (ORDER BY t.mes) AS faturamento_mes_anterior,
    CASE
      WHEN lag(t.faturamento_total) OVER (ORDER BY t.mes) IS NULL
        OR lag(t.faturamento_total) OVER (ORDER BY t.mes) = 0
      THEN NULL
      ELSE (t.faturamento_total / lag(t.faturamento_total) OVER (ORDER BY t.mes)) - 1
    END AS crescimento_faturamento_mom_pct,

    lag(t.faturamento_total, 12) OVER (ORDER BY t.mes) AS faturamento_ano_anterior,
    CASE
      WHEN lag(t.faturamento_total, 12) OVER (ORDER BY t.mes) IS NULL
        OR lag(t.faturamento_total, 12) OVER (ORDER BY t.mes) = 0
      THEN NULL
      ELSE (t.faturamento_total / lag(t.faturamento_total, 12) OVER (ORDER BY t.mes)) - 1
    END AS crescimento_faturamento_yoy_pct,

    t.volume_litros,
    lag(t.volume_litros) OVER (ORDER BY t.mes) AS volume_mes_anterior,
    CASE
      WHEN lag(t.volume_litros) OVER (ORDER BY t.mes) IS NULL
        OR lag(t.volume_litros) OVER (ORDER BY t.mes) = 0
      THEN NULL
      ELSE (t.volume_litros / lag(t.volume_litros) OVER (ORDER BY t.mes)) - 1
    END AS crescimento_volume_mom_pct,

    lag(t.volume_litros, 12) OVER (ORDER BY t.mes) AS volume_ano_anterior,
    CASE
      WHEN lag(t.volume_litros, 12) OVER (ORDER BY t.mes) IS NULL
        OR lag(t.volume_litros, 12) OVER (ORDER BY t.mes) = 0
      THEN NULL
      ELSE (t.volume_litros / lag(t.volume_litros, 12) OVER (ORDER BY t.mes)) - 1
    END AS crescimento_volume_yoy_pct,

    t.clientes_ativos,
    t.faturamento_total / nullif(t.clientes_ativos, 0) AS ticket_medio
  FROM totais_mes t
)

SELECT
  to_char(k.mes, 'YYYY-MM') AS mes,

  k.faturamento::numeric AS faturamento,
  k.faturamento_mes_anterior::numeric AS faturamento_mes_anterior,
  k.crescimento_faturamento_mom_pct::numeric AS crescimento_faturamento_mom_pct,
  k.faturamento_ano_anterior::numeric AS faturamento_ano_anterior,
  k.crescimento_faturamento_yoy_pct::numeric AS crescimento_faturamento_yoy_pct,

  k.volume_litros::numeric AS volume_litros,
  k.volume_mes_anterior::numeric AS volume_mes_anterior,
  k.crescimento_volume_mom_pct::numeric AS crescimento_volume_mom_pct,
  k.volume_ano_anterior::numeric AS volume_ano_anterior,
  k.crescimento_volume_yoy_pct::numeric AS crescimento_volume_yoy_pct,

  k.clientes_ativos::integer AS clientes_ativos,
  k.ticket_medio::numeric AS ticket_medio,
  pl.produto_lider_share::numeric AS produto_lider_share,

  mm.meta_faturamento::numeric AS meta_faturamento,

  CASE
    WHEN mm.meta_faturamento IS NULL OR mm.meta_faturamento = 0 THEN NULL
    ELSE (k.faturamento / mm.meta_faturamento)
  END AS atingimento_meta_pct

FROM kpis k
LEFT JOIN produto_lider pl
  ON pl.mes = k.mes
LEFT JOIN meta_mes mm
  ON mm.mes = k.mes
WHERE k.mes >= date_trunc('month', current_date) - interval '11 months'
  AND k.mes <  date_trunc('month', current_date) + interval '1 month'
ORDER BY k.mes
`;
}
