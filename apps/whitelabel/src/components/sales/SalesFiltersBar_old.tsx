import { Select, SearchableSelect, MultiSelect } from '@synia/ui';
import { periodOptions } from '@/hooks/useSalesFilters';
import { useClients } from '@/hooks/useSalesData';
import { Calendar, Filter, X, Check, Clock } from 'lucide-react';
import { clsx } from 'clsx';

// Helper para extrair valor do evento ou string direta

function extractValue(eventOrValue: any): string {
  // Null ou undefined
  if (eventOrValue == null) return '';

  // String direta
  if (typeof eventOrValue === 'string') {
    return eventOrValue === '[object Object]' ? '' : eventOrValue;
  }

  // Evento sintético do Select (target.value)
  if (eventOrValue.target?.value !== undefined) {
    const val = eventOrValue.target.value;
    if (typeof val === 'string') return val;
    if (val && typeof val === 'object' && 'value' in val) {
      return String(val.value);
    }
    return String(val);
  }

  // Objeto com propriedade value (SelectOption)
  if ('value' in eventOrValue && eventOrValue.value !== undefined) {
    return String(eventOrValue.value);
  }

  return '';
}

interface SalesFiltersBarProps {
  period: string;
  onPeriodChange: (value: string) => void;
  filial?: string;
  onFilialChange: (value: string) => void;
  clientesTemp: string[];
  onClientesTempChange: (value: string[]) => void;
  onApplyClientesFilter: () => void;
  onCancelClientesFilter: () => void;
  hasClientesPendingChanges: boolean;
  produto?: string;
  onProdutoChange: (value: string) => void;
  onClearFilters: () => void;
  filialOptions: Array<{ value: string; label: string }>;
  produtoOptions: Array<{ value: string; label: string }>;
  className?: string;
}

/**
 * Barra de filtros globais para o dashboard de vendas
 */
export function SalesFiltersBar({
  period,
  onPeriodChange,
  filial,
  onFilialChange,
  clientesTemp,
  onClientesTempChange,
  onApplyClientesFilter,
  onCancelClientesFilter,
  hasClientesPendingChanges,
  produto,
  onProdutoChange,
  onClearFilters,
  filialOptions,
  produtoOptions,
  className,
}: SalesFiltersBarProps) {
  const { data: clienteOptions = [] } = useClients();
  const hasActiveFilters = filial || clientesTemp.length > 0 || produto;

  // Handlers que extraem o valor do evento

  const handlePeriodChange = (e: any) => onPeriodChange(extractValue(e));

  const handleFilialChange = (e: any) => onFilialChange(extractValue(e));

  const handleProdutoChange = (e: any) => onProdutoChange(extractValue(e));

  return (
    <div
      className={clsx(
        'flex items-center gap-3 rounded-xl border border-gray-100 bg-white/80 p-3',
        'dark:border-gray-700/50 dark:bg-gray-800/50',
        'relative z-50 shadow-sm backdrop-blur-sm',
        className
      )}
    >
      {/* Período */}
      <div className="flex flex-shrink-0 items-center gap-2">
        <Calendar className="h-4 w-4 text-gray-400" />
        <Select
          options={periodOptions}
          value={period}
          onChange={handlePeriodChange}
          placeholder="Período"
          className="w-56"
        />
      </div>

      <div className="h-5 w-px flex-shrink-0 bg-gray-200 dark:bg-gray-700" />

      {/* Filtros opcionais */}
      <div className="flex flex-shrink-0 items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" />
      </div>

      <SearchableSelect
        options={[{ value: '', label: 'Todas Filiais' }, ...filialOptions]}
        value={filial || ''}
        onChange={handleFilialChange}
        placeholder="Filial"
        searchPlaceholder="Buscar filial..."
        className="min-w-[120px] flex-1"
      />

      <div className="flex items-center gap-2">
        <MultiSelect
          options={clienteOptions}
          value={clientesTemp}
          onChange={onClientesTempChange}
          placeholder="Clientes"
          searchPlaceholder="Buscar cliente..."
          className="min-w-[200px] flex-1"
          showSelectedAsBadges={false}
        />

        {/* Botões de confirmação para clientes */}
        {hasClientesPendingChanges && (
          <div className="flex items-center gap-1">
            <button
              onClick={onApplyClientesFilter}
              className="bg-primary-500 hover:bg-primary-600 flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors"
              title="Aplicar filtro de clientes"
            >
              <Check className="h-3.5 w-3.5" />
              Aplicar
            </button>
            <button
              onClick={onCancelClientesFilter}
              className="flex items-center gap-1 rounded-lg bg-gray-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-600"
              title="Cancelar alterações"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {clientesTemp.length > 0 && !hasClientesPendingChanges && (
          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <Check className="h-3.5 w-3.5" />
            <span>
              {clientesTemp.length} aplicado{clientesTemp.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      <SearchableSelect
        options={[{ value: '', label: 'Todos Produtos' }, ...produtoOptions]}
        value={produto || ''}
        onChange={handleProdutoChange}
        placeholder="Produto"
        searchPlaceholder="Buscar produto..."
        className="min-w-[150px] flex-1"
      />

      {/* Limpar filtros */}
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className={clsx(
            'flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium',
            'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'transition-colors duration-200',
            hasClientesPendingChanges && 'animate-pulse'
          )}
        >
          <X className="h-3.5 w-3.5" />
          Limpar
          {hasClientesPendingChanges && <Clock className="h-3 w-3 text-orange-500" />}
        </button>
      )}
    </div>
  );
}
