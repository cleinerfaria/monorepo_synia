import { Select, MultiSelect } from '@synia/ui';
import { Calendar, X } from 'lucide-react';
import { clsx } from 'clsx';
import { getPeriodOptions } from '@/hooks/useSalesFilters';
import {
  useFilialOptions,
  useClienteOptions,
  useGrupoOptions,
  useRegionalOptions,
  useVendedorOptions,
} from '@/hooks/useFilterOptions';

interface SalesFiltersBarProps {
  period: string;
  onPeriodChange: (value: string | { target: { value: string } }) => void;
  filial: string[];
  filialTemp: string[];
  onFilialChange: (value: string[]) => void;
  onApplyFilialFilter: () => void;
  onCancelFilialFilter: () => void;
  hasFilialPendingChanges: boolean;
  clientesTemp: string[];
  onClientesTempChange: (value: string[]) => void;
  onApplyClientesFilter: () => void;
  onCancelClientesFilter: () => void;
  hasClientesPendingChanges: boolean;
  grupo: string[];
  grupoTemp: string[];
  onGrupoChange: (value: string[]) => void;
  onApplyGrupoFilter: () => void;
  onCancelGrupoFilter: () => void;
  hasGrupoPendingChanges: boolean;
  regional: string[];
  regionalTemp: string[];
  onRegionalChange: (value: string[]) => void;
  onApplyRegionalFilter: () => void;
  onCancelRegionalFilter: () => void;
  hasRegionalPendingChanges: boolean;
  vendedor?: string[];
  vendedorTemp?: string[];
  onVendedorChange?: (value: string[]) => void;
  onApplyVendedorFilter?: () => void;
  onCancelVendedorFilter?: () => void;
  hasVendedorPendingChanges?: boolean;
  onClearFilters: () => void;
  className?: string;
  showPeriodFilter?: boolean;
}

export default function SalesFiltersBar({
  period,
  onPeriodChange,
  filial,
  filialTemp,
  onFilialChange,
  onApplyFilialFilter,
  onCancelFilialFilter,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hasFilialPendingChanges,
  clientesTemp,
  onClientesTempChange,
  onApplyClientesFilter,
  onCancelClientesFilter,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hasClientesPendingChanges,
  grupo,
  grupoTemp,
  onGrupoChange,
  onApplyGrupoFilter,
  onCancelGrupoFilter,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hasGrupoPendingChanges,
  regional,
  regionalTemp,
  onRegionalChange,
  onApplyRegionalFilter,
  onCancelRegionalFilter,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hasRegionalPendingChanges,
  vendedor = [],
  vendedorTemp = [],
  onVendedorChange,
  onApplyVendedorFilter,
  onCancelVendedorFilter,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hasVendedorPendingChanges,
  onClearFilters,
  className,
  showPeriodFilter = true,
}: SalesFiltersBarProps) {
  const showVendedorFilter =
    !!onVendedorChange && !!onApplyVendedorFilter && !!onCancelVendedorFilter;

  const periodOptions = getPeriodOptions(period);
  const { data: filialOptions = [], isLoading: isLoadingFiliais } = useFilialOptions();
  const {
    data: clienteOptions = [],
    isLoading: isLoadingClientes,
    isFetchingNextPage: isLoadingMoreClientes,
    hasNextPage: hasMoreClientes,
    fetchNextPage: loadMoreClientes,
    onSearch: onSearchClientes,
  } = useClienteOptions();
  const { data: grupoOptions = [], isLoading: isLoadingGrupos } = useGrupoOptions();
  const { data: regionalOptions = [], isLoading: isLoadingRegionais } = useRegionalOptions();
  const { data: vendedorOptions = [], isLoading: isLoadingVendedores } =
    useVendedorOptions(showVendedorFilter);

  const hasActiveFilters =
    filial.length > 0 ||
    clientesTemp.length > 0 ||
    grupo.length > 0 ||
    regional.length > 0 ||
    vendedor.length > 0;

  return (
    <div
      className={clsx(
        'relative flex items-center gap-3 rounded-xl border border-gray-100 bg-white/80 p-3',
        'shadow-sm backdrop-blur-sm',
        'dark:border-gray-700/50 dark:bg-gray-800/50',
        className
      )}
    >
      <div
        className={clsx(
          'grid flex-1 grid-cols-1 gap-3',
          showPeriodFilter
            ? showVendedorFilter
              ? 'md:grid-cols-6'
              : 'md:grid-cols-5'
            : showVendedorFilter
              ? 'md:grid-cols-5'
              : 'md:grid-cols-4'
        )}
      >
        {showPeriodFilter && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Período</label>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <Select
                options={periodOptions}
                value={period}
                onChange={onPeriodChange}
                placeholder="Selecione o período"
                className="flex-1"
              />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Filial</label>
          <div className="relative">
            <MultiSelect
              options={filialOptions}
              value={filialTemp}
              onChange={onFilialChange}
              onApply={onApplyFilialFilter}
              onCancel={onCancelFilialFilter}
              placeholder={isLoadingFiliais ? 'Carregando...' : 'Todas as filiais'}
              disabled={isLoadingFiliais}
              className="w-full"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Regional</label>
          <div className="relative">
            <MultiSelect
              options={regionalOptions}
              value={regionalTemp}
              onChange={onRegionalChange}
              onApply={onApplyRegionalFilter}
              onCancel={onCancelRegionalFilter}
              placeholder={isLoadingRegionais ? 'Carregando...' : 'Todas as regionais'}
              disabled={isLoadingRegionais}
              className="w-full"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Grupo</label>
          <div className="relative">
            <MultiSelect
              options={grupoOptions}
              value={grupoTemp}
              onChange={onGrupoChange}
              onApply={onApplyGrupoFilter}
              onCancel={onCancelGrupoFilter}
              placeholder={isLoadingGrupos ? 'Carregando...' : 'Todos os grupos'}
              disabled={isLoadingGrupos}
              className="w-full"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Cliente</label>
          <div className="relative">
            <MultiSelect
              options={clienteOptions}
              value={clientesTemp}
              onChange={onClientesTempChange}
              onApply={onApplyClientesFilter}
              onCancel={onCancelClientesFilter}
              placeholder={isLoadingClientes ? 'Carregando...' : 'Todos os clientes'}
              disabled={isLoadingClientes}
              className="w-full"
              onSearch={onSearchClientes}
              onLoadMore={loadMoreClientes}
              hasMore={hasMoreClientes}
              isLoadingMore={isLoadingMoreClientes}
              searchPlaceholder="Buscar cliente..."
              emptyMessage={isLoadingClientes ? 'Buscando...' : 'Nenhum cliente encontrado'}
            />
          </div>
        </div>

        {showVendedorFilter && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Vendedor</label>
            <div className="relative">
              <MultiSelect
                options={vendedorOptions}
                value={vendedorTemp}
                onChange={onVendedorChange!}
                onApply={onApplyVendedorFilter!}
                onCancel={onCancelVendedorFilter!}
                placeholder={isLoadingVendedores ? 'Carregando...' : 'Todos os vendedores'}
                disabled={isLoadingVendedores}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
