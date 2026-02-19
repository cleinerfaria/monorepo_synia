import { useState, useEffect, useCallback } from 'react';
import { Input, Button, Loading, Select, MultiSelect, SearchableSelect } from '@synia/ui';
import usePageFilters from '@/hooks/usePageFilters';
import type { PageFilter } from '@/types/database';

interface DynamicFiltersProps {
  filters: PageFilter[];
  values: Record<string, any>;
  onChange: (filterName: string, value: any) => void;
  pageId?: string;
  companyDatabaseId?: string;
  isLoading?: boolean;
}

// Estado para paginação e busca de cada filtro
interface FilterOptionsState {
  data: Array<{ value: string; label: string }>;
  isLoading: boolean;
  hasMore: boolean;
  page: number;
  searchTerm: string;
}

export default function DynamicFilters({
  filters,
  values,
  onChange,
  pageId,
  companyDatabaseId,
  isLoading,
}: DynamicFiltersProps) {
  const { getViewOptions, usePage } = usePageFilters();
  const [optionsState, setOptionsState] = useState<Record<string, FilterOptionsState>>({});

  // Buscar dados da página se pageId foi fornecido
  const { data: pageData, isLoading: isLoadingPage } = usePage(pageId);
  const dbId = companyDatabaseId || pageData?.company_database_id;

  // Debug logs
  console.log('🔄 [DynamicFilters] Render:', {
    pageId,
    companyDatabaseId,
    dbId,
    pageData,
    isLoadingPage,
    filtersCount: filters.length,
    filtersWithView: filters
      .filter((f) => f.options_view)
      .map((f) => ({ name: f.name, view: f.options_view })),
  });

  // Função para carregar opções de um filtro com paginação
  const loadFilterOptions = useCallback(
    async (
      filter: PageFilter,
      page: number = 1,
      searchTerm: string = '',
      append: boolean = false
    ) => {
      if (!filter.options_view) return;

      // Marcar como loading
      setOptionsState((prev) => ({
        ...prev,
        [filter.name]: {
          ...(prev[filter.name] || { data: [], hasMore: false, page: 1, searchTerm: '' }),
          isLoading: true,
        },
      }));

      try {
        const result = await getViewOptions(
          filter.options_view,
          filter.meta_data?.valueField || 'id',
          filter.meta_data?.labelField || 'name',
          pageId,
          {
            searchTerm,
            page,
            pageSize: filter.page_size || 20,
          }
        );

        setOptionsState((prev) => {
          const existingData = append ? prev[filter.name]?.data || [] : [];
          return {
            ...prev,
            [filter.name]: {
              data: [...existingData, ...result.data],
              isLoading: false,
              hasMore: result.hasMore,
              page,
              searchTerm,
            },
          };
        });
      } catch (error) {
        console.error(`❌ Erro ao carregar opções para ${filter.name}:`, error);
        setOptionsState((prev) => ({
          ...prev,
          [filter.name]: {
            data: prev[filter.name]?.data || [],
            isLoading: false,
            hasMore: false,
            page,
            searchTerm,
          },
        }));
      }
    },
    [getViewOptions, pageId]
  );

  // Load initial options for select/multiselect filters
  useEffect(() => {
    const loadInitialOptions = async () => {
      const selectFilters = filters.filter(
        (f) => (f.type === 'select' || f.type === 'multiselect') && f.options_view
      );

      console.log('🔍 [DynamicFilters] Filtros select/multiselect com view:', selectFilters.length);

      for (const filter of selectFilters) {
        // Só carregar se ainda não foi carregado
        if (!optionsState[filter.name]) {
          await loadFilterOptions(filter, 1, '', false);
        }
      }
    };

    // Carregar se tiver filtros (dbId é opcional, getViewOptions já busca o banco padrão)
    if (filters.length > 0 && !isLoadingPage) {
      console.log('🚀 [DynamicFilters] Iniciando carregamento de opções...');
      loadInitialOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.length, pageId, isLoadingPage]);

  // Handler para busca em um filtro
  const handleSearch = useCallback(
    (filter: PageFilter, searchTerm: string) => {
      loadFilterOptions(filter, 1, searchTerm, false);
    },
    [loadFilterOptions]
  );

  // Handler para carregar mais itens
  const handleLoadMore = useCallback(
    (filter: PageFilter) => {
      const state = optionsState[filter.name];
      if (state && state.hasMore && !state.isLoading) {
        loadFilterOptions(filter, state.page + 1, state.searchTerm, true);
      }
    },
    [loadFilterOptions, optionsState]
  );

  if (isLoading) {
    return <Loading />;
  }

  // Sort filters by order_index
  const sortedFilters = [...filters]
    .filter((f) => f.active !== false)
    .sort((a, b) => a.order_index - b.order_index);

  const handleInputChange = (filter: PageFilter, value: string) => {
    let processedValue: any = value;

    // Process value based on filter type
    if (filter.type === 'number') {
      processedValue = value ? parseFloat(value) : null;
    } else if (filter.type === 'checkbox') {
      processedValue = value === 'true';
    }

    onChange(filter.name, processedValue);
  };

  const renderFilter = (filter: PageFilter) => {
    const label = filter.label || filter.name;
    const value = values[filter.name] || '';
    const state = optionsState[filter.name];

    switch (filter.type) {
      case 'input':
      case 'textarea':
        return (
          <div key={filter.id} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </label>
            {filter.type === 'input' ? (
              <Input
                type={
                  filter.subtype === 'email'
                    ? 'email'
                    : filter.subtype === 'phone'
                      ? 'tel'
                      : filter.subtype === 'url'
                        ? 'url'
                        : filter.subtype === 'password'
                          ? 'password'
                          : 'text'
                }
                value={value}
                onChange={(e) => handleInputChange(filter, e.target.value)}
                placeholder={filter.placeholder}
              />
            ) : (
              <textarea
                value={value}
                onChange={(e) => handleInputChange(filter, e.target.value)}
                placeholder={filter.placeholder}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            )}
          </div>
        );

      case 'number':
        return (
          <div key={filter.id} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </label>
            <Input
              type="number"
              value={value}
              onChange={(e) => handleInputChange(filter, e.target.value)}
              placeholder={filter.placeholder}
            />
          </div>
        );

      case 'date':
        return (
          <div key={filter.id} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </label>
            <Input
              type="date"
              value={value}
              onChange={(e) => handleInputChange(filter, e.target.value)}
            />
          </div>
        );

      case 'daterange':
        return (
          <div key={filter.id} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={value?.start || ''}
                onChange={(e) => onChange(filter.name, { ...value, start: e.target.value })}
                placeholder="Data inicial"
              />
              <Input
                type="date"
                value={value?.end || ''}
                onChange={(e) => onChange(filter.name, { ...value, end: e.target.value })}
                placeholder="Data final"
              />
            </div>
          </div>
        );

      case 'select':
        return (
          <div key={filter.id}>
            {state?.isLoading && !state.data.length ? (
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {label}
                </label>
                <div className="text-sm text-gray-500">Carregando opções...</div>
              </div>
            ) : filter.has_search ? (
              // Usar SearchableSelect quando has_search = true
              <div className="space-y-1">
                <SearchableSelect
                  label={label}
                  placeholder={filter.placeholder || 'Selecione...'}
                  searchPlaceholder="Digite para buscar..."
                  options={(state?.data || []).map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  value={value}
                  onChange={(v: string) => handleInputChange(filter, v)}
                  onSearch={(term) => handleSearch(filter, term)}
                  emptyMessage={state?.isLoading ? 'Buscando...' : 'Nenhum item encontrado'}
                />
                {state?.hasMore && (
                  <button
                    type="button"
                    onClick={() => handleLoadMore(filter)}
                    disabled={state?.isLoading}
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400 text-xs"
                  >
                    {state?.isLoading ? 'Carregando...' : 'Carregar mais...'}
                  </button>
                )}
              </div>
            ) : (
              <Select
                label={label}
                placeholder={filter.placeholder || 'Selecione...'}
                options={(state?.data || []).map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                value={value}
                onChange={(v: string) => handleInputChange(filter, v)}
              />
            )}
          </div>
        );

      case 'multiselect':
        return (
          <div key={filter.id}>
            {state?.isLoading && !state.data.length ? (
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {label}
                </label>
                <div className="text-sm text-gray-500">Carregando opções...</div>
              </div>
            ) : (
              <div className="space-y-1">
                <MultiSelect
                  label={label}
                  placeholder={filter.placeholder || 'Selecione...'}
                  searchPlaceholder={filter.has_search ? 'Digite para buscar...' : undefined}
                  options={(state?.data || []).map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  value={Array.isArray(value) ? value : []}
                  onChange={(values: string[]) => onChange(filter.name, values)}
                  onSearch={filter.has_search ? (term) => handleSearch(filter, term) : undefined}
                  emptyMessage={state?.isLoading ? 'Buscando...' : 'Nenhum item encontrado'}
                />
                {filter.has_search && state?.hasMore && (
                  <button
                    type="button"
                    onClick={() => handleLoadMore(filter)}
                    disabled={state?.isLoading}
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400 text-xs"
                  >
                    {state?.isLoading ? 'Carregando...' : 'Carregar mais...'}
                  </button>
                )}
              </div>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={filter.id} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={value === true}
              onChange={(e) => handleInputChange(filter, e.target.checked.toString())}
              className="text-primary-600 focus:ring-primary-500 rounded border-gray-300"
            />
            <label className="text-sm text-gray-700 dark:text-gray-300">{label}</label>
          </div>
        );

      case 'radio': {
        // For radio, we need predefined options in meta_data
        const radioOptions = filter.meta_data?.options || [];
        return (
          <div key={filter.id} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </label>
            <div className="space-y-2">
              {radioOptions.map((option: any, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={filter.name}
                    value={option.value}
                    checked={value === option.value}
                    onChange={(e) => handleInputChange(filter, e.target.value)}
                    className="text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <label className="text-sm text-gray-700 dark:text-gray-300">{option.label}</label>
                </div>
              ))}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedFilters.map(renderFilter)}
      </div>

      {sortedFilters.length > 0 && (
        <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
          <div className="flex gap-2">
            <Button
              onClick={() => {
                // Apply filters logic here
                console.log('Applying filters:', values);
              }}
            >
              Aplicar Filtros
            </Button>
            <Button
              variant="neutral"
              onClick={() => {
                // Clear filters
                sortedFilters.forEach((filter) => {
                  onChange(filter.name, filter.type === 'multiselect' ? [] : '');
                });
              }}
            >
              Limpar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
