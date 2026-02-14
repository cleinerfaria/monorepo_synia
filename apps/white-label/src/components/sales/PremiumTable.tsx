import { clsx } from 'clsx';

interface PremiumTableColumn<T> {
  key: keyof T | string;
  header: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
}

interface PremiumTableProps<T> {
  columns: PremiumTableColumn<T>[];
  data: T[];
  className?: string;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

/**
 * Tabela premium com estilo sofisticado
 */
export function PremiumTable<T>({
  columns,
  data,
  className,
  onRowClick,
  isLoading,
  emptyMessage = 'Nenhum dado encontrado',
}: PremiumTableProps<T>) {
  const getNestedValue = (obj: T, path: string): unknown => {
    return path.split('.').reduce((acc: unknown, part) => {
      if (acc && typeof acc === 'object') {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj as unknown);
  };

  return (
    <div
      className={clsx(
        'relative z-10 overflow-hidden rounded-2xl border border-gray-100 bg-white',
        'dark:border-gray-700/50 dark:bg-gray-800/50',
        'shadow-sm',
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  style={{ width: col.width }}
                  className={clsx(
                    'px-4 py-3 text-[10px] font-semibold uppercase tracking-wider',
                    'text-gray-500 dark:text-gray-400',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.align === 'left' && 'text-left',
                    !col.align && 'text-left'
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx}>
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  onClick={() => onRowClick?.(row)}
                  className={clsx(
                    'transition-colors duration-150',
                    onRowClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30'
                  )}
                >
                  {columns.map((col) => {
                    const value = getNestedValue(row, String(col.key));
                    return (
                      <td
                        key={String(col.key)}
                        className={clsx(
                          'px-4 py-3 text-sm',
                          col.align === 'right' && 'text-right font-medium tabular-nums',
                          col.align === 'center' && 'text-center',
                          'text-gray-700 dark:text-gray-300'
                        )}
                      >
                        {col.render ? col.render(value, row, rowIdx) : String(value ?? '-')}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
