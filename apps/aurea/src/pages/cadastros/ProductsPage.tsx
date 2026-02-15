import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Archive, Pencil, Ban, CircleCheck, X, Funnel, Search, FunnelX } from 'lucide-react';
import {
  Card,
  Button,
  DataTable,
  ListPagination,
  StatusBadge,
  EmptyState,
  SearchableSelect,
  FilterToggleButton,
  IconButton,
} from '@/components/ui';
import { useProductsPaginated, useUpdateProduct } from '@/hooks/useProducts';
import { useActiveIngredients } from '@/hooks/useActiveIngredients';
import { useProductGroups } from '@/hooks/useProductGroups';
import { useUnitsOfMeasure } from '@/hooks/useUnitsOfMeasure';
import { useListPageState } from '@/hooks/useListPageState';
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination';
import type { Product } from '@/types/database';

const PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;
const SORT_COLUMNS = new Set(['name', 'item_type', 'min_stock', 'active']);
const ITEM_TYPES = new Set(['medication', 'material', 'diet']);
const STATUS_VALUES = new Set(['active', 'inactive']);

const parseSortColumn = (value: string | null) =>
  value && SORT_COLUMNS.has(value) ? value : 'name';

const parseSortDirection = (value: string | null): 'asc' | 'desc' =>
  value === 'desc' ? 'desc' : 'asc';

const parseItemType = (value: string | null) => (value && ITEM_TYPES.has(value) ? value : '');

const parseStatus = (value: string | null) => (value && STATUS_VALUES.has(value) ? value : '');

