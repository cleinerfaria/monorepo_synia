import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { supabase, resolvedSupabaseUrl, resolvedSupabaseAnonKey } from '@/lib/supabase';
import type { SalesMovement } from '@/types/sales';
import { buildOverviewDataQuery } from './queries/overviewDataQuery';

/**
 * Hook para buscar dados de vendas do banco externo da empresa
 */

async function fetchSalesData(
  companyId: string,
  startDate: Date,
  endDate: Date,
  filters?: {
    filial?: string[];
    clientes?: string[];
    produto?: string[];
  }
): Promise<SalesMovement[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Usuário não autenticado');
  }

  // Primeiro, buscar os databases da empresa
  const response = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({
      action: 'list',
      company_id: companyId,
    }),
  });

  const result = await response.json();

  if (!result.success || !result.data || result.data.length === 0) {
    throw new Error('Nenhum banco de dados configurado para a empresa');
  }

  // Usar o primeiro banco ativo
  const activeDb = result.data.find((db: { is_active: boolean }) => db.is_active);
  if (!activeDb) {
    throw new Error('Nenhum banco de dados ativo encontrado');
  }

  // Helper para validar valor de filtro (evita [object Object])
  const _isValidFilter = (value: unknown): value is string => {
    if (typeof value !== 'string') return false;
    if (!value.trim()) return false;
    if (value === '[object Object]') return false;
    return true;
  };

  // Construir filtros de data usando UTC para evitar problemas de fuso horário
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Query otimizada usando CTEs para melhor performance
  // Primeiro vamos verificar se as tabelas existem
  const checkQuery = `
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'movimentacao') as mov_exists,
           EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'movimentacao_item') as item_exists,
           EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'cliente') as cli_exists,
           EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'filial') as fil_exists,
           EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'produto') as prod_exists
  `;

  // Executar verificação de tabelas
  const checkResponse = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({
      action: 'query',
      database_id: activeDb.id,
      query: checkQuery,
    }),
  });

  const checkResult = await checkResponse.json();

  let query: string;

  // Se as tabelas normalizadas existem, usar a query nova
  if (
    checkResult.success &&
    checkResult.data?.rows?.[0]?.mov_exists &&
    checkResult.data?.rows?.[0]?.item_exists &&
    checkResult.data?.rows?.[0]?.cli_exists
  ) {
    query = `
      with mov_filtrada as (
        select
          m.id_movimentacao,
          m.cod_filial,
          m.cod_cliente,
          m.dt_mov
        from public.movimentacao m
        where m.dt_mov >= '${startDateStr}'
          and m.dt_mov <= '${endDateStr}'
          ${
            filters?.filial && filters.filial.length > 0
              ? `AND m.cod_filial IN (${filters.filial.map((f) => `'${f}'`).join(',')})`
              : ''
          }
          ${
            filters?.clientes && filters.clientes.length > 0
              ? `AND m.cod_cliente IN (${filters.clientes.map((c) => `'${c}'`).join(',')})`
              : ''
          }
      ),
      itens_ag as (
        select
          mf.dt_mov,
          mf.cod_filial,
          mf.cod_cliente,
          mi.id_produto,
          mi.vr_venda,
          mi.qt_itens_venda,
          mi.qtd_litros
        from mov_filtrada mf
        join public.movimentacao_item mi
          on mi.id_movimentacao = mf.id_movimentacao
        ${
          filters?.produto && filters.produto.length > 0
            ? `WHERE mi.id_produto IN (${filters.produto.map((p) => `'${p}'`).join(',')})`
            : ''
        }
      )
      select
        ia.dt_mov,
        c.id::text as cod_cliente,
        coalesce(c.razao_social, c.nome) as nome_cliente,
        p.id::text as cod_produto,
        p.nome as nome_produto,
        ia.vr_venda,
        ia.qt_itens_venda as qtd_itens_venda,
        f.id::text as cod_filial,
        f.nome as nome_filial,
        '' as nome_vendedor,
        ia.qtd_litros
      from itens_ag ia
      left join public.cliente c on c.id = ia.cod_cliente
      left join public.filial  f on f.id = ia.cod_filial
      left join public.produto p on p.id = ia.id_produto
      ORDER BY ia.dt_mov DESC
      LIMIT 50000
    `;
  } else {
    // Fallback para tabela desnormalizada se as tabelas normalizadas não existem
    console.warn(
      '⚠️ [fetchSalesData] Tabelas normalizadas não encontradas, usando fallback para movimentos'
    );

    let whereClause = `WHERE dt_mov >= '${startDateStr}' AND dt_mov <= '${endDateStr}'`;

    if (filters?.filial && filters.filial.length > 0) {
      const filiaisList = filters.filial.map((f) => `'${f}'`).join(',');
      whereClause += ` AND cod_filial IN (${filiaisList})`;
    }
    if (filters?.clientes && filters.clientes.length > 0) {
      const clientesList = filters.clientes.map((c) => `'${c}'`).join(',');
      whereClause += ` AND cod_cliente IN (${clientesList})`;
    }
    if (filters?.produto && filters.produto.length > 0) {
      const produtosList = filters.produto.map((p) => `'${p}'`).join(',');
      whereClause += ` AND cod_produto IN (${produtosList})`;
    }

    query = `
      SELECT 
        dt_mov,
        cod_cliente,
        nome_cliente,
        cod_produto,
        nome_produto,
        vr_venda,
        qtd_itens_venda,
        cod_filial,
        nome_filial,
        nome_vendedor,
        qtd_litros
      FROM movimentos
      ${whereClause}
      ORDER BY dt_mov DESC
      LIMIT 50000
    `;
  }

  // Executar a query no banco externo
  const queryResponse = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({
      action: 'query',
      database_id: activeDb.id,
      query,
    }),
  });

  const queryResult = await queryResponse.json();

  if (!queryResult.success) {
    console.error('Erro ao executar query de vendas:', queryResult.error);
    throw new Error(queryResult.error || 'Erro ao buscar dados de vendas');
  }

  // Helper para converter valor numérico (postgres pode retornar string, Decimal, ou number)
  const toNumber = (val: unknown): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (typeof val === 'string') {
      // Remove caracteres não numéricos exceto ponto e vírgula
      const cleaned = val.replace(/[^\d.,-]/g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      const result = isNaN(num) ? 0 : num;

      return result;
    }
    // Objeto Decimal ou similar
    if (typeof val === 'object' && val !== null) {
      if ('value' in val) return toNumber((val as { value: unknown }).value);
      if ('toString' in val) return toNumber(String(val));
    }
    return 0;
  };

  // Parsear valores numéricos que podem vir como string do banco
  const rows = (queryResult.data?.rows || []).map((row: Record<string, unknown>) => {
    const vr_venda = toNumber(row.vr_venda);
    const parsed = {
      dt_mov: row.dt_mov ? String(row.dt_mov) : '',
      cod_cliente: row.cod_cliente ? String(row.cod_cliente) : '',
      nome_cliente: row.nome_cliente ? String(row.nome_cliente) : '',
      cod_produto: row.cod_produto ? String(row.cod_produto) : '',
      nome_produto: row.nome_produto ? String(row.nome_produto) : '',
      vr_venda,
      qtd_itens_venda: toNumber(row.qtd_itens_venda),
      cod_filial: row.cod_filial ? String(row.cod_filial) : '',
      nome_filial: row.nome_filial ? String(row.nome_filial) : '',
      nome_vendedor: row.nome_vendedor ? String(row.nome_vendedor) : '',
      qtd_litros: row.qtd_litros ? toNumber(row.qtd_litros) : null,
      uf: row.cep ? getUFFromCEP(String(row.cep)) : undefined,
    };

    return parsed;
  }) as SalesMovement[];

  return rows;
}

