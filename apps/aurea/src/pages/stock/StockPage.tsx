import { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  Button,
  DataTable,
  Modal,
  ModalFooter,
  Input,
  Select,
  SearchableSelect,
  Textarea,
  StatusBadge,
  Badge,
  Alert,
  EmptyState,
  TabButton,
} from '@/components/ui';
import {
  useStockBalance,
  useStockMovements,
  useStockStats,
  useLowStockItems,
  useCreateStockMovement,
  useStockLocations,
  useCreateStockLocation,
  useUpdateStockLocation,
  useDeleteStockLocation,
} from '@/hooks/useStock';
import { useStockBatches, getBatchStatus } from '@/hooks/useStockBatches';
import { useProducts } from '@/hooks/useProducts';
import { useManufacturers } from '@/hooks/useManufacturers';
import { useForm } from 'react-hook-form';
import type { StockLocation } from '@/types/database';
import type { StockBatchWithRelations } from '@/hooks/useStockBatches';
import { formatDateOnly } from '@/lib/dateOnly';
import {
  Box,
  AlertTriangle,
  RefreshCw,
  MapPin,
  DollarSign,
  Plus,
  Download,
  Upload,
  Clock,
  CalendarDays,
  Filter,
  Search,
  X,
} from 'lucide-react';
type ActiveTab = 'balance' | 'batches' | 'movements' | 'locations' | 'low-stock';

interface MovementFormData {
  movement_type: 'in' | 'out' | 'adjustment' | 'consumption' | 'return';
  product_id: string;
  stock_location_id: string;
  qty: number;
  unit_cost: number;
  reason: string;
}

interface LocationFormData {
  name: string;
}

// Map form movement types to database movement types
const mapMovementType = (type: MovementFormData['movement_type']): 'IN' | 'OUT' | 'ADJUST' => {
  switch (type) {
    case 'in':
    case 'return':
      return 'IN';
    case 'out':
    case 'consumption':
      return 'OUT';
    case 'adjustment':
      return 'ADJUST';
  }
};

