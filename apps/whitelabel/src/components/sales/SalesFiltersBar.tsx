import { Select, MultiSelect } from '@synia/ui';
import { periodOptions } from '@/hooks/useSalesFilters';
import { useFilialOptions, useClienteOptions, useProdutoOptions } from '@/hooks/useFilterOptions';
import { Calendar, X } from 'lucide-react';
import { clsx } from 'clsx';

interface SalesFiltersBarProps {
  period: string;
  onPeriodChange: (value: string) => void;
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
  produto: string[];
  produtoTemp: string[];
  onProdutoChange: (value: string[]) => void;
  onApplyProdutoFilter: () => void;
  onCancelProdutoFilter: () => void;
  hasProdutoPendingChanges: boolean;
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
  produto,
  produtoTemp,
  onProdutoChange,
  onApplyProdutoFilter,
  onCancelProdutoFilter,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hasProdutoPendingChanges,
  onClearFilters,
  className,
  showPeriodFilter = true,
}: SalesFiltersBarProps) {
  // Buscar opções dos filtros
  const { data: filialOptions = [], isLoading: isLoadingFiliais } = useFilialOptions();
  const {
    data: clienteOptions = [],
    isLoading: isLoadingClientes,
    isFetchingNextPage: isLoadingMoreClientes,
    hasNextPage: hasMoreClientes,
    fetchNextPage: loadMoreClientes,
    onSearch: onSearchClientes,
  } = useClienteOptions();
  const { data: produtoOptions = [], isLoading: isLoadingProdutos } = useProdutoOptions();

  const hasActiveFilters = filial.length > 0 || clientesTemp.length > 0 || produto.length > 0;

  return (
    <div
      className={clsx(
        'flex items-center gap-3 rounded-xl border border-gray-100 bg-white/80 p-3',
        'dark:border-gray-700/50 dark:bg-gray-800/50',
        'relative z-30 shadow-sm backdrop-blur-sm',
        className
      )}
    >
      {/* Grid com filtros */}
      <div
        className={clsx(
          'grid flex-1 grid-cols-1 gap-3',
          showPeriodFilter ? 'md:grid-cols-4' : 'md:grid-cols-3'
        )}
      >
        {/* Período */}
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

        {/* Filial */}
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

        {/* Cliente */}
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

        {/* Produto */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Produto</label>
          <div className="relative">
            <MultiSelect
              options={produtoOptions}
              value={produtoTemp}
              onChange={onProdutoChange}
              onApply={onApplyProdutoFilter}
              onCancel={onCancelProdutoFilter}
              placeholder={isLoadingProdutos ? 'Carregando...' : 'Todos os produtos'}
              disabled={isLoadingProdutos}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Ações */}
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