// Helper para extrair UF do CEP (simplificado)
function getUFFromCEP(cep: string): string | undefined {
  if (!cep) return undefined;
  const prefix = parseInt(cep.substring(0, 2), 10);
  if (prefix >= 1 && prefix <= 19) return 'SP';
  if (prefix >= 20 && prefix <= 28) return 'RJ';
  if (prefix >= 29 && prefix <= 29) return 'ES';
  if (prefix >= 30 && prefix <= 39) return 'MG';
  if (prefix >= 40 && prefix <= 48) return 'BA';
  if (prefix >= 49 && prefix <= 49) return 'SE';
  if (prefix >= 50 && prefix <= 56) return 'PE';
  if (prefix >= 57 && prefix <= 57) return 'AL';
  if (prefix >= 58 && prefix <= 58) return 'PB';
  if (prefix >= 59 && prefix <= 59) return 'RN';
  if (prefix >= 60 && prefix <= 63) return 'CE';
  if (prefix >= 64 && prefix <= 64) return 'PI';
  if (prefix >= 65 && prefix <= 65) return 'MA';
  if (prefix >= 66 && prefix <= 68) return 'PA';
  if (prefix >= 69 && prefix <= 69) return 'AM';
  if (prefix >= 70 && prefix <= 73) return 'DF';
  if (prefix >= 74 && prefix <= 76) return 'GO';
  if (prefix >= 77 && prefix <= 77) return 'TO';
  if (prefix >= 78 && prefix <= 78) return 'MT';
  if (prefix >= 79 && prefix <= 79) return 'MS';
  if (prefix >= 80 && prefix <= 87) return 'PR';
  if (prefix >= 88 && prefix <= 89) return 'SC';
  if (prefix >= 90 && prefix <= 99) return 'RS';
  return undefined;
}

// Mock data generation removed - use only real database data

/**
 * Hook principal para dados de vendas
 */
export function useSalesData(
  startDate: Date,
  endDate: Date,
  filters?: {
    filial?: string[];
    clientes?: string[];
    produto?: string[];
  }
) {
  const { company } = useAuthStore();

  const queryKey = [
    'sales-data',
    company?.id,
    startDate.toISOString(),
    endDate.toISOString(),
    filters,
  ];

  return useQuery({
    queryKey,
    queryFn: () => {
      if (!company?.id) {
        throw new Error('Empresa não encontrada');
      }
      return fetchSalesData(company.id, startDate, endDate, filters);
    },
    staleTime: 1000 * 60 * 60, // 1 hora
    enabled: !!company?.id,
  });
}

/**
 * Hook para buscar opções de filtro (listas de filiais, clientes, produtos)
 * Clientes são limitados aos top 100 mais frequentes para melhor performance
 */
export interface ClientGoalData {
  cod_cliente: string;
  meta_faturamento: number | null;
}

