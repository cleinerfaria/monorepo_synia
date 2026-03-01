import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { supabase, resolvedSupabaseUrl, resolvedSupabaseAnonKey } from '@/lib/supabase';
import { useState, useCallback, useMemo } from 'react';

interface FilterOption {
  value: string;
  label: string;
}

interface _FilialData {
  cod_filial: string;
  nome_filial: string;
}

interface _ClienteData {
  cod_cliente: string;
  nome_cliente: string;
}

interface _GrupoData {
  id: string;
  name: string;
}

interface _RegionalData {
  id: string;
  name: string;
}

interface _ProdutoData {
  cod_produto: string;
  nome_produto: string;
}

/**
 * Executa uma query no banco de dados da empresa com fallback
 */
async function executeCompanyQueryWithFallback<T = any[]>(
  companyId: string,
  primaryQuery: string,
  fallbackQuery: string
): Promise<T> {
  try {
    const result = await executeCompanyQuery<T>(companyId, primaryQuery);

    // Se não retornou dados, tenta o fallback
    if (!result || (Array.isArray(result) && result.length === 0)) {
      return await executeCompanyQuery<T>(companyId, fallbackQuery);
    }

    return result;
  } catch (error) {
    console.error('❌ [FilterOptions] Erro na query primária, tentando fallback:', error);
    return await executeCompanyQuery<T>(companyId, fallbackQuery);
  }
}

/**
 * Executa uma query no banco de dados da empresa
 */
async function executeCompanyQuery<T = any[]>(companyId: string, query: string): Promise<T> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Usuário não autenticado');
    }

    // Buscar o banco ativo da empresa
    const { data: databases, error: dbError } = await supabase
      .from('company_databases')
      .select('id, name, is_active, is_default')
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (dbError) {
      console.error('❌ [FilterOptions] Erro ao buscar bancos:', dbError);
      throw new Error(`Erro ao buscar bancos da empresa: ${dbError.message}`);
    }

    if (!databases || databases.length === 0) {
      return [] as T;
    }

    // Usar o primeiro banco ativo (ou o padrão)
    const activeDb = databases.find((db) => db.is_default) || databases[0];
    // Executar a query no banco externo
    const response = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
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

    const result = await response.json();

    if (!result.success) {
      console.error('❌ [FilterOptions] Erro na query:', result.error);
      throw new Error(result.error || 'Erro ao executar query');
    }

    return result.data?.rows || ([] as T);
  } catch (error) {
    console.error('💥 [FilterOptions] Erro na execução:', error);
    throw error;
  }
}

/**
 * Hook para buscar opções de filial
 */
export function useFilialOptions() {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: ['filter-options', 'filial', company?.id],
    queryFn: async (): Promise<FilterOption[]> => {
      if (!company) {
        throw new Error('Nenhuma empresa selecionada');
      }

      const primaryQuery = `
        SELECT DISTINCT 
          f.id::text as value,
          f.nome as label
        FROM public.filial f
        WHERE f.id IS NOT NULL 
          AND f.nome IS NOT NULL
          AND f.nome != ''
        ORDER BY f.nome
      `;

      const fallbackQuery = `
        SELECT DISTINCT 
          cod_filial as value,
          nome_filial as label
        FROM movimentos
        WHERE cod_filial IS NOT NULL 
          AND nome_filial IS NOT NULL
          AND cod_filial != ''
          AND nome_filial != ''
        ORDER BY nome_filial
      `;

      try {
        const rows = await executeCompanyQueryWithFallback<Array<{ value: string; label: string }>>(
          company.id,
          primaryQuery,
          fallbackQuery
        );

        return rows.map((row) => ({
          value: String(row.value || ''),
          label: String(row.label || ''),
        }));
      } catch (error) {
        console.error('❌ [Filial] Erro ao buscar filiais:', error);
        throw new Error('Erro ao buscar filiais da empresa');
      }
    },
    enabled: !!company,
    staleTime: 1000 * 60 * 60, // 1 hora
  });
}

/**
 * Hook para buscar opções de cliente com paginação e busca
 * Suporta infinite scroll - carrega 20 itens por vez
 */
