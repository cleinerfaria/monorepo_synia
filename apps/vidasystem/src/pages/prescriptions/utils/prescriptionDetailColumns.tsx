import { format } from 'date-fns';
import type { ColumnDef } from '@tanstack/react-table';
import { Copy, Eye, Menu, Pencil, Power, PowerOff, Printer, Trash2 } from 'lucide-react';
import {
  Badge,
  DropdownMenu,
  DropdownMenuItem,
  IconButton,
  StatusBadge,
  getStatusBadgeConfig,
  type BadgeVariant,
} from '@/components/ui';
import type { PrescriptionItem } from '@/types/database';
import type { PrescriptionPrintAction } from '@/components/prescription/PrescriptionPrintModal';
import type { PrescriptionPrintHistoryItem } from '@/types/prescriptionPrint';
import {
  calculateInclusiveDays,
  parseDateOnly,
  convertTimeToShiftCode,
} from './prescriptionDetailFrequency';

type PrintRowAction = { id: string; action: PrescriptionPrintAction } | null;

interface BuildPrintHistoryColumnsParams {
  printHistoryActionInProgress: PrintRowAction;
  handlePrintHistoryAction: (id: string, action: 'preview' | 'print') => Promise<void> | void;
  deletingPrintId: string | null;
  handleDeletePrescriptionPrint: (item: PrescriptionPrintHistoryItem) => void;
  hasPrescriptionEditPermission: boolean;
}

interface BuildItemColumnsParams {
  itemNumbers: Map<string, number>;
  products: any[];
  equipment: any[];
  procedures: any[];
  administrationRoutes: any[];
  formatFrequencyDisplay: (item: any) => string;
  isItemEffectivelyActive: (item: any) => boolean;
  isMedicationSuspendedByEndDate: (item: any) => boolean;
  openSuspendItemModal: (item: PrescriptionItem) => void;
  toggleItemActive: (payload: { id: string; is_active: boolean }) => void;
  openEditItemModal: (item: any) => void;
  prescriptionId?: string;
  items: PrescriptionItem[];
  duplicateItem: (payload: { item: any; prescriptionId: string; components: any[] }) => void;
  openDeleteItemModal: (item: PrescriptionItem) => void;
}

