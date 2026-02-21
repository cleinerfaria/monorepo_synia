import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, resolvedSupabaseUrl, resolvedSupabaseAnonKey } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { PageFilter, PageFilterInsert, PageFilterUpdate } from '@/types/database';

export const usePageFilters = (pageId?: string) => {
  const { appUser } = useAuthStore();
  const queryClient = useQueryClient();

  // Query para buscar todos os filtros de uma página
  const {
    data: pageFilters = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['pageFilters', pageId],
    queryFn: async () => {
      if (!pageId) return [];

      const { data, error } = await supabase
        .from('page_filter')
        .select('*')
        .eq('page_id', pageId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as unknown as PageFilter[];
    },
    enabled: !!pageId,
  });

  // Query para buscar todos os filtros da empresa (todas as páginas)
  const useAllCompanyPageFilters = () => {
    return useQuery({
      queryKey: ['pageFilters', 'all', appUser?.company_id],
      queryFn: async () => {
        if (!appUser?.company_id) throw new Error('Company ID not found');

        const { data, error } = await supabase
          .from('page_filter')
          .select('*, page:page_id(*)')
          .eq('company_id', appUser.company_id)
          .order('name');

        if (error) throw error;
        return data as unknown as (PageFilter & { page: any })[];
      },
      enabled: !!appUser?.company_id,
    });
  };

  // Mutation para criar um novo filtro
  const createPageFilterMutation = useMutation({
    mutationFn: async (filterData: Omit<PageFilterInsert, 'company_id'>) => {
      if (!appUser?.company_id) throw new Error('Company ID not found');

      const { data, error } = await supabase
        .from('page_filter')
        .insert({
          ...filterData,
          company_id: appUser.company_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as PageFilter;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pageFilters', data.page_id] });
      queryClient.invalidateQueries({ queryKey: ['pageFilters', 'all'] });
    },
  });

  // Mutation para atualizar um filtro
  const updatePageFilterMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: PageFilterUpdate }) => {
      const { data, error } = await supabase
        .from('page_filter')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as PageFilter;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pageFilters', data.page_id] });
      queryClient.invalidateQueries({ queryKey: ['pageFilters', 'all'] });
    },
  });

  // Mutation para deletar um filtro
  const deletePageFilterMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('page_filter').delete().eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (_, id) => {
      // Encontra qual página o filtro deletado pertencia para invalidar a query correta
      const filterToDelete = pageFilters.find((f) => f.id === id);
      if (filterToDelete) {
        queryClient.invalidateQueries({ queryKey: ['pageFilters', filterToDelete.page_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['pageFilters', 'all'] });
    },
  });

  // Query para buscar um filtro específico
  const usePageFilter = (id?: string) => {
    return useQuery({
      queryKey: ['pageFilter', id],
      queryFn: async () => {
        if (!id) throw new Error('Page Filter ID is required');

        const { data, error } = await supabase
          .from('page_filter')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        return data as unknown as PageFilter;
      },
      enabled: !!id,
    });
  };

  // Query para buscar uma página com seus filtros e banco de dados associado
  const usePage = (id?: string) => {
    return useQuery({
      queryKey: ['page', id],
      queryFn: async () => {
        if (!id) throw new Error('Page ID is required');

        const { data, error } = await supabase
          .from('page')
          .select('*, company_database:company_database_id(*)')
          .eq('id', id)
          .single();

        if (error) throw error;
        return data as any;
      },
      enabled: !!id,
    });
  };

  // Função para buscar opções de uma view específica
  // Consulta a view dinâmica no banco de dados associado à página
  // Suporta paginação e busca
  const getViewOptions = useCallback(
    async (
      viewName: string,
      valueField: string = 'id',
      labelField: string = 'name',
      pageId?: string,
      options?: {
        searchTerm?: string;
        page?: number;
        pageSize?: number;
      }
    ): Promise<{
      data: Array<{ value: string; label: string }>;
      hasMore: boolean;
      total?: number;
    }> => {
      if (!viewName || !appUser?.company_id) return { data: [], hasMore: false };

      const { searchTerm = '', page = 1, pageSize = 20 } = options || {};

      try {
        console.log(`🔍 [PageFilters] Buscando opções da view: ${viewName}`, {
          searchTerm,
          page,
          pageSize,
        });

        // Se pageId for fornecido, buscar dados associados da página
        let companyDatabaseId: string | undefined;
        if (pageId) {
          const { data: pageData } = await supabase
            .from('page')
            .select('company_database_id')
            .eq('id', pageId)
            .single();

          if (pageData?.company_database_id) {
            companyDatabaseId = pageData.company_database_id;
          }
        }

        // Whitelist de views permitidas (segurança)
        // Views que começam com 'vw_' são permitidas em desenvolvimento
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
        ];

        // Permitir views que começam com 'vw_' ou estão na whitelist
        const isAllowed = ALLOWED_VIEWS.includes(viewName) || viewName.startsWith('vw_');
        if (!isAllowed) {
          console.error(`❌ [PageFilters] View não permitida: ${viewName}`);
          throw new Error(`View "${viewName}" não está na lista de views permitidas`);
        }

        console.log(`✅ [PageFilters] View permitida: ${viewName}`);

        // Buscar opções via função cloud
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error('Usuário não autenticado');
        }

        // Buscar o banco de dados a usar
        const { data: databases } = await supabase
          .from('company_databases')
          .select('id, name, is_active, is_default')
          .eq('company_id', appUser.company_id)
          .eq('is_active', true);

        console.log(`📊 [PageFilters] Bancos encontrados:`, databases);

        if (!databases || databases.length === 0) {
          console.warn('⚠️ [PageFilters] Nenhum banco ativo encontrado');
          return { data: [], hasMore: false };
        }

        const activeDb = companyDatabaseId
          ? databases.find((db) => db.id === companyDatabaseId) || databases[0]
          : databases.find((db) => db.is_default) || databases[0];

        console.log(`🎯 [PageFilters] Usando banco:`, activeDb);
        console.log(`🔑 [PageFilters] companyDatabaseId da página:`, companyDatabaseId);

        // Calcular offset para paginação
        const offset = (page - 1) * pageSize;
        const limit = pageSize + 1; // Buscar 1 a mais para saber se tem mais páginas

        // Escapar termo de busca para SQL (prevenir SQL injection)
        const escapedSearchTerm = searchTerm.replace(/'/g, "''");

        // Construir condição de busca
        const searchCondition = searchTerm
          ? `AND LOWER(CAST(${labelField} AS TEXT)) LIKE LOWER('%${escapedSearchTerm}%')`
          : '';

        const query = `
        SELECT DISTINCT 
          ${valueField} as value,
          ${labelField} as label
        FROM ${viewName}
        WHERE ${valueField} IS NOT NULL 
          AND ${labelField} IS NOT NULL
          ${searchCondition}
        ORDER BY ${labelField}
        LIMIT ${limit}
        OFFSET ${offset}
      `;

        console.log(`📝 [PageFilters] Query SQL:`, query);

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

        console.log(`📈 [PageFilters] Resultado da API:`, result);

        if (!result.success) {
          console.error(`❌ [PageFilters] Erro na query:`, result.error);
          throw new Error(result.error || 'Erro ao executar query');
        }

        const rows = result.data?.rows || [];

        // Verificar se tem mais páginas (buscamos limit + 1)
        const hasMore = rows.length > pageSize;
        const dataRows = hasMore ? rows.slice(0, pageSize) : rows;

        console.log(
          `✅ [PageFilters] Opções encontradas (${viewName}): ${dataRows.length}, hasMore: ${hasMore}`
        );

        return {
          data: dataRows.map((row: any) => ({
            value: String(row.value || ''),
            label: String(row.label || ''),
          })),
          hasMore,
        };
      } catch (error) {
        console.error(`❌ [PageFilters] Erro ao buscar opções:`, error);
        return { data: [], hasMore: false };
      }
    },
    [appUser?.company_id]
  );

  return {
    pageFilters,
    isLoading,
    error,
    createPageFilter: createPageFilterMutation.mutateAsync,
    updatePageFilter: updatePageFilterMutation.mutateAsync,
    deletePageFilter: deletePageFilterMutation.mutateAsync,
    isCreating: createPageFilterMutation.isPending,
    isUpdating: updatePageFilterMutation.isPending,
    isDeleting: deletePageFilterMutation.isPending,
    usePageFilter,
    usePage,
    useAllCompanyPageFilters,
    getViewOptions,
  };
};

export default usePageFilters;