export function useClienteOptions() {
  const { company } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const PAGE_SIZE = 20;

  const infiniteQuery = useInfiniteQuery({
    queryKey: ['filter-options', 'cliente', company?.id, searchTerm],
    queryFn: async ({
      pageParam = 0,
    }): Promise<{ items: FilterOption[]; nextPage: number | null; total: number }> => {
      if (!company) {
        throw new Error('Nenhuma empresa selecionada');
      }

      const offset = pageParam * PAGE_SIZE;
      const searchCondition = searchTerm
        ? `AND (LOWER(nome_cliente) LIKE LOWER('%${searchTerm.replace(/'/g, "''")}%') OR cod_cliente LIKE '%${searchTerm.replace(/'/g, "''")}%')`
        : '';

      const primaryQuery = `
        SELECT DISTINCT
          c.id::text as value,
          coalesce(c.razao_social, c.nome) as label
        FROM public.cliente c
        WHERE c.id IS NOT NULL
          AND (c.razao_social IS NOT NULL OR c.nome IS NOT NULL)
          AND coalesce(c.razao_social, c.nome) != ''
          ${searchCondition.replace('nome_cliente', 'coalesce(c.razao_social, c.nome)').replace('cod_cliente', 'c.id::text')}
        ORDER BY coalesce(c.razao_social, c.nome)
        LIMIT ${PAGE_SIZE + 1}
        OFFSET ${offset}
      `;

      const fallbackQuery = `
        SELECT DISTINCT
          cod_cliente as value,
          nome_cliente as label
        FROM movimentos
        WHERE cod_cliente IS NOT NULL
          AND nome_cliente IS NOT NULL
          AND cod_cliente != ''
          AND nome_cliente != ''
          ${searchCondition}
        ORDER BY nome_cliente
        LIMIT ${PAGE_SIZE + 1}
        OFFSET ${offset}
      `;

      try {
        const rows = await executeCompanyQueryWithFallback<Array<{ value: string; label: string }>>(
          company.id,
          primaryQuery,
          fallbackQuery
        );

        const hasMore = rows.length > PAGE_SIZE;
        const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

        return {
          items: items.map((row) => ({
            value: String(row.value || ''),
            label: `${String(row.value || '')} - ${String(row.label || '')}`,
          })),
          nextPage: hasMore ? pageParam + 1 : null,
          total: items.length,
        };
      } catch (error) {
        console.error('❌ [Cliente] Erro ao buscar clientes:', error);
        throw new Error('Erro ao buscar clientes da empresa');
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!company,
    staleTime: 1000 * 60 * 60, // 1 hora
  });

  // Flatten all pages into a single array
  const allOptions = useMemo(() => {
    if (!infiniteQuery.data?.pages) return [];
    return infiniteQuery.data.pages.flatMap((page) => page.items);
  }, [infiniteQuery.data?.pages]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const loadMore = useCallback(() => {
    if (infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
      infiniteQuery.fetchNextPage();
    }
  }, [infiniteQuery]);

  return {
    data: allOptions,
    isLoading: infiniteQuery.isLoading,
    isFetching: infiniteQuery.isFetching,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    hasNextPage: infiniteQuery.hasNextPage || false,
    fetchNextPage: loadMore,
    onSearch: handleSearch,
    searchTerm,
    refetch: infiniteQuery.refetch,
  };
}

/**
 * Hook para buscar opções de grupo
 */
export function useGrupoOptions() {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: ['filter-options', 'grupo', company?.id],
    queryFn: async (): Promise<FilterOption[]> => {
      if (!company) {
        throw new Error('Nenhuma empresa selecionada');
      }

      const query = `
        SELECT DISTINCT
          g.id::text as value,
          g.name as label
        FROM public.grupo g
        WHERE g.id IS NOT NULL
          AND g.name IS NOT NULL
          AND g.name <> ''
        ORDER BY g.name
      `;

      const rows = await executeCompanyQuery<Array<_GrupoData & { value: string; label: string }>>(
        company.id,
        query
      );

      return rows.map((row) => ({
        value: String(row.value || ''),
        label: String(row.label || ''),
      }));
    },
    enabled: !!company,
    staleTime: 1000 * 60 * 60,
  });
}

/**
 * Hook para buscar opções de regional
 */
export function useRegionalOptions() {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: ['filter-options', 'regional', company?.id],
    queryFn: async (): Promise<FilterOption[]> => {
      if (!company) {
        throw new Error('Nenhuma empresa selecionada');
      }

      const query = `
        SELECT DISTINCT
          r.id::text as value,
          r.name as label
        FROM public.regional r
        WHERE r.id IS NOT NULL
          AND r.name IS NOT NULL
          AND r.name <> ''
        ORDER BY r.name
      `;

      const rows = await executeCompanyQuery<
        Array<_RegionalData & { value: string; label: string }>
      >(company.id, query);

      return rows.map((row) => ({
        value: String(row.value || ''),
        label: String(row.label || ''),
      }));
    },
    enabled: !!company,
    staleTime: 1000 * 60 * 60,
  });
}

