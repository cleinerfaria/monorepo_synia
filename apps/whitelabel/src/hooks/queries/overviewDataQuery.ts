/**
 * Query SQL para buscar dados mensais completos da visao geral.
 * Usa subqueries inline para evitar CTEs, que o executor da Function rejeita.
 */
export function buildOverviewDataQuery(
  filialFilter: string | null,
  clienteFilter: string | null,
  grupoFilter: string | null,
  regionalFilter: string | null
): string {
  const mesesRefSubquery = `
    SELECT generate_series(
      date_trunc('month', current_date) - interval '23 months',
      date_trunc('month', current_date),
      interval '1 month'
    )::date AS mes
  `;

  const baseSubquery = `
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
      AND m.dt_mov < date_trunc('month', current_date) + interval '1 month'
      ${filialFilter ? `AND m.cod_filial IN (${filialFilter})` : ''}
      ${clienteFilter ? `AND m.cod_cliente IN (${clienteFilter})` : ''}
      ${grupoFilter ? `AND gr.id IN (${grupoFilter})` : ''}
      ${regionalFilter ? `AND gr.regional_id IN (${regionalFilter})` : ''}
  `;

  const totaisMesSubquery = `
    SELECT
      mes,
      sum(vr_venda) AS faturamento_total,
      sum(qtd_litros) AS volume_litros,
      count(DISTINCT cod_cliente) AS clientes_ativos
    FROM (${baseSubquery}) AS base
    GROUP BY mes
  `;

  const produtoLiderSubquery = `
    SELECT
      pm.mes,
      max(pm.faturamento_produto) / nullif(sum(pm.faturamento_produto), 0) AS produto_lider_share
    FROM (
      SELECT
        mes,
        id_produto,
        sum(vr_venda) AS faturamento_produto
      FROM (${baseSubquery}) AS base
      GROUP BY mes, id_produto
    ) AS pm
    GROUP BY pm.mes
  `;

  const metaMesSubquery = `
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
  `;

  const kpisSubquery = `
    SELECT
      mr.mes,
      coalesce(t.faturamento_total, 0) AS faturamento,
      lag(coalesce(t.faturamento_total, 0)) OVER (ORDER BY mr.mes) AS faturamento_mes_anterior,
      CASE
        WHEN lag(coalesce(t.faturamento_total, 0)) OVER (ORDER BY mr.mes) IS NULL
          OR lag(coalesce(t.faturamento_total, 0)) OVER (ORDER BY mr.mes) = 0
        THEN NULL
        ELSE (coalesce(t.faturamento_total, 0) / lag(coalesce(t.faturamento_total, 0)) OVER (ORDER BY mr.mes)) - 1
      END AS crescimento_faturamento_mom_pct,
      lag(coalesce(t.faturamento_total, 0), 12) OVER (ORDER BY mr.mes) AS faturamento_ano_anterior,
      CASE
        WHEN lag(coalesce(t.faturamento_total, 0), 12) OVER (ORDER BY mr.mes) IS NULL
          OR lag(coalesce(t.faturamento_total, 0), 12) OVER (ORDER BY mr.mes) = 0
        THEN NULL
        ELSE (coalesce(t.faturamento_total, 0) / lag(coalesce(t.faturamento_total, 0), 12) OVER (ORDER BY mr.mes)) - 1
      END AS crescimento_faturamento_yoy_pct,
      coalesce(t.volume_litros, 0) AS volume_litros,
      lag(coalesce(t.volume_litros, 0)) OVER (ORDER BY mr.mes) AS volume_mes_anterior,
      CASE
        WHEN lag(coalesce(t.volume_litros, 0)) OVER (ORDER BY mr.mes) IS NULL
          OR lag(coalesce(t.volume_litros, 0)) OVER (ORDER BY mr.mes) = 0
        THEN NULL
        ELSE (coalesce(t.volume_litros, 0) / lag(coalesce(t.volume_litros, 0)) OVER (ORDER BY mr.mes)) - 1
      END AS crescimento_volume_mom_pct,
      lag(coalesce(t.volume_litros, 0), 12) OVER (ORDER BY mr.mes) AS volume_ano_anterior,
      CASE
        WHEN lag(coalesce(t.volume_litros, 0), 12) OVER (ORDER BY mr.mes) IS NULL
          OR lag(coalesce(t.volume_litros, 0), 12) OVER (ORDER BY mr.mes) = 0
        THEN NULL
        ELSE (coalesce(t.volume_litros, 0) / lag(coalesce(t.volume_litros, 0), 12) OVER (ORDER BY mr.mes)) - 1
      END AS crescimento_volume_yoy_pct,
      coalesce(t.clientes_ativos, 0) AS clientes_ativos,
      coalesce(t.faturamento_total, 0) / nullif(coalesce(t.clientes_ativos, 0), 0) AS ticket_medio
    FROM (${mesesRefSubquery}) AS mr
    LEFT JOIN (${totaisMesSubquery}) AS t
      ON t.mes = mr.mes
  `;

  return `
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
FROM (${kpisSubquery}) AS k
LEFT JOIN (${produtoLiderSubquery}) AS pl
  ON pl.mes = k.mes
LEFT JOIN (${metaMesSubquery}) AS mm
  ON mm.mes = k.mes
WHERE k.mes >= date_trunc('month', current_date) - interval '11 months'
  AND k.mes < date_trunc('month', current_date) + interval '1 month'
ORDER BY k.mes
`;
}
