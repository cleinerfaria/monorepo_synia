import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowLeft, Calendar, RefreshCw, Zap } from 'lucide-react';
import {
  Card,
  Button,
  Breadcrumbs,
  Loading,
  DatePicker,
  DataTable,
  Badge,
  EmptyState,
} from '@/components/ui';
import {
  usePatientDemand,
  useDemandShifts,
  useGenerateShifts,
  type ShiftWithProfessional,
} from '@/hooks/usePatientDemands';
import { usePadItems } from '@/hooks/usePadItems';
import { useNavigationGuard } from '@/contexts/NavigationGuardContext';
import { useAuthStore } from '@/stores/authStore';
import { useHasPermission } from '@/hooks/useAccessProfiles';
import { format, parseISO, addDays } from 'date-fns';

const STATUS_MAP: Record<string, { label: string; variant: string }> = {
  planned: { label: 'Planejado', variant: 'neutral' },
  open: { label: 'Aberto', variant: 'info' },
  assigned: { label: 'Atribuído', variant: 'warning' },
  in_progress: { label: 'Em andamento', variant: 'primary' },
  finished: { label: 'Concluído', variant: 'success' },
  missed: { label: 'Falta', variant: 'danger' },
  canceled: { label: 'Cancelado', variant: 'neutral' },
};

const todayStr = () => format(new Date(), 'yyyy-MM-dd');
const in14DaysStr = () => format(addDays(new Date(), 14), 'yyyy-MM-dd');

export default function PadPreviewPage() {
  const { demandId } = useParams<{ demandId: string }>();
  const navigate = useNavigate();
  const { handleLinkClick: handleBreadcrumbNavigate } = useNavigationGuard();
  const { appUser } = useAuthStore();
  const { hasPermission } = useHasPermission('prescriptions', 'edit');

  const canEdit = hasPermission || appUser?.access_profile?.is_admin === true;

  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(in14DaysStr);

  const { data: demand, isLoading: isLoadingDemand } = usePatientDemand(demandId);
  const {
    data: shifts = [],
    isLoading: isLoadingShifts,
    refetch,
  } = useDemandShifts(demandId, fromDate, toDate);
  const { data: padItems = [] } = usePadItems(demandId);
  const generateShifts = useGenerateShifts();

  const shiftPadItem = useMemo(
    () => padItems.find((item) => item.type === 'shift' && item.is_active) || null,
    [padItems]
  );

  const handleGenerate = async () => {
    if (!shiftPadItem?.id) return;
    try {
      await generateShifts.mutateAsync({
        padItemId: shiftPadItem.id,
        from: fromDate,
        to: toDate,
      });
      refetch();
    } catch {
      // Error already handled by hook
    }
  };

  const columns: ColumnDef<ShiftWithProfessional>[] = useMemo(
    () => [
      {
        accessorKey: 'date',
        header: 'Data',
        cell: ({ row }) => (
          <span className="font-medium text-gray-900 dark:text-white">
            {format(parseISO(row.original.start_at), 'dd/MM/yyyy')}
          </span>
        ),
      },
      {
        accessorKey: 'start_at',
        header: 'Início',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {format(parseISO(row.original.start_at), 'HH:mm')}
          </span>
        ),
      },
      {
        accessorKey: 'end_at',
        header: 'Término',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {format(parseISO(row.original.end_at), 'HH:mm')}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = STATUS_MAP[row.original.status] || {
            label: row.original.status,
            variant: 'neutral',
          };
          return <Badge variant={status.variant as any}>{status.label}</Badge>;
        },
      },
      {
        accessorKey: 'professional',
        header: 'Profissional',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {row.original.professional?.name || 'Não atribuído'}
          </span>
        ),
      },
    ],
    []
  );

  const breadcrumbItems = [
    { label: 'PAD', href: '/prontuario/pad' },
    { label: 'Plantões da Escala' },
  ];

  if (isLoadingDemand) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading size="lg" />
      </div>
    );
  }

  if (!demand) {
    return (
      <div className="space-y-4">
        <div className="px-4 lg:px-4">
          <Breadcrumbs items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />
        </div>
        <Card>
          <EmptyState
            icon={<Calendar className="h-12 w-12 text-gray-400" />}
            title="Escala não encontrada"
            description="A escala solicitada não foi encontrada."
            action={
              <Button
                onClick={() => navigate('/prontuario/pad')}
                size="sm"
                variant="solid"
                label="Voltar para PAD"
              />
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 lg:px-4">
        <Breadcrumbs items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />
        <Button
          onClick={() => navigate('/prontuario/pad')}
          variant="outline"
          icon={<ArrowLeft className="h-5 w-5" />}
          showIcon
          label="Voltar"
        />
      </div>

      {/* Demand Info */}
      <Card>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Paciente</p>
            <p className="font-medium text-gray-900 dark:text-white">{demand.patient?.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Período</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {format(parseISO(demand.start_date), 'dd/MM/yyyy')}
              {' — '}
              {demand.end_date ? format(parseISO(demand.end_date), 'dd/MM/yyyy') : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Horário</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {demand.start_time.slice(0, 5)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Item de Plantão</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {shiftPadItem
                ? `${shiftPadItem.hours_per_day ?? 0}h/dia - plantões de ${shiftPadItem.shift_duration_hours ?? 0}h`
                : 'Não configurado'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
            <Badge variant={demand.is_active ? 'success' : 'neutral'}>
              {demand.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Filters + Actions */}
      <Card padding="none">
        <div className="space-y-4 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="w-full sm:w-48">
              <DatePicker
                label="De"
                value={fromDate}
                onChange={(e: any) => setFromDate(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <DatePicker
                label="Até"
                value={toDate}
                onChange={(e: any) => setToDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => refetch()}
                variant="outline"
                icon={<RefreshCw className="h-4 w-4" />}
                showIcon
                label="Atualizar"
                disabled={isLoadingShifts}
              />
              {canEdit && (
                <Button
                  onClick={handleGenerate}
                  variant="solid"
                  icon={<Zap className="h-4 w-4" />}
                  showIcon
                  label="Gerar Plantões"
                  isLoading={generateShifts.isPending}
                  disabled={!shiftPadItem}
                />
              )}
            </div>
          </div>

          {!shiftPadItem && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Cadastre um item do tipo plantão no PAD para gerar escala.
            </p>
          )}

          {/* Shifts Table */}
          <DataTable
            data={shifts}
            columns={columns}
            showPagination={false}
            isLoading={isLoadingShifts}
            emptyState={
              <EmptyState
                icon={<Calendar className="h-12 w-12 text-gray-400" />}
                title="Nenhum plantão encontrado"
                description="Ajuste o período ou gere os plantões para esta escala."
                action={
                  canEdit ? (
                    <Button
                      onClick={handleGenerate}
                      size="sm"
                      variant="solid"
                      label="Gerar Plantões"
                      isLoading={generateShifts.isPending}
                      disabled={!shiftPadItem}
                    />
                  ) : undefined
                }
              />
            }
          />

          {shifts.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {shifts.length} plantão(ões) no período selecionado
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