async function fetchClientGoalsData(
  companyId: string,
  startDate: Date,
  endDate: Date,
  filters?: {
    filial?: string[];
    clientes?: string[];
    produto?: string[];
  }
): Promise<ClientGoalData[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Usuário não autenticado');
  }

  const response = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({
      action: 'list',
      company_id: companyId,
    }),
  });

  const result = await response.json();

  if (!result.success || !result.data || result.data.length === 0) {
    throw new Error('Nenhum banco de dados configurado para a empresa');
  }

  const activeDb = result.data.find((db: { is_active: boolean }) => db.is_active);
  if (!activeDb) {
    throw new Error('Nenhum banco de dados ativo encontrado');
  }

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  const escapeSql = (value: string) => value.replace(/'/g, "''");
  const toInList = (values?: string[]) =>
    values && values.length > 0 ? values.map((v) => `'${escapeSql(v)}'`).join(',') : null;

  const filialList = toInList(filters?.filial);
  const clienteList = toInList(filters?.clientes);
  const produtoList = toInList(filters?.produto);

  const metaColumnsResponse = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({
      action: 'query',
      database_id: activeDb.id,
      query: `
        SELECT
          column_name,
          data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'meta'
      `,
    }),
  });

  const metaColumnsResult = await metaColumnsResponse.json();

  if (!metaColumnsResult.success) {
    const errorMessage = String(metaColumnsResult.error || '').toLowerCase();
    if (errorMessage.includes('meta')) {
      return [];
    }
    throw new Error(metaColumnsResult.error || 'Erro ao inspecionar tabela de meta');
  }

  const metaColumns = (metaColumnsResult.data?.rows || []) as Array<{
    column_name?: string;
    data_type?: string;
  }>;

  if (metaColumns.length === 0) {
    return [];
  }

  const findMetaColumn = (candidates: string[]) =>
    metaColumns.find((col) => candidates.includes(String(col.column_name || '').toLowerCase()));

  const clientColumn = findMetaColumn(['client_id', 'cliente_id', 'cod_cliente', 'id_cliente']);
  const valueColumn = findMetaColumn(['valor', 'meta', 'valor_meta']);
  const monthColumn = findMetaColumn(['mes', 'competencia', 'dt_mes', 'data_mes', 'data']);
  const filialMetaColumn = findMetaColumn(['cod_filial', 'filial_id', 'id_filial']);

  if (!clientColumn || !valueColumn || !monthColumn) {
    return [];
  }

  const quoteIdent = (identifier: string) => `"${identifier.replace(/"/g, '""')}"`;
  const metaClientCol = quoteIdent(String(clientColumn.column_name));
  const metaValueCol = quoteIdent(String(valueColumn.column_name));
  const metaMonthCol = quoteIdent(String(monthColumn.column_name));
  const metaFilialCol = filialMetaColumn ? quoteIdent(String(filialMetaColumn.column_name)) : null;
  const monthDataType = String(monthColumn.data_type || '').toLowerCase();
  const monthExpr =
    monthDataType.includes('date') || monthDataType.includes('timestamp')
      ? `date_trunc('month', mt.${metaMonthCol})::date`
      : `
        CASE
          WHEN mt.${metaMonthCol} IS NULL THEN NULL
          WHEN mt.${metaMonthCol}::text ~ '^\\d{4}-\\d{2}-\\d{2}$'
            THEN date_trunc('month', (mt.${metaMonthCol}::text)::date)::date
          WHEN mt.${metaMonthCol}::text ~ '^\\d{4}-\\d{2}$'
            THEN to_date(mt.${metaMonthCol}::text || '-01', 'YYYY-MM-DD')
          ELSE NULL
        END
      `;

  const checkQuery = `
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'movimentacao') as mov_exists,
           EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'movimentacao_item') as item_exists
  `;

  let hasNormalizedTables = false;
  try {
    const checkResponse = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: resolvedSupabaseAnonKey,
      },
      body: JSON.stringify({
        action: 'query',
        database_id: activeDb.id,
        query: checkQuery,
      }),
    });

    const checkResult = await checkResponse.json();
    hasNormalizedTables =
      checkResult.success &&
      !!checkResult.data?.rows?.[0]?.mov_exists &&
      !!checkResult.data?.rows?.[0]?.item_exists;
  } catch (error) {
    console.warn('[fetchClientGoalsData] Erro ao verificar tabelas normalizadas:', error);
    hasNormalizedTables = false;
  }

  let query: string;

  if (hasNormalizedTables) {
    query = `
      WITH base_filtrada AS (
        SELECT DISTINCT
          date_trunc('month', m.dt_mov)::date AS mes_ref,
          m.cod_cliente::text AS cod_cliente
        FROM public.movimentacao m
        JOIN public.movimentacao_item mi
          ON mi.id_movimentacao = m.id_movimentacao
        WHERE m.dt_mov >= '${startDateStr}'
          AND m.dt_mov <= '${endDateStr}'
          ${filialList ? `AND m.cod_filial IN (${filialList})` : ''}
          ${clienteList ? `AND m.cod_cliente IN (${clienteList})` : ''}
          ${produtoList ? `AND mi.id_produto IN (${produtoList})` : ''}
      )
      SELECT
        bf.cod_cliente,
        sum(mt.${metaValueCol})::numeric AS meta_faturamento
      FROM base_filtrada bf
      LEFT JOIN public.meta mt
        ON mt.${metaClientCol}::text = bf.cod_cliente
       AND (${monthExpr}) = bf.mes_ref
       ${filialList && metaFilialCol ? `AND mt.${metaFilialCol} IN (${filialList})` : ''}
      GROUP BY bf.cod_cliente
    `;
  } else {
    query = `
      WITH base_filtrada AS (
        SELECT DISTINCT
          date_trunc('month', dt_mov)::date AS mes_ref,
          cod_cliente::text AS cod_cliente
        FROM movimentos
        WHERE dt_mov >= '${startDateStr}'
          AND dt_mov <= '${endDateStr}'
          ${filialList ? `AND cod_filial IN (${filialList})` : ''}
          ${clienteList ? `AND cod_cliente IN (${clienteList})` : ''}
          ${produtoList ? `AND cod_produto IN (${produtoList})` : ''}
      )
      SELECT
        bf.cod_cliente,
        sum(mt.${metaValueCol})::numeric AS meta_faturamento
      FROM base_filtrada bf
      LEFT JOIN public.meta mt
        ON mt.${metaClientCol}::text = bf.cod_cliente
       AND (${monthExpr}) = bf.mes_ref
       ${filialList && metaFilialCol ? `AND mt.${metaFilialCol} IN (${filialList})` : ''}
      GROUP BY bf.cod_cliente
    `;
  }

  const queryResponse = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({
      action: 'query',
      database_id: activeDb.id,
      query,
    }),
  });

  const queryResult = await queryResponse.json();

  if (!queryResult.success) {
    const errorMessage = String(queryResult.error || '').toLowerCase();

    if (errorMessage.includes('meta')) {
      console.warn('[fetchClientGoalsData] Tabela de meta indisponível:', queryResult.error);
      return [];
    }

    console.error('Erro ao buscar metas por cliente:', queryResult.error);
    throw new Error(queryResult.error || 'Erro ao buscar metas por cliente');
  }

  const toNumberOrNull = (val: unknown): number | null => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') return isNaN(val) ? null : val;
    if (typeof val === 'string') {
      const cleaned = val.replace(/[^0-9.,-]/g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    }
    if (typeof val === 'object' && val !== null && 'toString' in val) {
      return toNumberOrNull(String(val));
    }
    return null;
  };

  return (queryResult.data?.rows || []).map((row: Record<string, unknown>) => ({
    cod_cliente: String(row.cod_cliente || ''),
    meta_faturamento: toNumberOrNull(row.meta_faturamento),
  })) as ClientGoalData[];
}

export function useClientGoalsData(
  startDate: Date,
  endDate: Date,
  filters?: {
    filial?: string[];
    clientes?: string[];
    produto?: string[];
  }
) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [
      'client-goals-data',
      company?.id,
      startDate.toISOString(),
      endDate.toISOString(),
      filters,
    ],
    queryFn: () => {
      if (!company?.id) {
        throw new Error('Empresa não encontrada');
      }
      return fetchClientGoalsData(company.id, startDate, endDate, filters);
    },
    staleTime: 1000 * 60 * 60, // 1 hora
    enabled: !!company?.id,
  });
}

export function useSalesFilterOptions(salesData: SalesMovement[] | undefined) {
  const filiais = salesData
    ? [
        ...new Map(
          salesData.map((d) => [d.cod_filial, { value: d.cod_filial, label: d.nome_filial }])
        ).values(),
      ]
    : [];

  // Contar frequência de clientes e pegar top 100
  const clienteFreq = new Map<string, { count: number; label: string }>();
  salesData?.forEach((d) => {
    const existing = clienteFreq.get(d.cod_cliente);
    if (existing) {
      existing.count++;
    } else {
      clienteFreq.set(d.cod_cliente, { count: 1, label: d.nome_cliente });
    }
  });

  const clientes = [...clienteFreq.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 100)
    .map(([cod, data]) => ({ value: cod, label: data.label }));

  const produtos = salesData
    ? [
        ...new Map(
          salesData.map((d) => [d.cod_produto, { value: d.cod_produto, label: d.nome_produto }])
        ).values(),
      ]
    : [];

  return { filiais, clientes, produtos };
}

/**
 * Tipo para dados de faturamento mensal agregado
 */
export interface MonthlyRevenue {
  mes: string;
  faturamento: number;
  volume?: number;
}

/**
 * Tipo para dados mensais completos da visão geral
 * Inclui todos os KPIs e comparações MoM/YoY
 */
export interface OverviewMonthlyData {
  mes: string;
  faturamento: number;
  faturamento_mes_anterior: number | null;
  crescimento_faturamento_mom_pct: number | null;
  faturamento_ano_anterior: number | null;
  crescimento_faturamento_yoy_pct: number | null;
  meta_faturamento: number | null;
  volume_litros: number;
  volume_mes_anterior: number | null;
  crescimento_volume_mom_pct: number | null;
  volume_ano_anterior: number | null;
  crescimento_volume_yoy_pct: number | null;
  clientes_ativos: number;
  ticket_medio: number;
  produto_lider_share: number | null;
}