export default function StockPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('balance');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isDeleteLocationModalOpen, setIsDeleteLocationModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<StockLocation | null>(null);
  const [movementType, setMovementType] = useState<'in' | 'out'>('in');

  // Filtros
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [manufacturerFilter, setManufacturerFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: stats } = useStockStats();
  const { data: balance = [], isLoading: loadingBalance } = useStockBalance(
    selectedLocationId || undefined
  );
  const { data: movements = [], isLoading: loadingMovements } = useStockMovements(
    selectedLocationId || undefined
  );
  const { data: lowStockItems = [], isLoading: loadingLowStock } = useLowStockItems();
  const { data: locations = [], isLoading: loadingLocations } = useStockLocations();
  const { data: batches = [], isLoading: loadingBatches } = useStockBatches({
    locationId: selectedLocationId || undefined,
  });
  const { data: products = [] } = useProducts();
  const { data: manufacturers = [] } = useManufacturers();

  // Filtragem do saldo de estoque
  const filteredBalance = useMemo(() => {
    return balance.filter((item) => {
      // Filtro de busca (nome ou concentração)
      if (searchFilter) {
        const search = searchFilter.toLowerCase();
        const nameMatch = item.product?.name?.toLowerCase().includes(search);
        const concentrationMatch = item.product?.concentration?.toLowerCase().includes(search);
        const manufacturerMatch = item.product?.manufacturer_rel?.name
          ?.toLowerCase()
          .includes(search);
        if (!nameMatch && !concentrationMatch && !manufacturerMatch) return false;
      }

      // Filtro por tipo
      if (typeFilter && item.product?.item_type !== typeFilter) return false;

      // Filtro por fabricante
      if (manufacturerFilter && item.product?.manufacturer_rel?.id !== manufacturerFilter)
        return false;

      return true;
    });
  }, [balance, searchFilter, typeFilter, manufacturerFilter]);

  const clearFilters = () => {
    setSearchFilter('');
    setTypeFilter('');
    setManufacturerFilter('');
  };

  const hasActiveFilters = searchFilter || typeFilter || manufacturerFilter;

  // Count expiring batches (within 30 days)
  const expiringBatchesCount = useMemo(() => {
    return batches.filter((b) => {
      const status = getBatchStatus(b.expiration_date);
      return status.status === 'expiring_soon' || status.status === 'expired';
    }).length;
  }, [batches]);

  const createMovement = useCreateStockMovement();
  const createLocation = useCreateStockLocation();
  const updateLocation = useUpdateStockLocation();
  const deleteLocation = useDeleteStockLocation();

  const movementForm = useForm<MovementFormData>();
  const locationForm = useForm<LocationFormData>();

  const tabs = [
    { id: 'balance' as const, name: 'Saldo', icon: Box },
    {
      id: 'batches' as const,
      name: 'Lotes',
      icon: CalendarDays,
      count: expiringBatchesCount,
    },
    { id: 'movements' as const, name: 'Movimentações', icon: RefreshCw },
    { id: 'locations' as const, name: 'Locais', icon: MapPin },
    {
      id: 'low-stock' as const,
      name: 'Estoque Baixo',
      icon: AlertTriangle,
      count: stats?.lowStockCount,
    },
  ];

  const openMovementModal = (type: 'in' | 'out') => {
    setMovementType(type);
    movementForm.reset({
      movement_type: type === 'in' ? 'in' : 'consumption',
      product_id: '',
      stock_location_id: selectedLocationId || '',
      qty: 0,
      unit_cost: 0,
      reason: '',
    });
    setIsMovementModalOpen(true);
  };

  const openAddLocationModal = () => {
    setSelectedLocation(null);
    locationForm.reset({ name: '' });
    setIsLocationModalOpen(true);
  };

  const openEditLocationModal = (location: StockLocation) => {
    setSelectedLocation(location);
    locationForm.reset({
      name: location.name,
    });
    setIsLocationModalOpen(true);
  };

  const openDeleteLocationModal = (location: StockLocation) => {
    setSelectedLocation(location);
    setIsDeleteLocationModalOpen(true);
  };

  const onSubmitMovement = async (data: MovementFormData) => {
    await createMovement.mutateAsync({
      movement_type: mapMovementType(data.movement_type),
      product_id: data.product_id,
      location_id: data.stock_location_id,
      qty: data.qty,
      unit_cost: data.unit_cost || 0,
      total_cost: (data.unit_cost || 0) * data.qty,
      reference_type: 'manual' as const,
      reference_id: null,
      occurred_at: new Date().toISOString(),
      notes: data.reason || null,
      presentation_id: null,
      batch_id: null,
      presentation_qty: null,
    });
    setIsMovementModalOpen(false);
  };

  const onSubmitLocation = async (data: LocationFormData) => {
    if (selectedLocation) {
      await updateLocation.mutateAsync({
        id: selectedLocation.id,
        name: data.name,
      });
    } else {
      await createLocation.mutateAsync({
        name: data.name,
        active: true,
      });
    }
    setIsLocationModalOpen(false);
  };

  const handleDeleteLocation = async () => {
    if (selectedLocation) {
      await deleteLocation.mutateAsync(selectedLocation.id);
      setIsDeleteLocationModalOpen(false);
    }
  };

  // Balance columns
  const balanceColumns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'product.name',
        header: 'Nome',
        cell: ({ row }) => {
          const product = row.original.product;
          return (
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {product?.name}
                {product?.concentration && (
                  <span className="ml-1 text-gray-600 dark:text-gray-400">
                    {product?.concentration}
                  </span>
                )}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: 'product.item_type',
        header: () => <span className="block w-full text-center">Tipo</span>,
        cell: ({ row }) => {
          const typeLabels: Record<
            string,
            { label: string; variant: 'info' | 'neutral' | 'success' }
          > = {
            medication: {
              label: 'Medicamento',
              variant: 'info',
            },
            material: {
              label: 'Material',
              variant: 'neutral',
            },
            diet: {
              label: 'Dieta',
              variant: 'success',
            },
          };
          const itemType = row.original.product?.item_type;
          const type = typeLabels[itemType] || {
            label: itemType || '-',
            variant: 'neutral' as const,
          };
          return (
            <div className="text-center">
              <Badge variant={type.variant}>{type.label}</Badge>
            </div>
          );
        },
      },
      {
        accessorKey: 'product.manufacturer',
        header: 'Fabricante',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {row.original.product?.manufacturer_rel?.name || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'stock_location.name',
        header: 'Local',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {row.original.stock_location?.name}
          </span>
        ),
      },
      {
        accessorKey: 'qty_on_hand',
        header: 'Quantidade',
        cell: ({ row }) => {
          const qty = row.original.qty_on_hand;
          const min = row.original.product?.min_stock;
          const isLow = min && qty < min;
          return (
            <div className="flex items-center gap-2">
              <span
                className={`font-medium ${
                  isLow ? 'text-feedback-danger-fg' : 'text-content-primary'
                }`}
              >
                {qty} {row.original.product?.unit_stock?.code}
              </span>
              {isLow && <AlertTriangle className="text-feedback-danger-fg h-4 w-4" />}
            </div>
          );
        },
      },
      {
        accessorKey: 'avg_cost',
        header: 'Custo Médio',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {row.original.avg_cost
              ? new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(row.original.avg_cost)
              : '-'}
          </span>
        ),
      },
      {
        id: 'total',
        header: 'Valor Total',
        cell: ({ row }) => {
          const total = (row.original.qty_on_hand || 0) * (row.original.avg_cost || 0);
          return (
            <span className="font-medium text-gray-900 dark:text-white">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(total)}
            </span>
          );
        },
      },
    ],
    []
  );

  // Movement columns
  const movementColumns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'created_at',
        header: 'Data',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {format(new Date(row.original.created_at), 'dd/MM/yyyy HH:mm')}
          </span>
        ),
      },
      {
        accessorKey: 'movement_type',
        header: 'Tipo',
        cell: ({ row }) => <StatusBadge status={row.original.movement_type} />,
      },
      {
        accessorKey: 'product.name',
        header: 'Item',
        cell: ({ row }) => (
          <span className="font-medium text-gray-900 dark:text-white">
            {row.original.product?.name}
          </span>
        ),
      },
      {
        accessorKey: 'qty',
        header: 'Qtd',
        cell: ({ row }) => {
          const isIn = ['in', 'return'].includes(row.original.movement_type);
          return (
            <span
              className={`font-medium ${isIn ? 'text-feedback-success-fg' : 'text-feedback-danger-fg'}`}
            >
              {isIn ? '+' : '-'}
              {row.original.qty} {row.original.product?.unit_stock?.code}
            </span>
          );
        },
      },
      {
        accessorKey: 'stock_location.name',
        header: 'Local',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {row.original.stock_location?.name}
          </span>
        ),
      },
      {
        accessorKey: 'notes',
        header: 'Observações',
        cell: ({ row }) => (
          <span className="line-clamp-1 text-sm text-gray-600 dark:text-gray-400">
            {row.original.notes || '-'}
          </span>
        ),
      },
    ],
    []
  );

  // Location columns
  const locationColumns: ColumnDef<StockLocation>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Nome',
        cell: ({ row }) => (
          <span className="font-medium text-gray-900 dark:text-white">{row.original.name}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => openEditLocationModal(row.original)}>
              Editar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => openDeleteLocationModal(row.original)}
              className="text-feedback-danger-fg hover:text-feedback-danger-fg/80"
            >
              Excluir
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Low stock columns
  const lowStockColumns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'product.name',
        header: 'Item',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {row.original.product?.name}
            </p>
            <StatusBadge status={row.original.product?.item_type} />
          </div>
        ),
      },
      {
        accessorKey: 'stock_location.name',
        header: 'Local',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {row.original.stock_location?.name}
          </span>
        ),
      },
      {
        accessorKey: 'qty_on_hand',
        header: 'Saldo Atual',
        cell: ({ row }) => (
          <span className="text-feedback-danger-fg font-medium">
            {row.original.qty_on_hand} {row.original.product?.unit_stock?.code}
          </span>
        ),
      },
      {
        id: 'min_stock',
        header: 'Mínimo',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {row.original.product?.min_stock} {row.original.product?.unit_stock?.code}
          </span>
        ),
      },
      {
        id: 'deficit',
        header: 'Déficit',
        cell: ({ row }) => {
          const deficit = row.original.product?.min_stock - row.original.qty_on_hand;
          return (
            <span className="text-feedback-danger-fg font-medium">
              {deficit} {row.original.product?.unit_stock?.code}
            </span>
          );
        },
      },
    ],
    []
  );

  // Batch columns
  const batchColumns: ColumnDef<StockBatchWithRelations>[] = useMemo(
    () => [
      {
        accessorKey: 'product.name',
        header: 'Produto',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {row.original.product?.name}
            </p>
            {row.original.product?.active_ingredient_rel && (
              <p className="text-primary-600 dark:text-primary-400 text-sm">
                {row.original.product.active_ingredient_rel.name}
                {row.original.product.concentration && ` ${row.original.product.concentration}`}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'batch_number',
        header: 'Lote',
        cell: ({ row }) => (
          <span className="font-mono font-medium text-gray-900 dark:text-white">
            {row.original.batch_number}
          </span>
        ),
      },
      {
        accessorKey: 'stock_location.name',
        header: 'Local',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {row.original.stock_location?.name}
          </span>
        ),
      },
      {
        accessorKey: 'qty_on_hand',
        header: 'Quantidade',
        cell: ({ row }) => (
          <span className="font-medium text-gray-900 dark:text-white">
            {row.original.qty_on_hand} {row.original.product?.unit_stock?.code}
          </span>
        ),
      },
      {
        accessorKey: 'expiration_date',
        header: 'Validade',
        cell: ({ row }) => {
          const status = getBatchStatus(row.original.expiration_date);
          const statusVariant = {
            valid: 'success',
            expiring_soon: 'warning',
            expired: 'danger',
            no_expiry: 'neutral',
          } as const;
          return (
            <div className="flex flex-col gap-1">
              {row.original.expiration_date ? (
                <>
                  <span className="text-gray-900 dark:text-white">
                    {formatDateOnly(row.original.expiration_date)}
                  </span>
                  <Badge variant={statusVariant[status.status]} className="w-fit gap-1">
                    <Clock className="h-3 w-3" />
                    {status.label}
                  </Badge>
                </>
              ) : (
                <span className="italic text-gray-500">Sem validade</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'supplier_name',
        header: 'Fornecedor',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {row.original.supplier_name || '-'}
          </span>
        ),
      },
    ],
    []
  );

  const productOptions = products
    .filter((item) => item.active)
    .map((item) => ({
      value: item.id,
      label: `${item.name} (${item.unit_stock?.code || 'UN'})`,
    }));

  const locationOptions = locations.map((loc) => ({
    value: loc.id,
    label: loc.name,
  }));

  const movementTypeOptions =
    movementType === 'in'
      ? [
          { value: 'in', label: 'Entrada' },
          { value: 'return', label: 'Devolução' },
        ]
      : [
          { value: 'out', label: 'Saída' },
          { value: 'consumption', label: 'Consumo' },
          { value: 'adjustment', label: 'Ajuste' },
        ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Estoque</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Gerencie saldos, movimentações e locais de estoque
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => openMovementModal('out')}>
            <Upload className="h-5 w-5" />
            Saída
          </Button>
          <Button onClick={() => openMovementModal('in')}>
            <Download className="h-5 w-5" />
            Entrada
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="bg-feedback-info-bg rounded-xl p-3">
              <Box className="text-feedback-info-fg h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Itens em Estoque</p>
              <p className="font-display text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.totalItems || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="bg-feedback-success-bg rounded-xl p-3">
              <DollarSign className="text-feedback-success-fg h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Valor Total</p>
              <p className="font-display text-2xl font-bold text-gray-900 dark:text-white">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  notation: 'compact',
                }).format(stats?.totalValue || 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="bg-feedback-warning-bg rounded-xl p-3">
              <AlertTriangle className="text-feedback-warning-fg h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Estoque Baixo</p>
              <p className="font-display text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.lowStockCount || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="bg-feedback-warning-bg rounded-xl p-3">
              <Clock className="text-feedback-warning-fg h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Lotes Vencendo</p>
              <p className="font-display text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.expiringBatchesCount || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="bg-feedback-accent-bg rounded-xl p-3">
              <RefreshCw className="text-feedback-accent-fg h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Movimentações (mês)</p>
              <p className="font-display text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.movementsThisMonth || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4 overflow-x-auto">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              icon={<tab.icon className="h-5 w-5" />}
              nowrap
              hoverBorder
              badge={
                tab.count !== undefined && tab.count > 0 ? (
                  <span className="bg-feedback-danger-bg text-feedback-danger-fg ml-1 inline-flex items-center justify-center whitespace-nowrap rounded-full px-2 py-0.5 align-middle text-xs leading-4">
                    {tab.count}
                  </span>
                ) : undefined
              }
            >
              {tab.name}
            </TabButton>
          ))}
        </nav>
      </div>

      {/* Location Filter */}
      {(activeTab === 'balance' || activeTab === 'movements' || activeTab === 'batches') &&
        locations.length > 1 && (
          <div className="flex items-center gap-4">
            <Select
              options={[{ value: '', label: 'Todos os locais' }, ...locationOptions]}
              value={selectedLocationId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSelectedLocationId(e.target.value)
              }
              className="w-64"
            />
          </div>
        )}

      {/* Content */}
      {activeTab === 'balance' && (
        <Card padding="none">
          <div className="space-y-4 p-6">
            {/* Barra de pesquisa e botão de filtros */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome, concentração ou fabricante..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <Button
                variant="filter"
                active={Boolean(showFilters || hasActiveFilters)}
                onClick={() => setShowFilters(!showFilters)}
                icon={<Filter className="h-5 w-5" />}
                count={[typeFilter, manufacturerFilter].filter(Boolean).length}
              />
            </div>

            {/* Painel de filtros */}
            {showFilters && (
              <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Filtro por Tipo */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tipo
                    </label>
                    <div className="relative">
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className={`w-full px-3 py-2 ${typeFilter ? 'pr-10' : 'pr-4'} focus:ring-primary-500 rounded-lg border border-gray-300 bg-white text-gray-900 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white`}
                      >
                        <option value="">Todos</option>
                        <option value="medication">Medicamento</option>
                        <option value="material">Material</option>
                        <option value="diet">Dieta</option>
                      </select>
                      {typeFilter && (
                        <button
                          onClick={() => setTypeFilter('')}
                          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-600 dark:hover:text-gray-300"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filtro por Fabricante */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Fabricante
                    </label>
                    <div className="relative">
                      <select
                        value={manufacturerFilter}
                        onChange={(e) => setManufacturerFilter(e.target.value)}
                        className={`w-full px-3 py-2 ${manufacturerFilter ? 'pr-14' : 'pr-8'} focus:ring-primary-500 rounded-lg border border-gray-300 bg-white text-gray-900 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white`}
                      >
                        <option value="">Todos</option>
                        {manufacturers
                          .filter((m) => m.active)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                      </select>
                      {manufacturerFilter && (
                        <button
                          onClick={() => setManufacturerFilter('')}
                          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-600 dark:hover:text-gray-300"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filtro por Local */}
                  {locations.length > 1 && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Local
                      </label>
                      <div className="relative">
                        <select
                          value={selectedLocationId}
                          onChange={(e) => setSelectedLocationId(e.target.value)}
                          className={`w-full px-3 py-2 ${selectedLocationId ? 'pr-14' : 'pr-8'} focus:ring-primary-500 rounded-lg border border-gray-300 bg-white text-gray-900 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white`}
                        >
                          <option value="">Todos os locais</option>
                          {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name}
                            </option>
                          ))}
                        </select>
                        {selectedLocationId && (
                          <button
                            onClick={() => setSelectedLocationId('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-600 dark:hover:text-gray-300"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Botão limpar filtros */}
                {hasActiveFilters && (
                  <div className="flex justify-end">
                    <button
                      onClick={clearFilters}
                      className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm"
                    >
                      Limpar todos os filtros
                    </button>
                  </div>
                )}
              </div>
            )}

            <DataTable
              data={filteredBalance}
              columns={balanceColumns}
              isLoading={loadingBalance}
              emptyState={
                <EmptyState
                  title={hasActiveFilters ? 'Nenhum resultado' : 'Estoque vazio'}
                  description={
                    hasActiveFilters
                      ? 'Nenhum item corresponde aos filtros selecionados'
                      : 'Nenhum item em estoque no momento'
                  }
                  action={
                    hasActiveFilters ? (
                      <Button variant="secondary" onClick={clearFilters}>
                        Limpar filtros
                      </Button>
                    ) : (
                      <Button onClick={() => openMovementModal('in')}>
                        <Plus className="h-4 w-4" />
                        Registrar Entrada
                      </Button>
                    )
                  }
                />
              }
            />
          </div>
        </Card>
      )}

      {activeTab === 'batches' && (
        <Card padding="none">
          <div className="border-b border-gray-100 p-6 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">
                  Lotes em Estoque
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Controle de validade e rastreabilidade
                </p>
              </div>
              {expiringBatchesCount > 0 && (
                <Alert
                  tone="warning"
                  icon={<AlertTriangle className="h-5 w-5" />}
                  className="px-3 py-2"
                >
                  <span className="text-sm">
                    {expiringBatchesCount} lote{expiringBatchesCount !== 1 ? 's' : ''} vencendo ou
                    vencido{expiringBatchesCount !== 1 ? 's' : ''}
                  </span>
                </Alert>
              )}
            </div>
          </div>
          <div className="p-6">
            <DataTable
              data={batches}
              columns={batchColumns}
              isLoading={loadingBatches}
              searchPlaceholder="Buscar por produto ou lote..."
              emptyState={
                <EmptyState
                  title="Nenhum lote cadastrado"
                  description="Lotes são criados automaticamente ao importar NFe com informações de lote"
                  icon={
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                      <CalendarDays className="h-6 w-6 text-gray-400" />
                    </div>
                  }
                />
              }
            />
          </div>
        </Card>
      )}

      {activeTab === 'movements' && (
        <Card padding="none">
          <div className="p-6">
            <DataTable
              data={movements}
              columns={movementColumns}
              isLoading={loadingMovements}
              searchPlaceholder="Buscar movimentação..."
              emptyState={
                <EmptyState
                  title="Sem movimentações"
                  description="Nenhuma movimentação registrada"
                />
              }
            />
          </div>
        </Card>
      )}

      {activeTab === 'locations' && (
        <Card padding="none">
          <div className="border-b border-gray-100 p-6 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">
                Locais de Estoque
              </h2>
              <Button onClick={openAddLocationModal} size="sm">
                <Plus className="h-4 w-4" />
                Novo Local
              </Button>
            </div>
          </div>
          <div className="p-6">
            <DataTable
              data={locations}
              columns={locationColumns}
              isLoading={loadingLocations}
              emptyState={
                <EmptyState
                  title="Nenhum local cadastrado"
                  description="Cadastre locais de estoque para organizar seus itens"
                  action={
                    <Button onClick={openAddLocationModal} size="sm">
                      <Plus className="h-4 w-4" />
                      Novo Local
                    </Button>
                  }
                />
              }
            />
          </div>
        </Card>
      )}

      {activeTab === 'low-stock' && (
        <Card padding="none">
          <div className="p-6">
            <DataTable
              data={lowStockItems}
              columns={lowStockColumns}
              isLoading={loadingLowStock}
              emptyState={
                <EmptyState
                  title="Estoque adequado"
                  description="Nenhum item abaixo do estoque mínimo"
                  icon={
                    <Alert tone="success" className="rounded-full p-3">
                      <Box className="h-6 w-6" />
                    </Alert>
                  }
                />
              }
            />
          </div>
        </Card>
      )}

      {/* Movement Modal */}
      <Modal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        title={movementType === 'in' ? 'Registrar Entrada' : 'Registrar Saída'}
        size="lg"
      >
        <form onSubmit={movementForm.handleSubmit(onSubmitMovement)} className="space-y-4">
          <Select
            label="Tipo de Movimentação"
            options={movementTypeOptions}
            {...movementForm.register('movement_type', { required: true })}
            required
          />

          <SearchableSelect
            label="Produto"
            options={productOptions}
            placeholder="Selecione um produto..."
            searchPlaceholder="Buscar produto..."
            {...movementForm.register('product_id', {
              required: 'Produto é obrigatório',
            })}
            error={movementForm.formState.errors.product_id?.message}
            required
          />

          <SearchableSelect
            label="Local de Estoque"
            options={locationOptions}
            placeholder="Selecione um local..."
            searchPlaceholder="Buscar local..."
            {...movementForm.register('stock_location_id', {
              required: 'Local é obrigatório',
            })}
            error={movementForm.formState.errors.stock_location_id?.message}
            required
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Quantidade"
              type="number"
              min={1}
              step={1}
              {...movementForm.register('qty', {
                required: 'Quantidade é obrigatória',
                valueAsNumber: true,
                min: { value: 1, message: 'Mínimo 1' },
              })}
              error={movementForm.formState.errors.qty?.message}
              required
            />
            {movementType === 'in' && (
              <Input
                label="Custo Unitário (R$)"
                type="number"
                min={0}
                step={0.01}
                {...movementForm.register('unit_cost', { valueAsNumber: true })}
              />
            )}
          </div>

          <Textarea
            label="Motivo/Observação"
            placeholder="Descreva o motivo da movimentação..."
            {...movementForm.register('reason')}
          />

          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => setIsMovementModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createMovement.isPending}>
              Registrar
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Location Modal */}
      <Modal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        title={selectedLocation ? 'Editar Local' : 'Novo Local'}
      >
        <form onSubmit={locationForm.handleSubmit(onSubmitLocation)} className="space-y-4">
          <Input
            label="Nome"
            placeholder="Ex: Sede, Farmácia, Casa do Paciente..."
            {...locationForm.register('name', {
              required: 'Nome é obrigatório',
            })}
            error={locationForm.formState.errors.name?.message}
            required
          />

          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => setIsLocationModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createLocation.isPending || updateLocation.isPending}>
              {selectedLocation ? 'Salvar' : 'Criar'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Location Modal */}
      <Modal
        isOpen={isDeleteLocationModalOpen}
        onClose={() => setIsDeleteLocationModalOpen(false)}
        title="Excluir Local"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-400">
          Tem certeza que deseja excluir o local <strong>{selectedLocation?.name}</strong>? Esta
          ação não pode ser desfeita.
        </p>

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsDeleteLocationModalOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDeleteLocation}
            isLoading={deleteLocation.isPending}
          >
            Excluir
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