export default function ProductsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSearchTerm = searchParams.get('q') ?? '';
  const initialTypeFilter = parseItemType(searchParams.get('type'));
  const initialActiveIngredientFilter = searchParams.get('activeIngredient') ?? '';
  const initialGroupFilter = searchParams.get('group') ?? '';
  const initialUnitFilter = searchParams.get('unit') ?? '';
  const initialStatusFilter = parseStatus(searchParams.get('status'));
  const initialSortColumn = parseSortColumn(searchParams.get('sort'));
  const initialSortDirection = parseSortDirection(searchParams.get('dir'));

  // Paginação e busca server-side
  const [currentPage, setCurrentPage] = useListPageState();
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [searchInput, setSearchInput] = useState(initialSearchTerm);

  // Filtros (agora server-side)
  const [typeFilter, setTypeFilter] = useState(initialTypeFilter);
  const [activeIngredientFilter, setActiveIngredientFilter] = useState(
    initialActiveIngredientFilter
  );
  const [groupFilter, setGroupFilter] = useState(initialGroupFilter);
  const [unitFilter, setUnitFilter] = useState(initialUnitFilter);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [showFilters, setShowFilters] = useState(false);

  // Ordenação server-side
  const [sortColumn, setSortColumn] = useState<string>(initialSortColumn);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialSortDirection);

  const searchParamsString = searchParams.toString();

  const parsedParams = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    return {
      searchTerm: params.get('q') ?? '',
      typeFilter: parseItemType(params.get('type')),
      activeIngredientFilter: params.get('activeIngredient') ?? '',
      groupFilter: params.get('group') ?? '',
      unitFilter: params.get('unit') ?? '',
      statusFilter: parseStatus(params.get('status')),
      sortColumn: parseSortColumn(params.get('sort')),
      sortDirection: parseSortDirection(params.get('dir')),
    };
  }, [searchParamsString]);

  useEffect(() => {
    setSearchTerm(parsedParams.searchTerm);
    setSearchInput(parsedParams.searchTerm);
    setTypeFilter(parsedParams.typeFilter);
    setActiveIngredientFilter(parsedParams.activeIngredientFilter);
    setGroupFilter(parsedParams.groupFilter);
    setUnitFilter(parsedParams.unitFilter);
    setStatusFilter(parsedParams.statusFilter);
    setSortColumn(parsedParams.sortColumn);
    setSortDirection(parsedParams.sortDirection);
  }, [parsedParams]);

  const listParamsString = useMemo(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (currentPage > 1) params.set('page', String(currentPage));
    if (typeFilter) params.set('type', typeFilter);
    if (activeIngredientFilter) params.set('activeIngredient', activeIngredientFilter);
    if (groupFilter) params.set('group', groupFilter);
    if (unitFilter) params.set('unit', unitFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (sortColumn !== 'name') params.set('sort', sortColumn);
    if (sortDirection !== 'asc') params.set('dir', sortDirection);
    return params.toString();
  }, [
    searchTerm,
    currentPage,
    typeFilter,
    activeIngredientFilter,
    groupFilter,
    unitFilter,
    statusFilter,
    sortColumn,
    sortDirection,
  ]);

  useEffect(() => {
    if (listParamsString !== searchParamsString) {
      setSearchParams(listParamsString, { replace: true });
    }
  }, [listParamsString, searchParamsString, setSearchParams]);

  const listQuerySuffix = listParamsString ? `?${listParamsString}` : '';
  const buildProductUrl = useCallback(
    (productId: string) => `/produtos/${productId}${listQuerySuffix}`,
    [listQuerySuffix]
  );
  const newProductUrl = listQuerySuffix ? `/produtos/novo${listQuerySuffix}` : '/produtos/novo';

  // Filters object for the paginated hook
  const filters = useMemo(
    () => ({
      itemType: typeFilter || undefined,
      activeIngredientId: activeIngredientFilter || undefined,
      groupId: groupFilter || undefined,
      unitId: unitFilter || undefined,
      status: statusFilter || undefined,
    }),
    [typeFilter, activeIngredientFilter, groupFilter, unitFilter, statusFilter]
  );

  const { data: paginatedData, isLoading } = useProductsPaginated(
    currentPage,
    PAGE_SIZE,
    searchTerm,
    filters,
    sortColumn,
    sortDirection
  );

  const items = paginatedData?.data ?? [];
  const totalCount = paginatedData?.totalCount ?? 0;
  const totalPages = paginatedData?.totalPages ?? 1;

  const updateItem = useUpdateProduct();

  // Dados para os filtros
  const { data: activeIngredients = [] } = useActiveIngredients();
  const { data: productGroups = [] } = useProductGroups();
  const { data: unitsOfMeasure = [] } = useUnitsOfMeasure();

  // Search handlers
  const handleSearch = useCallback(() => {
    setCurrentPage(1);
    setSearchTerm(searchInput);
  }, [searchInput, setCurrentPage]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setTypeFilter('');
    setActiveIngredientFilter('');
    setGroupFilter('');
    setUnitFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchTerm || typeFilter || activeIngredientFilter || groupFilter || unitFilter || statusFilter;

  const toggleActive = async (item: Product) => {
    await updateItem.mutateAsync({
      id: item.id,
      active: !item.active,
    });
  };

  // Handler para ordenação por coluna
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const columns: ColumnDef<Product>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: () => (
          <button
            onClick={() => handleSort('name')}
            className="hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1"
          >
            NOME
            {sortColumn === 'name' && (
              <span className="text-primary-500">{sortDirection === 'asc' ? '^' : 'v'}</span>
            )}
          </button>
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {row.original.name}
              {row.original.concentration && (
                <span className="ml-1 text-gray-600 dark:text-gray-400">
                  {row.original.concentration}
                </span>
              )}
            </p>
            {(row.original as any).active_ingredient_rel && (
              <p className="text-primary-600 dark:text-primary-400 text-sm">
                {(row.original as any).active_ingredient_rel.name}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'item_type',
        header: () => (
          <button
            onClick={() => handleSort('item_type')}
            className="hover:text-primary-600 dark:hover:text-primary-400 flex w-full items-center justify-center gap-1"
          >
            TIPO
            {sortColumn === 'item_type' && (
              <span className="text-primary-500">{sortDirection === 'asc' ? '^' : 'v'}</span>
            )}
          </button>
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const typeLabels: Record<string, { label: string; color: string }> = {
            medication: {
              label: 'Medicamento',
              color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            },
            material: {
              label: 'Material',
              color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            },
            diet: {
              label: 'Dieta',
              color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            },
          };
          const type = typeLabels[row.original.item_type] || {
            label: row.original.item_type,
            color: 'bg-gray-100 text-gray-700',
          };
          return (
            <div className="text-center">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${type.color}`}
              >
                {type.label}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'unit_stock',
        header: () => <span className="block w-full text-center">UNIDADE BASE</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-center text-gray-700 dark:text-gray-300">
            {(row.original as any).unit_stock?.symbol || '-'}
          </div>
        ),
      },
      {
        accessorKey: 'min_stock',
        header: () => (
          <button
            onClick={() => handleSort('min_stock')}
            className="hover:text-primary-600 dark:hover:text-primary-400 flex w-full items-center justify-center gap-1"
          >
            EST. MÍNIMO
            {sortColumn === 'min_stock' && (
              <span className="text-primary-500">{sortDirection === 'asc' ? '^' : 'v'}</span>
            )}
          </button>
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-center text-gray-700 dark:text-gray-300">
            {row.original.min_stock || '-'}
          </div>
        ),
      },
      {
        accessorKey: 'presentations',
        header: () => <span className="block w-full text-center">APRESENTAÇÕES</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const count = (row.original as any).presentations?.length || 0;
          if (count === 0) {
            return <div className="text-center text-gray-400 dark:text-gray-500">-</div>;
          }
          return (
            <div className="text-center">
              <span className="bg-primary-500/10 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 inline-flex min-w-[24px] items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium">
                {count}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'active',
        header: () => (
          <button
            onClick={() => handleSort('active')}
            className="hover:text-primary-600 dark:hover:text-primary-400 flex w-full items-center justify-center gap-1"
          >
            STATUS
            {sortColumn === 'active' && (
              <span className="text-primary-500">{sortDirection === 'asc' ? '^' : 'v'}</span>
            )}
          </button>
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleActive(row.original);
              }}
              className="cursor-pointer"
            >
              <StatusBadge status={row.original.active ? 'active' : 'inactive'} />
            </button>
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                navigate(buildProductUrl(row.original.id));
              }}
            >
              <Pencil className="h-4 w-4" />
            </IconButton>
            <IconButton
              variant={row.original.active ? 'danger' : 'success'}
              onClick={(e) => {
                e.stopPropagation();
                toggleActive(row.original);
              }}
              title={row.original.active ? 'Inativar' : 'Ativar'}
            >
              {row.original.active ? (
                <Ban className="h-4 w-4" />
              ) : (
                <CircleCheck className="h-4 w-4" />
              )}
            </IconButton>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, sortColumn, sortDirection, buildProductUrl]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Produtos
          </h1>
        </div>
        <Button onClick={() => navigate(newProductUrl)} variant="solid" label="Novo Produto" />
      </div>

      {/* Table */}
      <Card padding="none">
        <div className="space-y-4 p-6">
          {/* Barra de pesquisa e botão de filtros */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome do produto ou apresentação..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSearch}
                variant="outline"
                size="md"
                showIcon
                icon={<Search className="h-4 w-4" />}
                label=""
                className="w-9 justify-center pr-3"
              />
              <FilterToggleButton
                active={Boolean(showFilters || hasActiveFilters)}
                onClick={() => setShowFilters(!showFilters)}
                icon={<Funnel className="mr-1 h-4 w-4" />}
                count={
                  [
                    searchTerm,
                    typeFilter,
                    activeIngredientFilter,
                    groupFilter,
                    unitFilter,
                    statusFilter,
                  ].filter(Boolean).length
                }
                className="min-w-24 justify-center"
              />
              {hasActiveFilters && (
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  size="md"
                  showIcon
                  icon={<FunnelX className="h-4 w-4" />}
                  label=""
                  title="Limpar filtros"
                  aria-label="Limpar filtros"
                  className="w-9 justify-center pr-3"
                />
              )}
            </div>
          </div>

          {/* Painel de filtros */}
          {showFilters && (
            <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {/* Filtro por Tipo */}
                <SearchableSelect
                  label="Tipo"
                  options={[
                    { value: '', label: 'Todos' },
                    { value: 'medication', label: 'Medicamento' },
                    { value: 'material', label: 'Material' },
                    { value: 'diet', label: 'Dieta' },
                  ]}
                  placeholder="Selecione..."
                  searchPlaceholder="Buscar tipo..."
                  value={typeFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                />

                {/* Filtro por Princípio Ativo */}
                <SearchableSelect
                  label="Princípio Ativo"
                  options={[
                    { value: '', label: 'Todos' },
                    ...activeIngredients
                      .filter((a) => a.active)
                      .map((a) => ({
                        value: a.id,
                        label: a.name,
                      })),
                  ]}
                  placeholder="Selecione..."
                  searchPlaceholder="Buscar princípio ativo..."
                  value={activeIngredientFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setActiveIngredientFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                />

                {/* Filtro por Grupo */}
                <SearchableSelect
                  label="Grupo"
                  options={[
                    { value: '', label: 'Todos' },
                    ...productGroups.map((g) => ({
                      value: g.id,
                      label: g.name,
                    })),
                  ]}
                  placeholder="Selecione..."
                  searchPlaceholder="Buscar grupo..."
                  value={groupFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setGroupFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                />

                {/* Filtro por Unidade */}
                <SearchableSelect
                  label="Unidade Base"
                  options={[
                    { value: '', label: 'Todos' },
                    ...unitsOfMeasure.map((u) => ({
                      value: u.id,
                      label: `${u.symbol} - ${u.name}`,
                    })),
                  ]}
                  placeholder="Selecione..."
                  searchPlaceholder="Buscar unidade..."
                  value={unitFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setUnitFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                />

                {/* Filtro por Status */}
                <SearchableSelect
                  label="Status"
                  options={[
                    { value: '', label: 'Todos' },
                    { value: 'active', label: 'Ativo' },
                    { value: 'inactive', label: 'Inativo' },
                  ]}
                  placeholder="Selecione..."
                  searchPlaceholder="Buscar status..."
                  value={statusFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
          )}
          <DataTable
            data={items}
            columns={columns}
            showPagination={false}
            isLoading={isLoading}
            onRowClick={(row) => navigate(buildProductUrl(row.id))}
            emptyState={
              hasActiveFilters ? (
                <EmptyState
                  icon={<Funnel className="h-12 w-12 text-gray-400" />}
                  title="Nenhum produto encontrado"
                  description="Nenhum produto corresponde aos filtros selecionados"
                  action={
                    <Button
                      onClick={clearFilters}
                      variant="solid"
                      size="sm"
                      icon={<X className="h-4 w-4" />}
                      label="Limpar filtros"
                    />
                  }
                />
              ) : (
                <EmptyState
                  icon={<Archive className="h-12 w-12 text-gray-400" />}
                  title="Nenhum produto cadastrado"
                  description="Cadastre produtos para utilizar nas prescrições e no estoque"
                  action={
                    <Button
                      onClick={() => navigate(newProductUrl)}
                      variant="solid"
                      label="Novo Produto"
                    />
                  }
                />
              )
            }
          />

          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            itemLabel="produtos"
            onPreviousPage={() => setCurrentPage((page) => page - 1)}
            onNextPage={() => setCurrentPage((page) => page + 1)}
          />
        </div>
      </Card>
    </div>
  );
}