/**
 * Tipo para KPIs agregados da visão geral (dados otimizados)
 * @deprecated Use OverviewMonthlyData instead
 */
export interface OverviewKPIs {
  mes: string;
  faturamento_total: number;
  crescimento_pct: number | null;
  volume_litros: number;
  clientes_ativos: number;
  ticket_medio: number;
  produto_lider_share: number | null;
}

/**
 * Busca dados mensais completos para a página de visão geral
 * Query única otimizada com CTEs - sempre últimos 12 meses + YoY
 * Datas são fixas para permitir cache e filtragem local instantânea
 */
async function fetchOverviewData(
  companyId: string,
  filters?: {
    filial?: string[];
    clientes?: string[];
    produto?: string[];
  }
): Promise<OverviewMonthlyData[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Sessão não encontrada');
  }

  // Buscar banco de dados ativo da empresa
  const response = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({
      action: 'list',
      company_id: companyId,
    }),
  });

  const result = await response.json();

  if (!result.success || !result.data || result.data.length === 0) {
    throw new Error('Nenhum banco de dados configurado para a empresa');
  }

  const activeDb = result.data.find((db: { is_active: boolean }) => db.is_active);
  if (!activeDb) {
    throw new Error('Nenhum banco de dados ativo encontrado');
  }

  // Construir filtros
  const filialFilter =
    filters?.filial && filters.filial.length > 0 ? `'${filters.filial.join("','")}'` : null;
  const clienteFilter =
    filters?.clientes && filters.clientes.length > 0 ? `'${filters.clientes.join("','")}'` : null;
  const produtoFilter =
    filters?.produto && filters.produto.length > 0 ? `'${filters.produto.join("','")}'` : null;

  // Query otimizada com CTEs - FONTE ÚNICA DE DADOS
  // Sempre busca últimos 12 meses + 12 anteriores para YoY
  const query = buildOverviewDataQuery(filialFilter, clienteFilter, produtoFilter);

  const queryResponse = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({
      action: 'query',
      database_id: activeDb.id,
      query,
    }),
  });

  const queryResult = await queryResponse.json();

  if (!queryResult.success) {
    console.error('Erro ao buscar dados da visão geral:', queryResult.error);
    throw new Error(queryResult.error || 'Erro ao buscar dados da visão geral');
  }

  // Helper para converter valor numérico
  const toNumber = (val: unknown): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (typeof val === 'string') {
      const cleaned = val.replace(/[^0-9.,-]/g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  const toNumberOrNull = (val: unknown): number | null => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') return isNaN(val) ? null : val;
    if (typeof val === 'string') {
      const cleaned = val.replace(/[^0-9.,-]/g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    }
    return null;
  };

  const rows = (queryResult.data?.rows || []).map((row: Record<string, unknown>) => ({
    mes: String(row.mes || ''),
    faturamento: toNumber(row.faturamento),
    faturamento_mes_anterior: toNumberOrNull(row.faturamento_mes_anterior),
    crescimento_faturamento_mom_pct: toNumberOrNull(row.crescimento_faturamento_mom_pct),
    faturamento_ano_anterior: toNumberOrNull(row.faturamento_ano_anterior),
    crescimento_faturamento_yoy_pct: toNumberOrNull(row.crescimento_faturamento_yoy_pct),
    meta_faturamento: toNumberOrNull(row.meta_faturamento),
    volume_litros: toNumber(row.volume_litros),
    volume_mes_anterior: toNumberOrNull(row.volume_mes_anterior),
    crescimento_volume_mom_pct: toNumberOrNull(row.crescimento_volume_mom_pct),
    volume_ano_anterior: toNumberOrNull(row.volume_ano_anterior),
    crescimento_volume_yoy_pct: toNumberOrNull(row.crescimento_volume_yoy_pct),
    clientes_ativos: toNumber(row.clientes_ativos),
    ticket_medio: toNumber(row.ticket_medio),
    produto_lider_share: toNumberOrNull(row.produto_lider_share),
  }));

  return rows;
}

/**
 * Hook para buscar dados completos da visão geral
 * FONTE ÚNICA para todos os KPIs e tabela de detalhamento
 * Sempre busca últimos 12 meses - filtragem de período é feita localmente
 * Nova consulta só ocorre ao mudar filtros de filial/cliente/produto
 */
export function useOverviewData(filters?: {
  filial?: string[];
  clientes?: string[];
  produto?: string[];
}) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: ['overview-data', company?.id, filters],
    queryFn: () => {
      if (!company?.id) {
        throw new Error('Empresa não encontrada');
      }
      return fetchOverviewData(company.id, filters);
    },
    staleTime: 1000 * 60 * 60, // 1 hora
    enabled: !!company?.id,
  });
}

/**
 * Busca KPIs agregados para a página de visão geral (query otimizada)
 * @deprecated Use useOverviewData instead
 */
