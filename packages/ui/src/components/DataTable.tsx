import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  PaginationState,
  Updater,
} from '@tanstack/react-table';
import { clsx } from 'clsx';
import { DEFAULT_LIST_PAGE_SIZE } from './Pagination';
import { Button } from './Button';
import { Input } from './Input';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  searchPlaceholder?: string;
  searchKey?: string;
  searchKeys?: string[]; // Multiple keys for global search
  emptyState?: ReactNode;
  isLoading?: boolean;
  onRowClick?: (row: TData) => void;
  persistenceKey?: string;
  showPagination?: boolean;
}

const readPageIndex = (storageKey: string) => {
  if (typeof window === 'undefined') return 0;

  const rawPageIndex = window.sessionStorage.getItem(storageKey);
  const parsedPageIndex = Number.parseInt(rawPageIndex ?? '', 10);
  return Number.isFinite(parsedPageIndex) && parsedPageIndex >= 0 ? parsedPageIndex : 0;
};

export function DataTable<TData>({
  data,
  columns,
  searchPlaceholder = 'Buscar...',
  searchKey,
  searchKeys,
  emptyState,
  isLoading,
  onRowClick,
  persistenceKey,
  showPagination = true,
}: DataTableProps<TData>) {
  const [globalFilter, setGlobalFilter] = useState('');

  const defaultPersistenceKey = useMemo(() => {
    const pathname = typeof window === 'undefined' ? 'unknown' : window.location.pathname;
    const columnSignature = columns
      .map((column, index) => {
        const explicitColumnId = (column as { id?: string }).id;
        const accessorKey = (column as { accessorKey?: string }).accessorKey;
        return explicitColumnId || accessorKey || `column-${index + 1}`;
      })
      .join('|');

    return `datatable:${pathname}:${columnSignature}`;
  }, [columns]);

  const storageKey = persistenceKey || defaultPersistenceKey;

  const [pagination, setPagination] = useState<PaginationState>(() => ({
    pageIndex: readPageIndex(storageKey),
    pageSize: DEFAULT_LIST_PAGE_SIZE,
  }));

  const onPaginationChange = (updater: Updater<PaginationState>) => {
    setPagination((currentPagination) => {
      const nextPagination = typeof updater === 'function' ? updater(currentPagination) : updater;

      return {
        ...nextPagination,
        pageSize: DEFAULT_LIST_PAGE_SIZE,
      };
    });
  };

  // Custom global filter function to search in multiple fields
  const globalFilterFn = (
    row: { original: TData },
    _columnId: string,
    filterValue: string
  ): boolean => {
    if (!filterValue) return true;

    const searchValue = filterValue.toLowerCase();
    const keysToSearch = searchKeys || (searchKey ? [searchKey] : []);

    // If no keys specified, search all string values
    if (keysToSearch.length === 0) {
      return Object.values(row.original as object).some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(searchValue)
      );
    }

    // Search in specified keys
    return keysToSearch.some((key) => {
      const value = (row.original as Record<string, unknown>)[key];
      return String(value ?? '')
        .toLowerCase()
        .includes(searchValue);
    });
  };

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
      pagination,
    },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const pageCount = Math.max(table.getPageCount(), 1);
  const pageIndex = table.getState().pagination.pageIndex;
  const currentPage = Math.min(pageIndex + 1, pageCount);
  const totalRecords = table.getFilteredRowModel().rows.length;
  const recordsInCurrentPage = table.getRowModel().rows.length;
  const startRecord = totalRecords === 0 ? 0 : pageIndex * DEFAULT_LIST_PAGE_SIZE + 1;
  const endRecord = totalRecords === 0 ? 0 : startRecord + recordsInCurrentPage - 1;

  const showSearch = searchKey || (searchKeys && searchKeys.length > 0);

  useEffect(() => {
    setPagination({
      pageIndex: readPageIndex(storageKey),
      pageSize: DEFAULT_LIST_PAGE_SIZE,
    });
  }, [storageKey]);

  useEffect(() => {
    if (pageIndex <= pageCount - 1) return;

    setPagination((currentPagination) => ({
      ...currentPagination,
      pageIndex: Math.max(pageCount - 1, 0),
      pageSize: DEFAULT_LIST_PAGE_SIZE,
    }));
  }, [pageCount, pageIndex]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.sessionStorage.setItem(storageKey, String(pageIndex));
  }, [storageKey, pageIndex]);

  return (
    <div className="space-y-4">
      {/* Search */}
      {showSearch && (
        <div className="max-w-sm">
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="text-left">
                    <div className="flex items-center gap-2">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <svg
                      className="text-primary-500 h-5 w-5 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span className="text-content-muted">Carregando...</span>
                  </div>
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  {emptyState || (
                    <div className="text-content-muted py-8 text-center">
                      Nenhum registro encontrado
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={clsx(onRowClick && 'hover:bg-surface-hover cursor-pointer')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between">
          <p className="text-content-muted text-sm">
            {totalRecords > 0
              ? `Mostrando ${startRecord} a ${endRecord} de ${totalRecords} registros`
              : 'Total: 0 registros'}
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="neutral"
              size="sm"
              aria-label="Página anterior"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="text-content-secondary text-sm">
              Página {currentPage} de {pageCount}
            </span>

            <Button
              variant="neutral"
              size="sm"
              aria-label="Próxima página"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
