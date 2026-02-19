import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Eye, Power, Calendar, Search, FunnelX, Plus } from 'lucide-react';
import {
  Card,
  Button,
  DataTable,
  ListPagination,
  Modal,
  ModalFooter,
  Badge,
  EmptyState,
  IconButton,
} from '@/components/ui';
import { usePatientDemands, useUpdateDemand, type PadWithPatient } from '@/hooks/usePatientDemands';
import { useListPageState } from '@/hooks/useListPageState';
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination';
import { useAuthStore } from '@/stores/authStore';
import { useHasPermission } from '@/hooks/useAccessProfiles';
import { format, parseISO } from 'date-fns';

const formatTime = (time: string) => {
  return time.slice(0, 5);
};

const filterPads = (demands: PadWithPatient[], search: string) => {
  if (!search.trim()) return demands;
  const query = search.toLowerCase();
  return demands.filter((d) => {
    return d.patient?.name?.toLowerCase().includes(query);
  });
};

const PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;

export default function PadPage() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useListPageState();
  const { data: demands = [], isLoading } = usePatientDemands();
  const updateDemand = useUpdateDemand();
  const { appUser } = useAuthStore();
  const { hasPermission } = useHasPermission('prescriptions', 'edit');

  const canEdit = hasPermission || appUser?.access_profile?.is_admin === true;

  const [isToggleModalOpen, setIsToggleModalOpen] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState<PadWithPatient | null>(null);
  const [searchInput, setSearchInput] = useState('');

  const filteredData = useMemo(() => filterPads(demands, searchInput), [demands, searchInput]);
  const totalCount = filteredData.length;
  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);
  const paginatedDemands = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, currentPage]);

  const hasActiveSearch = searchInput.trim().length > 0;

  const handleClearSearch = () => {
    setSearchInput('');
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchInput, setCurrentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages, setCurrentPage]);

  const openToggleModal = useCallback((demand: PadWithPatient) => {
    setSelectedDemand(demand);
    setIsToggleModalOpen(true);
  }, []);

  const handleToggleActive = async () => {
    if (selectedDemand) {
      await updateDemand.mutateAsync({
        id: selectedDemand.id,
        is_active: !selectedDemand.is_active,
      });
      setIsToggleModalOpen(false);
    }
  };

  const columns: ColumnDef<PadWithPatient>[] = useMemo(
    () => [
      {
        accessorKey: 'patient.name',
        header: 'Paciente',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="truncate font-medium text-gray-900 dark:text-white">
              {row.original.patient?.name}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'start_date',
        header: 'Início',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {format(parseISO(row.original.start_date), 'dd/MM/yyyy')}
          </span>
        ),
      },
      {
        accessorKey: 'end_date',
        header: 'Término',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {row.original.end_date ? format(parseISO(row.original.end_date), 'dd/MM/yyyy') : '-'}
          </span>
        ),
      },
      {
        accessorKey: 'start_time',
        header: 'Horário',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {formatTime(row.original.start_time)}
          </span>
        ),
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? 'success' : 'neutral'}>
            {row.original.is_active ? 'Ativo' : 'Inativo'}
          </Badge>
        ),
      },
      ...(canEdit
        ? [
            {
              id: 'actions',
              header: '',
              cell: ({ row }: { row: { original: PadWithPatient } }) => (
                <div className="flex items-center justify-end gap-2">
                  <IconButton
                    title="Editar"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      navigate(`/prontuario/pad/${row.original.id}`);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    title="Ver plantões"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      navigate(`/prontuario/pad/${row.original.id}/plantoes`);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    title={row.original.is_active ? 'Desativar' : 'Ativar'}
                    variant={row.original.is_active ? 'danger' : 'default'}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      openToggleModal(row.original);
                    }}
                  >
                    <Power className="h-4 w-4" />
                  </IconButton>
                </div>
              ),
            } as ColumnDef<PadWithPatient>,
          ]
        : []),
    ],
    [canEdit, navigate, openToggleModal]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Plano de Atendimento Domiciliar (PAD)
          </h1>
        </div>
        {canEdit && (
          <Button
            onClick={() => navigate('/prontuario/pad/novo')}
            variant="solid"
            icon={<Plus className="h-4 w-4" />}
            label="Novo PAD"
          />
        )}
      </div>

      {/* Table */}
      <Card padding="none">
        <div className="space-y-4 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[30%]">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por paciente..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            {hasActiveSearch && (
              <Button
                onClick={handleClearSearch}
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
          <DataTable
            data={paginatedDemands}
            columns={columns}
            showPagination={false}
            isLoading={isLoading}
            onRowClick={canEdit ? (row) => navigate(`/prontuario/pad/${row.id}`) : undefined}
            emptyState={
              <EmptyState
                icon={<Calendar className="h-12 w-12 text-gray-400" />}
                title="Nenhum PAD cadastrado"
                description="Crie o primeiro Plano de Atendimento Domiciliar (PAD)"
                action={
                  canEdit ? (
                    <Button
                      onClick={() => navigate('/prontuario/pad/novo')}
                      size="sm"
                      variant="solid"
                      icon={<Plus className="h-4 w-4" />}
                      label="Novo PAD"
                    />
                  ) : undefined
                }
              />
            }
          />
          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            itemLabel="PADs"
            onPreviousPage={() => setCurrentPage((page) => page - 1)}
            onNextPage={() => setCurrentPage((page) => page + 1)}
            isLoading={isLoading}
          />
        </div>
      </Card>

      {/* Toggle Active Modal */}
      <Modal
        isOpen={isToggleModalOpen}
        onClose={() => setIsToggleModalOpen(false)}
        title={selectedDemand?.is_active ? 'Desativar PAD' : 'Ativar PAD'}
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-400">
          Tem certeza que deseja {selectedDemand?.is_active ? 'desativar' : 'ativar'} o PAD do
          paciente{' '}
          <strong className="text-gray-900 dark:text-white">{selectedDemand?.patient?.name}</strong>
          ?
        </p>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            showIcon={false}
            onClick={() => setIsToggleModalOpen(false)}
            label="Cancelar"
          />
          <Button
            type="button"
            variant={selectedDemand?.is_active ? 'danger' : 'solid'}
            onClick={handleToggleActive}
            isLoading={updateDemand.isPending}
          >
            {selectedDemand?.is_active ? 'Desativar' : 'Ativar'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
