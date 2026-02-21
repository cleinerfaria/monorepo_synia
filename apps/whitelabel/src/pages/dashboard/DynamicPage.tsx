import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, Loading, EmptyState, Button } from '@synia/ui';
import { LayoutDashboard, RefreshCw } from 'lucide-react';
import usePageFilters from '@/hooks/usePageFilters';
import DynamicFilters from '../../components/DynamicFilters';
import type { Page } from '@/types/database';

export default function DynamicPage() {
  const { pageId } = useParams<{ pageId: string }>();

  const [filterValues, setFilterValues] = useState<Record<string, any>>({});

  // Query para buscar a página específica
  const {
    data: page,
    isLoading: isLoadingPage,
    error: _error,
    refetch,
  } = useQuery({
    queryKey: ['page', pageId],
    queryFn: async () => {
      if (!pageId) throw new Error('Page ID is required');

      const { data, error } = await supabase.from('page').select('*').eq('id', pageId).single();

      if (error) throw error;
      return data as Page;
    },
    enabled: !!pageId,
  });

  const { pageFilters, isLoading: isLoadingFilters } = usePageFilters(pageId);

  const handleFilterChange = (filterName: string, value: any) => {
    setFilterValues((prev) => ({
      ...prev,
      [filterName]: value,
    }));
  };

  const handleRefresh = () => {
    refetch();
  };

  if (isLoadingPage) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<LayoutDashboard className="h-16 w-16" />}
          title="Página não encontrada"
          description="A página solicitada não existe ou foi removida"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {page.name}
          </h1>
          {page.meta_data?.description && (
            <p className="text-gray-600 dark:text-gray-400">{page.meta_data.description}</p>
          )}
        </div>
        <Button variant="neutral" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Dynamic Filters */}
      {pageFilters.length > 0 && (
        <DynamicFilters
          pageId={pageId}
          filters={pageFilters}
          values={filterValues}
          onChange={handleFilterChange}
          isLoading={isLoadingFilters}
        />
      )}

      {/* Content Area */}
      <Card>
        <CardContent className="p-6">
          <div className="py-12 text-center">
            <LayoutDashboard className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
              Conteúdo da página em desenvolvimento
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Esta é uma página configurável. O conteúdo será implementado de acordo com suas
              necessidades.
            </p>
            {Object.keys(filterValues).length > 0 && (
              <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <h4 className="mb-2 font-medium text-gray-900 dark:text-white">
                  Valores dos filtros ativos:
                </h4>
                <pre className="text-sm text-gray-600 dark:text-gray-300">
                  {JSON.stringify(filterValues, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
