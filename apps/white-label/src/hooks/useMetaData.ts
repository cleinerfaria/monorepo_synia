import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { supabase, resolvedSupabaseUrl, resolvedSupabaseAnonKey } from '@/lib/supabase';

/**
 * Tipo para dados da view vw_meta_faturamento
 */
export interface MetaFaturamento {
  dia_ano_atual: string;
  dia_ano_anterior: string;
  faturamento_dia_ano_anterior: number;
  faturamento_acumulado_ano_anterior: number;
  meta_dia_ano_atual: number;
  meta_acumulada_ano_atual: number;
  faturamento_real_dia_ano_atual: number;
  faturamento_acumulado_ano_atual: number;
  meta_mes: number | null;
  real_mes: number | null;
  real_anterior: number | null;
}

/**
 * Helper para converter valor numérico (postgres pode retornar string, Decimal, ou number)
 */
const toNumber = (val: unknown): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^\d.,-]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  if (typeof val === 'object' && val !== null) {
    if ('value' in val) return toNumber((val as { value: unknown }).value);
    if ('toString' in val) return toNumber(String(val));
  }
  return 0;
};

/**
 * Busca dados da view meta_faturamento do banco externo da empresa
 */
async function fetchMetaFaturamento(
  companyId: string,
  filters?: {
    filial?: string[];
  }
): Promise<MetaFaturamento[]> {
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

  // Construir WHERE clause
  let whereClause = '';
  const conditions: string[] = [];

  if (filters?.filial && filters.filial.length > 0) {
    const filiaisList = filters.filial.map((f) => `'${f}'`).join(',');
    conditions.push(`cod_filial IN (${filiaisList})`);
  }

  if (conditions.length > 0) {
    whereClause = `WHERE ${conditions.join(' AND ')}`;
  }

  // Query para buscar dados da view vw_meta_faturamento
  const query = `
    SELECT 
      dia_ano_atual,
      dia_ano_anterior,
      faturamento_dia_ano_anterior,
      faturamento_acumulado_ano_anterior,
      meta_dia_ano_atual,
      meta_acumulada_ano_atual,
      faturamento_real_dia_ano_atual,
      faturamento_acumulado_ano_atual,
      meta_mes,
      real_mes,
      real_anterior
    FROM vw_meta_faturamento
    ${whereClause}
    ORDER BY dia_ano_atual ASC
  `;

  console.log('🎯 [fetchMetaFaturamento] Query:', query);

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
    console.error('Erro ao buscar vw_meta_faturamento:', queryResult.error);
    throw new Error(queryResult.error || 'Erro ao buscar dados de meta');
  }

  console.log('🎯 [fetchMetaFaturamento] Resultado:', {
    totalRows: queryResult.data?.rows?.length || 0,
    firstRow: queryResult.data?.rows?.[0],
  });

  // Parsear valores numéricos
  const rows = (queryResult.data?.rows || []).map((row: Record<string, unknown>) => ({
    dia_ano_atual: String(row.dia_ano_atual || ''),
    dia_ano_anterior: String(row.dia_ano_anterior || ''),
    faturamento_dia_ano_anterior: toNumber(row.faturamento_dia_ano_anterior),
    faturamento_acumulado_ano_anterior: toNumber(row.faturamento_acumulado_ano_anterior),
    meta_dia_ano_atual: toNumber(row.meta_dia_ano_atual),
    meta_acumulada_ano_atual: toNumber(row.meta_acumulada_ano_atual),
    faturamento_real_dia_ano_atual: toNumber(row.faturamento_real_dia_ano_atual),
    faturamento_acumulado_ano_atual: toNumber(row.faturamento_acumulado_ano_atual),
    meta_mes: row.meta_mes !== null ? toNumber(row.meta_mes) : null,
    real_mes: row.real_mes !== null ? toNumber(row.real_mes) : null,
    real_anterior: row.real_anterior !== null ? toNumber(row.real_anterior) : null,
  })) as MetaFaturamento[];

  return rows;
}

/**
 * Hook para buscar dados de meta vs faturamento
 */
export function useMetaData(filters?: { filial?: string[] }) {
  const { company } = useAuthStore();

  const queryKey = ['meta-faturamento', company?.id, filters];

  return useQuery({
    queryKey,
    queryFn: () => {
      if (!company?.id) {
        throw new Error('Empresa não encontrada');
      }
      return fetchMetaFaturamento(company.id, filters);
    },
    staleTime: 1000 * 60 * 60, // 1 hora
    enabled: !!company?.id,
  });
}
