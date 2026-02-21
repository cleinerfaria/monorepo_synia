import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, resolvedSupabaseUrl, resolvedSupabaseAnonKey } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { PageChart, PageChartInsert, PageChartUpdate } from '@/types/database';

export const usePageCharts = (pageId?: string) => {
  const { appUser } = useAuthStore();
  const queryClient = useQueryClient();

  // Query para buscar todos os gráficos de uma página
  const {
    data: pageCharts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['pageCharts', pageId],
    queryFn: async () => {
      if (!pageId) return [];

      const { data, error } = await supabase
        .from('page_chart')
        .select('*')
        .eq('page_id', pageId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as unknown as PageChart[];
    },
    enabled: !!pageId,
  });

  // Query para buscar todos os gráficos da empresa (todas as páginas)
  const useAllCompanyPageCharts = () => {
    return useQuery({
      queryKey: ['pageCharts', 'all', appUser?.company_id],
      queryFn: async () => {
        if (!appUser?.company_id) throw new Error('Company ID not found');

        const { data, error } = await supabase
          .from('page_chart')
          .select('*, page:page_id(*)')
          .eq('company_id', appUser.company_id)
          .order('name');

        if (error) throw error;
        return data as unknown as (PageChart & { page: any })[];
      },
      enabled: !!appUser?.company_id,
    });
  };

  // Mutation para criar um novo gráfico
  const createPageChartMutation = useMutation({
    mutationFn: async (chartData: Omit<PageChartInsert, 'company_id'>) => {
      if (!appUser?.company_id) throw new Error('Company ID not found');

      const { data, error } = await supabase
        .from('page_chart')
        .insert({
          ...chartData,
          company_id: appUser.company_id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as PageChart;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pageCharts', data.page_id] });
      queryClient.invalidateQueries({ queryKey: ['pageCharts', 'all'] });
    },
  });

  // Mutation para atualizar um gráfico
  const updatePageChartMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: PageChartUpdate }) => {
      const { data, error } = await supabase
        .from('page_chart')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as PageChart;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pageCharts', data.page_id] });
      queryClient.invalidateQueries({ queryKey: ['pageCharts', 'all'] });
    },
  });

  // Mutation para deletar um gráfico
  const deletePageChartMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('page_chart').delete().eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (_, id) => {
      const chartToDelete = pageCharts.find((c) => c.id === id);
      if (chartToDelete) {
        queryClient.invalidateQueries({ queryKey: ['pageCharts', chartToDelete.page_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['pageCharts', 'all'] });
    },
  });

  // Query para buscar um gráfico específico
  const usePageChart = (id?: string) => {
    return useQuery({
      queryKey: ['pageChart', id],
      queryFn: async () => {
        if (!id) throw new Error('Page Chart ID is required');

        const { data, error } = await supabase.from('page_chart').select('*').eq('id', id).single();

        if (error) throw error;
        return data as unknown as PageChart;
      },
      enabled: !!id,
    });
  };

  // Função para buscar dados do gráfico da view
  const getChartData = useCallback(
    async (
      viewName: string,
      xAxis: string,
      yAxisFields: string[],
      pageId?: string,
      filters?: Record<string, any>
    ): Promise<any[]> => {
      if (!viewName || !appUser?.company_id) return [];

      try {
        console.log(`📊 [PageCharts] Buscando dados do gráfico`);
        console.log(`🔍 View: ${viewName}`);
        console.log(`📈 X-Axis: ${xAxis}`);
        console.log(`📉 Y-Axis Fields: ${yAxisFields.join(', ')}`);

        // Buscar company_database_id da página
        let companyDatabaseId: string | undefined;
        if (pageId) {
          const { data: page } = await supabase
            .from('page')
            .select('company_database_id')
            .eq('id', pageId)
            .single();

          if (page?.company_database_id) {
            companyDatabaseId = page.company_database_id;
          }
        }

        // Buscar sessão
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

        if (!databases || databases.length === 0) {
          console.warn('⚠️ [PageCharts] Nenhum banco ativo encontrado');
          return [];
        }

        const activeDb = companyDatabaseId
          ? databases.find((db) => db.id === companyDatabaseId) || databases[0]
          : databases.find((db) => db.is_default) || databases[0];

        console.log(`🎯 [PageCharts] Usando banco:`, activeDb.name);

        // Construir a query
        const allFields = [xAxis, ...yAxisFields].join(', ');
        let query = `
          SELECT ${allFields}
          FROM ${viewName}
          WHERE ${xAxis} IS NOT NULL
        `;

        // Aplicar filtros se fornecidos
        if (filters && Object.keys(filters).length > 0) {
          const filterConditions = Object.entries(filters)
            .filter(([_, value]) => value !== undefined && value !== null && value !== '')
            .map(([key, value]) => {
              if (Array.isArray(value)) {
                const values = value.map((v) => `'${v}'`).join(', ');
                return `${key} IN (${values})`;
              }
              return `${key} = '${value}'`;
            });

          if (filterConditions.length > 0) {
            query += ` AND ${filterConditions.join(' AND ')}`;
          }
        }

        query += ` ORDER BY ${xAxis}`;

        console.log(`📝 [PageCharts] Query SQL:`, query);

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
          console.error(`❌ [PageCharts] Erro na query:`, result.error);
          throw new Error(result.error || 'Erro ao executar query');
        }

        const rows = result.data?.rows || [];
        console.log(`✅ [PageCharts] Dados carregados: ${rows.length} registros`);

        return rows;
      } catch (error) {
        console.error(`❌ [PageCharts] Erro ao buscar dados:`, error);
        return [];
      }
    },
    [appUser?.company_id]
  );

  return {
    pageCharts,
    isLoading,
    error,
    createPageChart: createPageChartMutation.mutateAsync,
    updatePageChart: updatePageChartMutation.mutateAsync,
    deletePageChart: deletePageChartMutation.mutateAsync,
    isCreating: createPageChartMutation.isPending,
    isUpdating: updatePageChartMutation.isPending,
    isDeleting: deletePageChartMutation.isPending,
    usePageChart,
    useAllCompanyPageCharts,
    getChartData,
  };
};

export default usePageCharts;