export function buildPrintHistoryColumns({
  printHistoryActionInProgress,
  handlePrintHistoryAction,
  deletingPrintId,
  handleDeletePrescriptionPrint,
  hasPrescriptionEditPermission,
}: BuildPrintHistoryColumnsParams): ColumnDef<PrescriptionPrintHistoryItem>[] {
  return [
    {
      accessorKey: 'print_number',
      header: 'Nº Impressão',
      cell: ({ row }) => (
        <span className="font-semibold text-gray-900 dark:text-white">
          {row.original.print_number}
        </span>
      ),
    },
    {
      id: 'period',
      header: 'Período',
      cell: ({ row }) => (
        <span className="text-gray-700 dark:text-gray-300">
          {format(parseDateOnly(row.original.period_start), 'dd/MM/yyyy')} a{' '}
          {format(parseDateOnly(row.original.period_end), 'dd/MM/yyyy')}
        </span>
      ),
    },
    {
      id: 'period_days',
      header: 'Qtd. dias',
      cell: ({ row }) => (
        <span className="text-gray-700 dark:text-gray-300">
          {calculateInclusiveDays(row.original.period_start, row.original.period_end)} dias
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Gerado em',
      cell: ({ row }) => (
        <span className="text-gray-700 dark:text-gray-300">
          {format(new Date(row.original.created_at), 'dd/MM/yyyy HH:mm')}
        </span>
      ),
    },
    {
      accessorKey: 'created_by_name',
      header: 'Gerado por',
      cell: ({ row }) => (
        <span className="text-gray-700 dark:text-gray-300">
          {row.original.created_by_name || 'Usuário'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="w-full text-right">Ações</div>,
      cell: ({ row }) => {
        const rowAction = printHistoryActionInProgress;
        const isPreviewLoading =
          rowAction?.id === row.original.id && rowAction.action === 'preview';
        const isPrintLoading = rowAction?.id === row.original.id && rowAction.action === 'print';

        return (
          <div className="flex w-full items-center justify-end gap-2">
            <IconButton
              onClick={(event) => {
                event.stopPropagation();
                void handlePrintHistoryAction(row.original.id, 'preview');
              }}
              disabled={isPreviewLoading}
              title="Visualizar"
              aria-label="Visualizar"
            >
              <Eye className={`h-4 w-4 ${isPreviewLoading ? 'animate-spin' : ''}`} />
            </IconButton>
            <IconButton
              onClick={(event) => {
                event.stopPropagation();
                void handlePrintHistoryAction(row.original.id, 'print');
              }}
              disabled={isPrintLoading}
              title="Imprimir"
              aria-label="Imprimir"
            >
              <Printer className="h-4 w-4" />
            </IconButton>
            <IconButton
              variant="danger"
              onClick={(event) => {
                event.stopPropagation();
                handleDeletePrescriptionPrint(row.original);
              }}
              disabled={!hasPrescriptionEditPermission || deletingPrintId === row.original.id}
              title="Excluir"
              aria-label="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </div>
        );
      },
    },
  ];
}

export function buildItemColumns({
  itemNumbers,
  products,
  equipment,
  procedures,
  administrationRoutes,
  formatFrequencyDisplay,
  isItemEffectivelyActive,
  isMedicationSuspendedByEndDate,
  openSuspendItemModal,
  toggleItemActive,
  openEditItemModal,
  prescriptionId,
  items,
  duplicateItem,
  openDeleteItemModal,
}: BuildItemColumnsParams): ColumnDef<any>[] {
  return [
    {
      accessorKey: 'number',
      header: 'Nº',
      size: 50,
      cell: ({ row }) => {
        const itemNumber = itemNumbers.get(row.original.id);
        return (
          <div className="bg-primary-100/10 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 flex items-center justify-center rounded-lg px-2 py-1 font-semibold">
            {itemNumber || '-'}
          </div>
        );
      },
    },
    {
      accessorKey: 'item',
      header: 'Item',
      cell: ({ row }) => {
        const item = row.original;
        const product = item.product_id ? products.find((p) => p.id === item.product_id) : null;
        const equipmentItem = item.equipment_id
          ? equipment.find((e) => e.id === item.equipment_id)
          : null;
        const procedureItem = item.procedure_id
          ? procedures.find((p) => p.id === item.procedure_id)
          : null;
        const displayName =
          typeof item.display_name === 'string' ? item.display_name.trim() : '';
        let name =
          displayName ||
          product?.name ||
          equipmentItem?.name ||
          procedureItem?.name ||
          item.product?.name ||
          item.equipment?.name ||
          (item as any).procedure?.name ||
          '-';
        const concentration = product?.concentration || item.product?.concentration;
        if (concentration) {
          name += ` ${concentration}`;
        }

        const components = (item as any).components || [];
        const instructions = item.instructions_use;
        const quantity = item.quantity;
        const productData = product as any;
        const unit =
          productData?.unit_prescription?.symbol ||
          productData?.unit_stock?.symbol ||
          item.product?.unit_prescription?.symbol ||
          item.product?.unit_stock?.symbol ||
          'UN';

        return (
          <div className="space-y-1" style={{ minWidth: '280px' }}>
            <p className="font-medium text-gray-900 dark:text-white">
              {name}
              {quantity != null && (
                <span className="text-primary-600 dark:text-primary-400 ml-2 font-semibold">
                  {quantity} {unit}
                </span>
              )}
              {instructions && (
                <span className="ml-2 text-xs font-normal text-gray-900 dark:text-white">
                  — {instructions}
                </span>
              )}
            </p>
            {components.length > 0 && (
              <div className="border-primary-200 dark:border-primary-700 ml-3 space-y-0.5 border-l-2 pl-3">
                {components.map((comp: any, idx: number) => {
                  const compProduct = comp.product;
                  const compName = compProduct?.name || 'Produto';
                  const compConcentration = compProduct?.concentration || '';
                  const compQuantity = comp.quantity;
                  const compUnit =
                    compProduct?.unit_prescription?.symbol ||
                    compProduct?.unit_stock?.symbol ||
                    'UN';

                  return (
                    <p key={comp.id || idx} className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="text-primary-500">•</span> {compName}
                      {compConcentration && (
                        <span className="text-gray-400"> {compConcentration}</span>
                      )}
                      {compQuantity != null && (
                        <span className="ml-1 font-medium text-gray-600 dark:text-gray-300">
                          — {compQuantity} {compUnit}
                        </span>
                      )}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'route_id',
      header: 'Via',
      cell: ({ row }) => {
        const route = administrationRoutes.find((r) => r.id === row.original.route_id);
        return (
          <span className="text-gray-700 dark:text-gray-300">
            {route?.abbreviation || route?.name || '-'}
          </span>
        );
      },
    },
    {
      id: 'frequencia',
      header: () => (
        <div className="w-full text-center" style={{ minWidth: '50px' }}>
          Freq.
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <span className="text-gray-700 dark:text-gray-300">
            {formatFrequencyDisplay(row.original)}
          </span>
        </div>
      ),
    },
    {
      id: 'horarios',
      header: () => (
        <div className="w-full text-center" style={{ minWidth: '115px', maxWidth: '175px' }}>
          Horários
        </div>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const timeChecks = item.time_checks;

        if (!timeChecks) {
          return (
            <div className="flex justify-center">
              <span className="text-gray-500">-</span>
            </div>
          );
        }

        try {
          const times: string[] =
            typeof timeChecks === 'string'
              ? timeChecks.split(',').map((time) => time.trim())
              : timeChecks;

          const isShiftMode = item.frequency_mode === 'shift';

          const getTimeVariant = (time: string): BadgeVariant => {
            if (isShiftMode) {
              // For shift mode, use different colors based on shift code
              const shiftCode = convertTimeToShiftCode(time);
              if (shiftCode === 'M') return 'info';
              if (shiftCode === 'T') return 'warning';
              if (shiftCode === 'N') return 'danger';
            }

            const parts = time.split(':');
            const hour = parseInt(parts[0], 10);
            return hour >= 7 && hour < 19 ? 'info' : 'danger';
          };

          const formattedTimes = times.map((time) => {
            let displayTime: string;

            if (isShiftMode) {
              // Convert time to shift code for display
              const shiftCode = convertTimeToShiftCode(time);
              displayTime = shiftCode || time;
            } else {
              // Format as time
              displayTime = time;
              if (time.endsWith(':00')) {
                const withoutSeconds = time.slice(0, -3);
                displayTime = withoutSeconds.startsWith('0')
                  ? withoutSeconds.slice(1)
                  : withoutSeconds;
              } else if (time.startsWith('0')) {
                displayTime = time.slice(1);
              }
            }

            const variant = getTimeVariant(time);
            return (
              <Badge key={time} variant={variant} className="min-w-[54px] justify-center font-mono">
                {displayTime}
              </Badge>
            );
          });

          return (
            <div
              className="flex flex-wrap justify-center gap-1"
              style={{ maxWidth: '175px', wordBreak: 'break-word' }}
            >
              {formattedTimes}
            </div>
          );
        } catch {
          return <span className="text-gray-500">-</span>;
        }
      },
    },
    {
      accessorKey: 'item_type',
      header: () => <div className="w-full text-center">Tipo</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <StatusBadge status={row.original.item_type} />
        </div>
      ),
    },
    {
      id: 'termino',
      header: () => (
        <div className="w-full text-center" style={{ minWidth: '105px' }}>
          Uso
        </div>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const isPrn = item.is_prn;
        const isContinuousUse = item.is_continuous_use;
        const endDate = item.end_date;
        const startDate = item.start_date;

        return (
          <div className="flex justify-center">
            {isPrn ? (
              <Badge variant="warning">Se necessário</Badge>
            ) : isContinuousUse ? (
              <Badge variant="info">Contínuo</Badge>
            ) : endDate ? (
              startDate ? (
                <Badge variant="danger">
                  {format(parseDateOnly(startDate), 'dd/MM')} →{' '}
                  {format(parseDateOnly(endDate), 'dd/MM')}
                </Badge>
              ) : (
                <Badge variant="danger">Até {format(parseDateOnly(endDate), 'dd/MM')}</Badge>
              )
            ) : (
              <span className="text-gray-500">-</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'supplier',
      header: () => <div className="w-full text-center">Fornecedor</div>,
      cell: ({ row }) => {
        const supplierValue = row.original.supplier || 'company';
        const config = getStatusBadgeConfig(supplierValue);

        return (
          <div className="flex justify-center">
            <Badge variant={config.variant}>{config.label}</Badge>
          </div>
        );
      },
    },
    {
      id: 'itemstatus',
      accessorKey: 'status',
      header: () => <div className="w-full text-center">Status</div>,
      cell: ({ row }) => {
        const item = row.original;
        const isActive = isItemEffectivelyActive(item);

        return (
          <div className="flex justify-center">
            <Badge variant={isActive ? 'success' : 'danger'}>
              {isActive ? 'Ativo' : 'Suspenso'}
            </Badge>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const isActive = isItemEffectivelyActive(row.original);
        const isSuspendedByEndDate = isMedicationSuspendedByEndDate(row.original);

        return (
          <div className="flex items-center justify-end">
            <DropdownMenu trigger={<Menu className="h-4 w-4" />} portal>
              <DropdownMenuItem
                onClick={() => {
                  if (isSuspendedByEndDate) return;

                  if (isActive) {
                    openSuspendItemModal(row.original);
                  } else {
                    toggleItemActive({
                      id: row.original.id,
                      is_active: true,
                    });
                  }
                }}
                disabled={isSuspendedByEndDate}
                className={`flex items-center gap-2 ${
                  isSuspendedByEndDate
                    ? 'text-gray-400'
                    : isActive
                      ? 'text-orange-600 hover:text-orange-700'
                      : 'text-green-600 hover:text-green-700'
                }`}
              >
                {isSuspendedByEndDate ? (
                  <>
                    <PowerOff className="h-4 w-4" />
                    Suspenso por período
                  </>
                ) : isActive ? (
                  <>
                    <PowerOff className="h-4 w-4" />
                    Suspender
                  </>
                ) : (
                  <>
                    <Power className="h-4 w-4" />
                    Reativar
                  </>
                )}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => openEditItemModal(row.original)}
                className="flex items-center gap-2"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  if (!prescriptionId) return;

                  const itemComponents = items.find((i) => i.id === row.original.id);
                  const components =
                    itemComponents && (itemComponents as any).components
                      ? (itemComponents as any).components
                      : [];

                  duplicateItem({
                    item: row.original,
                    prescriptionId,
                    components: components as any[],
                  });
                }}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Duplicar
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => openDeleteItemModal(row.original)}
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}