async function fetchOverviewKPIs(
  companyId: string,
  startDate: Date,
  endDate: Date,
  filters?: {
    filial?: string[];
    clientes?: string[];
    produto?: string[];
  }
): Promise<OverviewKPIs[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Usuário não autenticado');
  }

  // Buscar databases da empresa
  const response = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({
      action: 'list',
      company_id: companyId,
    }),
  });

  const result = await response.json();

  if (!result.success || !result.data || result.data.length === 0) {
    throw new Error('Nenhum banco de dados configurado para a empresa');
  }

  const activeDb = result.data.find((db: { is_active: boolean }) => db.is_active);
  if (!activeDb) {
    throw new Error('Nenhum banco de dados ativo encontrado');
  }

  // Construir filtros
  const filialFilter =
    filters?.filial && filters.filial.length > 0
      ? filters.filial.map((f) => `'${f}'`).join(',')
      : null;
  const clienteFilter =
    filters?.clientes && filters.clientes.length > 0
      ? filters.clientes.map((c) => `'${c}'`).join(',')
      : null;
  const produtoFilter =
    filters?.produto && filters.produto.length > 0
      ? filters.produto.map((p) => `'${p}'`).join(',')
      : null;

  // Formatar datas para a query
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Query otimizada para KPIs da visão geral
  const query = `
    WITH base AS (
      SELECT
        date_trunc('month', m.dt_mov)::date AS mes,
        m.cod_cliente,
        mi.id_produto,
        mi.vr_venda,
        mi.qtd_litros
      FROM public.movimentacao m
      JOIN public.movimentacao_item mi
        ON mi.id_movimentacao = m.id_movimentacao
      WHERE m.dt_mov >= '${startDateStr}'
        AND m.dt_mov <= '${endDateStr}'
        ${clienteFilter ? `AND m.cod_cliente IN (${clienteFilter})` : ''}
        ${filialFilter ? `AND m.cod_filial IN (${filialFilter})` : ''}
        ${produtoFilter ? `AND mi.id_produto IN (${produtoFilter})` : ''}
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
    )
    SELECT
      t.mes,
      t.faturamento_total::numeric AS faturamento_total,
      ((t.faturamento_total / nullif(lag(t.faturamento_total) OVER (ORDER BY t.mes), 0)) - 1)::numeric AS crescimento_pct,
      t.volume_litros::numeric AS volume_litros,
      t.clientes_ativos::integer AS clientes_ativos,
      (t.faturamento_total / nullif(t.clientes_ativos, 0))::numeric AS ticket_medio,
      pl.produto_lider_share::numeric AS produto_lider_share
    FROM totais_mes t
    LEFT JOIN produto_lider pl ON pl.mes = t.mes
    ORDER BY t.mes
  `;

  const queryResponse = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({
      action: 'query',
      database_id: activeDb.id,
      query,
    }),
  });

  const queryResult = await queryResponse.json();

  if (!queryResult.success) {
    console.error('Erro ao buscar KPIs:', queryResult.error);
    throw new Error(queryResult.error || 'Erro ao buscar KPIs');
  }

  // Helper para converter valor numérico
  const toNumber = (val: unknown): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (typeof val === 'string') {
      const cleaned = val.replace(/[^0-9.,-]/g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  const rows = (queryResult.data?.rows || []).map((row: Record<string, unknown>) => {
    // Converter data para formato YYYY-MM
    const mesData = new Date(String(row.mes));
    const mesFormatado = `${mesData.getFullYear()}-${String(mesData.getMonth() + 1).padStart(2, '0')}`;

    return {
      mes: mesFormatado,
      faturamento_total: toNumber(row.faturamento_total),
      crescimento_pct: row.crescimento_pct !== null ? toNumber(row.crescimento_pct) : null,
      volume_litros: toNumber(row.volume_litros),
      clientes_ativos: toNumber(row.clientes_ativos),
      ticket_medio: toNumber(row.ticket_medio),
      produto_lider_share:
        row.produto_lider_share !== null ? toNumber(row.produto_lider_share) : null,
    };
  }) as OverviewKPIs[];

  return rows;
}

/**
 * Hook para buscar KPIs agregados da visão geral
 */
export function useOverviewKPIs(
  startDate: Date,
  endDate: Date,
  filters?: {
    filial?: string[];
    clientes?: string[];
    produto?: string[];
  }
) {
  const { company } = useAuthStore();

  const queryKey = [
    'overview-kpis',
    company?.id,
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0],
    filters?.filial?.join(',') || '',
    filters?.clientes?.join(',') || '',
    filters?.produto?.join(',') || '',
  ];

  return useQuery({
    queryKey,
    queryFn: () => {
      if (!company?.id) {
        throw new Error('Empresa não encontrada');
      }
      return fetchOverviewKPIs(company.id, startDate, endDate, filters);
    },
    staleTime: 1000 * 60 * 60, // 1 hora
    enabled: !!company?.id,
  });
}

/**
 * Busca faturamento mensal agregado diretamente do banco (muito mais eficiente)
 */
async function fetchMonthlyRevenue(
  companyId: string,
  filters?: {
    filial?: string[];
    clientes?: string[];
    produto?: string[];
  }
): Promise<MonthlyRevenue[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Usuário não autenticado');
  }

  // Buscar databases da empresa
  const response = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({
      action: 'list',
      company_id: companyId,
    }),
  });

  const result = await response.json();

  if (!result.success || !result.data || result.data.length === 0) {
    throw new Error('Nenhum banco de dados configurado para a empresa');
  }

  const activeDb = result.data.find((db: { is_active: boolean }) => db.is_active);
  if (!activeDb) {
    throw new Error('Nenhum banco de dados ativo encontrado');
  }

  // Verificar se as tabelas normalizadas existem
  const checkQuery = `
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'movimentacao') as mov_exists,
           EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'movimentacao_item') as item_exists
  `;

  const checkResponse = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({
      action: 'query',
      database_id: activeDb.id,
      query: checkQuery,
    }),
  });

  const checkResult = await checkResponse.json();

  let query: string;

  // Se as tabelas normalizadas existem, usar query otimizada
  if (
    checkResult.success &&
    checkResult.data?.rows?.[0]?.mov_exists &&
    checkResult.data?.rows?.[0]?.item_exists
  ) {
    // Query otimizada para faturamento mensal (últimos 12 meses)
    // Filtros são aplicados diretamente sem CTEs desnecessárias
    const filialFilter =
      filters?.filial && filters.filial.length > 0
        ? filters.filial.map((f) => `'${f}'`).join(',')
        : null;
    const clienteFilter =
      filters?.clientes && filters.clientes.length > 0
        ? filters.clientes.map((c) => `'${c}'`).join(',')
        : null;
    const produtoFilter =
      filters?.produto && filters.produto.length > 0
        ? filters.produto.map((p) => `'${p}'`).join(',')
        : null;

    query = `
      SELECT
        to_char(date_trunc('month', m.dt_mov), 'YYYY-MM') as mes,
        sum(mi.vr_venda)::numeric as faturamento_total,
        sum(mi.qtd_litros)::numeric as volume_total
      FROM public.movimentacao m
      JOIN public.movimentacao_item mi
        ON mi.id_movimentacao = m.id_movimentacao
      WHERE m.dt_mov >= date_trunc('month', current_date) - interval '11 months'
        AND m.dt_mov < date_trunc('month', current_date) + interval '1 month'
        ${clienteFilter ? `AND m.cod_cliente IN (${clienteFilter})` : ''}
        ${filialFilter ? `AND m.cod_filial IN (${filialFilter})` : ''}
        ${produtoFilter ? `AND mi.id_produto IN (${produtoFilter})` : ''}
      GROUP BY 1
      ORDER BY 1
    `;
  } else {
    // Fallback para tabela desnormalizada
    console.warn(
      '⚠️ [fetchMonthlyRevenue] Tabelas normalizadas não encontradas, usando fallback para movimentos'
    );

    let whereClause = '';
    const conditions: string[] = [];

    if (filters?.filial && filters.filial.length > 0) {
      const filiaisList = filters.filial.map((f) => `'${f}'`).join(',');
      conditions.push(`cod_filial IN (${filiaisList})`);
    }
    if (filters?.clientes && filters.clientes.length > 0) {
      const clientesList = filters.clientes.map((c) => `'${c}'`).join(',');
      conditions.push(`cod_cliente IN (${clientesList})`);
    }
    if (filters?.produto && filters.produto.length > 0) {
      const produtosList = filters.produto.map((p) => `'${p}'`).join(',');
      conditions.push(`cod_produto IN (${produtosList})`);
    }

    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    query = `
      SELECT
        to_char(dt_mov, 'YYYY-MM') AS mes,
        SUM(vr_venda) AS faturamento_total,
        SUM(qtd_itens_venda) AS volume_total
      FROM movimentos
      ${whereClause}
      GROUP BY to_char(dt_mov, 'YYYY-MM')
      ORDER BY mes DESC
      LIMIT 24
    `;
  }

  const queryResponse = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({
      action: 'query',
      database_id: activeDb.id,
      query,
    }),
  });

  const queryResult = await queryResponse.json();

  if (!queryResult.success) {
    console.error('Erro ao buscar faturamento mensal:', queryResult.error);
    throw new Error(queryResult.error || 'Erro ao buscar faturamento mensal');
  }

  // Helper para converter valor numérico (postgres retorna numeric como string)
  const toNumber = (val: unknown): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (typeof val === 'string') {
      // Remove tudo exceto dígitos, ponto e vírgula
      const cleaned = val.replace(/[^0-9.,-]/g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  const rows = (queryResult.data?.rows || []).map((row: Record<string, unknown>) => {
    const faturamento = toNumber(row.faturamento_total);
    const mes = String(row.mes || '');
    return {
      mes,
      faturamento,
      volume: toNumber(row.volume_total),
    };
  }) as MonthlyRevenue[];

  // Ordenar cronologicamente e pegar últimos 12
  return rows.sort((a, b) => a.mes.localeCompare(b.mes)).slice(-12);
}

/**
 * Busca lista de clientes distintos do banco externo da empresa
 */
async function fetchClients(companyId: string): Promise<Array<{ value: string; label: string }>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Usuário não autenticado');
  }

  // Buscar databases da empresa
  const response = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({
      action: 'list',
      company_id: companyId,
    }),
  });

  const result = await response.json();

  if (!result.success || !result.data || result.data.length === 0) {
    throw new Error('Nenhum banco de dados configurado para a empresa');
  }

  const activeDb = result.data.find((db: { is_active: boolean }) => db.is_active);
  if (!activeDb) {
    return [];
  }

  // Verificar se as tabelas normalizadas existem
  const checkQuery = `
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'cliente') as cli_exists
  `;

  const checkResponse = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({
      action: 'query',
      database_id: activeDb.id,
      query: checkQuery,
    }),
  });

  const checkResult = await checkResponse.json();

  let query: string;

  // Se a tabela cliente existe, usar query nova
  if (checkResult.success && checkResult.data?.rows?.[0]?.cli_exists) {
    // Query SQL específica para buscar clientes da tabela normalizada
    query = `
      SELECT DISTINCT
        c.id::text as cod_cliente,
        coalesce(c.razao_social, c.nome) as nome_cliente
      FROM public.cliente c
      WHERE c.id IS NOT NULL 
        AND (c.razao_social IS NOT NULL OR c.nome IS NOT NULL)
        AND coalesce(c.razao_social, c.nome) != ''
      ORDER BY coalesce(c.razao_social, c.nome)
    `;
  } else {
    // Fallback para tabela desnormalizada
    query = `
      SELECT DISTINCT
        cod_cliente,
        nome_cliente
      FROM movimentos
      ORDER BY nome_cliente
    `;
  }

  // Executar a query no banco externo
  const queryResponse = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({
      action: 'query',
      database_id: activeDb.id,
      query: query,
    }),
  });

  const queryResult = await queryResponse.json();

  if (!queryResult.success || !Array.isArray(queryResult.data)) {
    throw new Error(`Erro ao buscar clientes: ${queryResult.message || 'Erro desconhecido'}`);
  }

  // Converter dados para formato do MultiSelect
  return queryResult.data.map((item: { cod_cliente: string; nome_cliente: string }) => ({
    value: item.cod_cliente,
    label: item.nome_cliente,
  }));
}