/**
 * Hook para buscar opções de produto
 */
export function useProdutoOptions() {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: ['filter-options', 'produto', company?.id],
    queryFn: async (): Promise<FilterOption[]> => {
      if (!company) {
        throw new Error('Nenhuma empresa selecionada');
      }

      const primaryQuery = `
        SELECT DISTINCT 
          p.id::text as value,
          p.nome as label
        FROM public.produto p
        WHERE p.id IS NOT NULL 
          AND p.nome IS NOT NULL
          AND p.nome != ''
        ORDER BY p.nome
      `;

      const fallbackQuery = `
        SELECT DISTINCT 
          cod_produto as value,
          nome_produto as label
        FROM movimentos
        WHERE cod_produto IS NOT NULL 
          AND nome_produto IS NOT NULL
          AND cod_produto != ''
          AND nome_produto != ''
        ORDER BY nome_produto
      `;

      try {
        const rows = await executeCompanyQueryWithFallback<Array<{ value: string; label: string }>>(
          company.id,
          primaryQuery,
          fallbackQuery
        );

        return rows.map((row) => ({
          value: String(row.value || ''),
          label: String(row.label || ''),
        }));
      } catch (error) {
        console.error('❌ [Produto] Erro ao buscar produtos:', error);
        throw new Error('Erro ao buscar produtos da empresa');
      }
    },
    enabled: !!company,
    staleTime: 1000 * 60 * 60, // 1 hora
  });
}

/**
 * Hook genérico para buscar opções de uma view dinâmica
 * Usado para filtros de página que especificam um options_view
 *
 * @param viewName - Nome da view a consultar (ex: 'vw_clientes_ativos')
 * @param valueField - Campo a usar como value (ex: 'id', 'cod_cliente')
 * @param labelField - Campo a usar como label (ex: 'nome', 'nome_cliente')
 * @param databaseId - ID específico do banco de dados (opcional, usa o padrão se não informado)
 * @returns Query com as opções formatadas
 */
export function useDynamicFilterOptions(
  viewName?: string,
  valueField: string = 'id',
  labelField: string = 'name',
  databaseId?: string
) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [
      'filter-options',
      'dynamic',
      viewName,
      valueField,
      labelField,
      databaseId,
      company?.id,
    ],
    queryFn: async (): Promise<FilterOption[]> => {
      if (!company) {
        throw new Error('Nenhuma empresa selecionada');
      }

      if (!viewName) {
        return [];
      }

      // Whitelist de views permitidas (segurança)
      const ALLOWED_VIEWS = [
        'vw_clientes',
        'vw_clientes_ativos',
        'vw_fornecedores',
        'vw_produtos',
        'vw_categorias',
        'vw_departamentos',
        'vw_filiais',
        'vw_usuarios',
        'vw_status',
        'vw_tags',
        'vw_custom_filter_options',
        // Adicionar mais views conforme necessário
      ];

      if (!ALLOWED_VIEWS.includes(viewName)) {
        console.error(`❌ [DynamicFilter] View não permitida: ${viewName}`);
        throw new Error(`View "${viewName}" não está na lista de views permitidas`);
      }

      const query = `
        SELECT DISTINCT 
          ${valueField} as value,
          ${labelField} as label
        FROM ${viewName}
        WHERE ${valueField} IS NOT NULL 
          AND ${labelField} IS NOT NULL
        ORDER BY ${labelField}
      `;

      try {
        const rows = await executeCompanyQuery<Array<{ value: string; label: string }>>(
          company.id,
          query
        );

        return rows.map((row) => ({
          value: String(row.value || ''),
          label: String(row.label || ''),
        }));
      } catch (error) {
        console.error(`❌ [DynamicFilter] Erro ao buscar opções de ${viewName}:`, error);
        throw new Error(`Erro ao buscar opções da view "${viewName}"`);
      }
    },
    enabled: !!company && !!viewName,
    staleTime: 1000 * 60 * 60, // 1 hora
  });
}