/**
 * Hook para buscar lista de clientes
 */
export function useClients() {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: ['clients', company?.id],
    queryFn: () => {
      if (!company?.id) {
        throw new Error('Empresa não encontrada');
      }
      return fetchClients(company.id);
    },
    staleTime: 1000 * 60 * 60, // 1 hora
    enabled: !!company?.id,
  });
}

// Mock data generation removed - use only real database data

/**
 * Hook para buscar faturamento mensal agregado (últimos 12 meses)
 */
export function useMonthlyRevenue(filters?: {
  filial?: string[];
  clientes?: string[];
  produto?: string[];
}) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: ['monthly-revenue', company?.id, filters],
    queryFn: () => {
      if (!company?.id) {
        throw new Error('Empresa não encontrada');
      }
      return fetchMonthlyRevenue(company.id, filters);
    },
    staleTime: 1000 * 60 * 60, // 1 hora
    enabled: true,
  });
}

/**
 * Busca top 10 produtos por faturamento
 */
async function fetchTopProducts(
  companyId: string,
  startDate: Date,
  endDate: Date,
  filters?: {
    filial?: string[];
    clientes?: string[];
    produto?: string[];
  }
): Promise<Array<{ name: string; value: number }>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Usuário não autenticado');
  }

  const response = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({
      action: 'list',
      company_id: companyId,
    }),
  });

  const result = await response.json();
  if (!result.success || !result.data || result.data.length === 0) {
    throw new Error('Nenhum banco de dados configurado');
  }

  const activeDb = result.data.find((db: { is_active: boolean }) => db.is_active);
  if (!activeDb) {
    throw new Error('Nenhum banco de dados ativo encontrado');
  }

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Verificar se as tabelas normalizadas existem
  const checkQuery = `
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'produto') as prod_exists,
           EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'movimentacao') as mov_exists
  `;

  let hasNormalizedTables = false;
  try {
    const checkResponse = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: resolvedSupabaseAnonKey,
      },
      body: JSON.stringify({
        action: 'query',
        database_id: activeDb.id,
        query: checkQuery,
      }),
    });

    const checkResult = await checkResponse.json();
    hasNormalizedTables =
      checkResult.success &&
      checkResult.data?.rows?.[0]?.prod_exists &&
      checkResult.data?.rows?.[0]?.mov_exists;
  } catch (error) {
    console.error('[fetchTopProducts] Erro ao verificar tabelas normalizadas:', error);
    hasNormalizedTables = false;
  }

  let query: string;

  // Construir filtros WHERE
  let whereFilters = '';
  if (filters?.filial && filters.filial.length > 0) {
    const filialList = filters.filial.map((f) => `'${f.replace(/'/g, "''")}'`).join(', ');
    whereFilters += ` AND cod_filial IN (${filialList})`;
  }
  if (filters?.clientes && filters.clientes.length > 0) {
    const clientesList = filters.clientes.map((c) => `'${c.replace(/'/g, "''")}'`).join(', ');
    whereFilters += ` AND cod_cliente IN (${clientesList})`;
  }
  if (filters?.produto && filters.produto.length > 0) {
    const produtoList = filters.produto.map((p) => `'${p.replace(/'/g, "''")}'`).join(', ');
    whereFilters += ` AND cod_produto IN (${produtoList})`;
  }

  // Se as tabelas normalizadas existem, usar query normalizada
  if (hasNormalizedTables) {
    query = `
      SELECT 
        p.nome as nome_produto,
        SUM(mi.vr_total) as faturamento
      FROM movimentacao m
      JOIN movimentacao_item mi ON m.id = mi.movimentacao_id
      JOIN produto p ON mi.cod_produto = p.cod_produto
      WHERE m.dt_mov >= '${startDateStr}'
        AND m.dt_mov <= '${endDateStr}'
        ${whereFilters}
      GROUP BY p.nome
      ORDER BY faturamento DESC
      LIMIT 10
    `;
  } else {
    // Fallback para tabela desnormalizada
    query = `
      SELECT 
        nome_produto,
        SUM(vr_venda) as faturamento
      FROM movimentos
      WHERE dt_mov >= '${startDateStr}'
        AND dt_mov <= '${endDateStr}'
        ${whereFilters}
      GROUP BY nome_produto
      ORDER BY faturamento DESC
      LIMIT 10
    `;
  }

  const queryResponse = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({
      action: 'query',
      database_id: activeDb.id,
      query: query,
    }),
  });

  const queryResult = await queryResponse.json();
  if (!queryResult.success || !Array.isArray(queryResult.data)) {
    return [];
  }

  return queryResult.data.map((row: any) => ({
    name: row.nome_produto || 'Produto',
    value: parseFloat(row.faturamento) || 0,
  }));
}

/**
 * Busca top 10 clientes por faturamento
 */
async function fetchTopClients(
  companyId: string,
  startDate: Date,
  endDate: Date,
  filters?: {
    filial?: string[];
    clientes?: string[];
    produto?: string[];
  }
): Promise<Array<{ name: string; value: number }>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Usuário não autenticado');
  }

  const response = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({
      action: 'list',
      company_id: companyId,
    }),
  });

  const result = await response.json();
  if (!result.success || !result.data || result.data.length === 0) {
    throw new Error('Nenhum banco de dados configurado');
  }

  const activeDb = result.data.find((db: { is_active: boolean }) => db.is_active);
  if (!activeDb) {
    throw new Error('Nenhum banco de dados ativo encontrado');
  }

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Verificar se as tabelas normalizadas existem
  const checkQuery = `
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'cliente') as cli_exists,
           EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'movimentacao') as mov_exists
  `;

  let hasNormalizedTables = false;
  try {
    const checkResponse = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: resolvedSupabaseAnonKey,
      },
      body: JSON.stringify({
        action: 'query',
        database_id: activeDb.id,
        query: checkQuery,
      }),
    });

    const checkResult = await checkResponse.json();
    hasNormalizedTables =
      checkResult.success &&
      checkResult.data?.rows?.[0]?.cli_exists &&
      checkResult.data?.rows?.[0]?.mov_exists;
  } catch (error) {
    console.error('[fetchTopClients] Erro ao verificar tabelas normalizadas:', error);
    hasNormalizedTables = false;
  }

  let query: string;

  // Construir filtros WHERE
  let whereFilters = '';
  if (filters?.filial && filters.filial.length > 0) {
    const filialList = filters.filial.map((f) => `'${f.replace(/'/g, "''")}'`).join(', ');
    whereFilters += ` AND cod_filial IN (${filialList})`;
  }
  if (filters?.clientes && filters.clientes.length > 0) {
    const clientesList = filters.clientes.map((c) => `'${c.replace(/'/g, "''")}'`).join(', ');
    whereFilters += ` AND cod_cliente IN (${clientesList})`;
  }
  if (filters?.produto && filters.produto.length > 0) {
    const produtoList = filters.produto.map((p) => `'${p.replace(/'/g, "''")}'`).join(', ');
    whereFilters += ` AND cod_produto IN (${produtoList})`;
  }

  // Se as tabelas normalizadas existem, usar query normalizada
  if (hasNormalizedTables) {
    query = `
      SELECT 
        c.nome as nome_cliente,
        SUM(mi.vr_total) as faturamento
      FROM movimentacao m
      JOIN movimentacao_item mi ON m.id = mi.movimentacao_id
      JOIN cliente c ON m.cod_cliente = c.id::text
      WHERE m.dt_mov >= '${startDateStr}'
        AND m.dt_mov <= '${endDateStr}'
        ${whereFilters}
      GROUP BY c.nome
      ORDER BY faturamento DESC
      LIMIT 10
    `;
  } else {
    // Fallback para tabela desnormalizada
    query = `
      SELECT 
        nome_cliente,
        SUM(vr_venda) as faturamento
      FROM movimentos
      WHERE dt_mov >= '${startDateStr}'
        AND dt_mov <= '${endDateStr}'
        ${whereFilters}
      GROUP BY nome_cliente
      ORDER BY faturamento DESC
      LIMIT 10
    `;
  }

  const queryResponse = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({
      action: 'query',
      database_id: activeDb.id,
      query: query,
    }),
  });

  const queryResult = await queryResponse.json();
  if (!queryResult.success || !Array.isArray(queryResult.data)) {
    return [];
  }

  return queryResult.data.map((row: any) => ({
    name: row.nome_cliente || 'Cliente',
    value: parseFloat(row.faturamento) || 0,
  }));
}

/**
 * Hook para buscar top 10 produtos
 */
export function useTopProducts(
  startDate: Date,
  endDate: Date,
  filters?: {
    filial?: string[];
    clientes?: string[];
    produto?: string[];
  }
) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: ['top-products', company?.id, startDate, endDate, filters],
    queryFn: () => {
      if (!company?.id) {
        throw new Error('Empresa não encontrada');
      }
      return fetchTopProducts(company.id, startDate, endDate, filters);
    },
    staleTime: 1000 * 60 * 60, // 1 hora
    enabled: !!company?.id,
  });
}

/**
 * Hook para buscar top 10 clientes
 */
export function useTopClients(
  startDate: Date,
  endDate: Date,
  filters?: {
    filial?: string[];
    clientes?: string[];
    produto?: string[];
  }
) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: ['top-clients', company?.id, startDate, endDate, filters],
    queryFn: () => {
      if (!company?.id) {
        throw new Error('Empresa não encontrada');
      }
      return fetchTopClients(company.id, startDate, endDate, filters);
    },
    staleTime: 1000 * 60 * 60, // 1 hora
    enabled: !!company?.id,
  });
}

// ========================================
// FATURAMENTO POR ESTADO (UF)
// ========================================

export interface RevenueByStateData {
  uf: string;
  faturamento: number;
}

/**
 * Busca faturamento agregado por estado (UF) nos últimos 12 meses
 */
async function fetchRevenueByState(
  companyId: string,
  filters?: {
    filial?: string[];
    clientes?: string[];
    produto?: string[];
  }
): Promise<RevenueByStateData[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Usuário não autenticado');
  }

  // Buscar databases da empresa
  const response = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({
      action: 'list',
      company_id: companyId,
    }),
  });

  const result = await response.json();

  if (!result.success || !result.data || result.data.length === 0) {
    throw new Error('Nenhum banco de dados configurado para a empresa');
  }

  const activeDb = result.data.find((db: { is_active: boolean }) => db.is_active);
  if (!activeDb) {
    throw new Error('Nenhum banco de dados ativo encontrado');
  }

  // Construir filtros opcionais
  const filialFilter =
    filters?.filial && filters.filial.length > 0
      ? filters.filial.map((f) => `'${f}'`).join(',')
      : null;
  const clienteFilter =
    filters?.clientes && filters.clientes.length > 0
      ? filters.clientes.map((c) => `'${c}'`).join(',')
      : null;
  const produtoFilter =
    filters?.produto && filters.produto.length > 0
      ? filters.produto.map((p) => `'${p}'`).join(',')
      : null;

  // Query para faturamento por UF nos últimos 12 meses
  const query = `
    SELECT
      upper(trim(c.endereco_uf)) AS uf,
      sum(mi.vr_venda) AS faturamento
    FROM public.movimentacao m
    JOIN public.movimentacao_item mi
      ON mi.id_movimentacao = m.id_movimentacao
    JOIN public.cliente c
      ON c.id = m.cod_cliente
    WHERE m.dt_mov >= date_trunc('month', current_date) - interval '11 months'
      AND m.dt_mov < date_trunc('month', current_date) + interval '1 month'
      AND c.endereco_uf IS NOT NULL
      AND trim(c.endereco_uf) <> ''
      ${clienteFilter ? `AND m.cod_cliente IN (${clienteFilter})` : ''}
      ${filialFilter ? `AND m.cod_filial IN (${filialFilter})` : ''}
      ${produtoFilter ? `AND mi.id_produto IN (${produtoFilter})` : ''}
    GROUP BY 1
    ORDER BY faturamento DESC
  `;

  const queryResponse = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({
      action: 'query',
      database_id: activeDb.id,
      query,
    }),
  });

  const queryResult = await queryResponse.json();

  if (!queryResult.success) {
    console.error('Erro ao buscar faturamento por UF:', queryResult.error);
    throw new Error(queryResult.error || 'Erro ao buscar faturamento por UF');
  }

  // Mapear resultado para o tipo esperado
  const data: RevenueByStateData[] = (queryResult.data?.rows || []).map(
    (row: { uf: string; faturamento: string | number }) => ({
      uf: row.uf,
      faturamento: Number(row.faturamento) || 0,
    })
  );

  return data;
}

/**
 * Hook para buscar faturamento por estado (UF) nos últimos 12 meses
 */
export function useRevenueByState(filters?: {
  filial?: string[];
  clientes?: string[];
  produto?: string[];
}) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: ['revenue-by-state', company?.id, filters],
    queryFn: () => {
      if (!company?.id) {
        throw new Error('Empresa não encontrada');
      }
      return fetchRevenueByState(company.id, filters);
    },
    staleTime: 1000 * 60 * 60, // 1 hora
    enabled: !!company?.id,
  });
}

// ========================================
// FATURAMENTO POR REGIÃO
// ========================================

export interface RevenueByRegionData {
  regiao: string;
  faturamento: number;
}

/**
 * Busca faturamento agregado por região nos últimos 12 meses
 */
async function fetchRevenueByRegion(
  companyId: string,
  filters?: {
    filial?: string[];
    clientes?: string[];
    produto?: string[];
  }
): Promise<RevenueByRegionData[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Usuário não autenticado');
  }

  // Buscar databases da empresa
  const response = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({
      action: 'list',
      company_id: companyId,
    }),
  });

  const result = await response.json();

  if (!result.success || !result.data || result.data.length === 0) {
    throw new Error('Nenhum banco de dados configurado para a empresa');
  }

  const activeDb = result.data.find((db: { is_active: boolean }) => db.is_active);
  if (!activeDb) {
    throw new Error('Nenhum banco de dados ativo encontrado');
  }

  // Construir filtros opcionais
  const filialFilter =
    filters?.filial && filters.filial.length > 0
      ? filters.filial.map((f) => `'${f}'`).join(',')
      : null;
  const clienteFilter =
    filters?.clientes && filters.clientes.length > 0
      ? filters.clientes.map((c) => `'${c}'`).join(',')
      : null;
  const produtoFilter =
    filters?.produto && filters.produto.length > 0
      ? filters.produto.map((p) => `'${p}'`).join(',')
      : null;

  // Query para faturamento por região nos últimos 12 meses
  const query = `
    SELECT
      CASE
        WHEN upper(trim(c.endereco_uf)) IN ('AC','AP','AM','PA','RO','RR','TO') THEN 'Norte'
        WHEN upper(trim(c.endereco_uf)) IN ('AL','BA','CE','MA','PB','PE','PI','RN','SE') THEN 'Nordeste'
        WHEN upper(trim(c.endereco_uf)) IN ('DF','GO','MT','MS') THEN 'Centro-Oeste'
        WHEN upper(trim(c.endereco_uf)) IN ('ES','MG','RJ','SP') THEN 'Sudeste'
        WHEN upper(trim(c.endereco_uf)) IN ('PR','RS','SC') THEN 'Sul'
        ELSE 'Não identificado'
      END AS regiao,
      sum(mi.vr_venda) AS faturamento
    FROM public.movimentacao m
    JOIN public.movimentacao_item mi
      ON mi.id_movimentacao = m.id_movimentacao
    JOIN public.cliente c
      ON c.id = m.cod_cliente
    WHERE m.dt_mov >= date_trunc('month', current_date) - interval '11 months'
      AND m.dt_mov < date_trunc('month', current_date) + interval '1 month'
      AND c.endereco_uf IS NOT NULL
      AND trim(c.endereco_uf) <> ''
      ${clienteFilter ? `AND m.cod_cliente IN (${clienteFilter})` : ''}
      ${filialFilter ? `AND m.cod_filial IN (${filialFilter})` : ''}
      ${produtoFilter ? `AND mi.id_produto IN (${produtoFilter})` : ''}
    GROUP BY 1
    ORDER BY faturamento DESC
  `;

  const queryResponse = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({
      action: 'query',
      database_id: activeDb.id,
      query,
    }),
  });

  const queryResult = await queryResponse.json();

  if (!queryResult.success) {
    console.error('Erro ao buscar faturamento por região:', queryResult.error);
    throw new Error(queryResult.error || 'Erro ao buscar faturamento por região');
  }

  // Mapear resultado para o tipo esperado
  const data: RevenueByRegionData[] = (queryResult.data?.rows || []).map(
    (row: { regiao: string; faturamento: string | number }) => ({
      regiao: row.regiao,
      faturamento: Number(row.faturamento) || 0,
    })
  );

  return data;
}

/**
 * Hook para buscar faturamento por região nos últimos 12 meses
 */
export function useRevenueByRegion(filters?: {
  filial?: string[];
  clientes?: string[];
  produto?: string[];
}) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: ['revenue-by-region', company?.id, filters],
    queryFn: () => {
      if (!company?.id) {
        throw new Error('Empresa não encontrada');
      }
      return fetchRevenueByRegion(company.id, filters);
    },
    staleTime: 1000 * 60 * 60, // 1 hora
    enabled: !!company?.id,
  });
}
