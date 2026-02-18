import { useState, useMemo, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Stethoscope, Pencil, Trash2, UserPlus, UserMinus, Search, FunnelX, Plus } from 'lucide-react';
import {
  Card,
  Button,
  DataTable,
  ListPagination,
  Modal,
  ModalFooter,
  Input,
  Select,
  SearchableSelect,
  Textarea,
  StatusBadge,
  EmptyState,
  IconButton,
} from '@/components/ui';
import {
  useEquipment,
  useCreateEquipment,
  useUpdateEquipment,
  useDeleteEquipment,
  useAssignEquipment,
} from '@/hooks/useEquipment';
import { usePatients } from '@/hooks/usePatients';
import { useListPageState } from '@/hooks/useListPageState';
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination';
import { useForm } from 'react-hook-form';
import type { Equipment } from '@/types/database';

interface EquipmentFormData {
  code: string;
  name: string;
  serial_number: string;
  patrimony_code: string;
  description: string;
  status: 'available' | 'in_use' | 'maintenance' | 'inactive';
}

const PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;

export default function EquipmentPage() {
  const [currentPage, setCurrentPage] = useListPageState();
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');

  const { data: equipment = [], isLoading } = useEquipment();
  const { data: patients = [] } = usePatients();
  const createEquipment = useCreateEquipment();
  const updateEquipment = useUpdateEquipment();
  const deleteEquipment = useDeleteEquipment();
  const assignEquipment = useAssignEquipment();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EquipmentFormData>();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchInput, setCurrentPage]);

  const hasActiveSearch = searchTerm.trim().length > 0;

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const openAddModal = () => {
    setSelectedEquipment(null);
    reset({
      code: '',
      name: '',
      serial_number: '',
      patrimony_code: '',
      description: '',
      status: 'available',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: Equipment) => {
    setSelectedEquipment(item);
    reset({
      code: item.code || '',
      name: item.name,
      serial_number: item.serial_number || '',
      patrimony_code: item.patrimony_code || '',
      description: item.description || '',
      status: item.status as EquipmentFormData['status'],
    });
    setIsModalOpen(true);
  };

  const openDeleteModal = (item: Equipment) => {
    setSelectedEquipment(item);
    setIsDeleteModalOpen(true);
  };

  const openAssignModal = (item: Equipment) => {
    setSelectedEquipment(item);
    setSelectedPatientId(item.assigned_patient_id || '');
    setIsAssignModalOpen(true);
  };

  const onSubmit = async (data: EquipmentFormData) => {
    const payload = {
      code: data.code || null,
      name: data.name,
      serial_number: data.serial_number || null,
      patrimony_code: data.patrimony_code || null,
      description: data.description || null,
      status: data.status,
    };

    if (selectedEquipment) {
      await updateEquipment.mutateAsync({
        id: selectedEquipment.id,
        ...payload,
      });
    } else {
      await createEquipment.mutateAsync(payload);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (selectedEquipment) {
      await deleteEquipment.mutateAsync(selectedEquipment.id);
      setIsDeleteModalOpen(false);
    }
  };

  const handleAssign = async () => {
    if (selectedEquipment && selectedPatientId) {
      await assignEquipment.mutateAsync({
        id: selectedEquipment.id,
        patientId: selectedPatientId,
      });
      setIsAssignModalOpen(false);
    }
  };

  const handleUnassign = async (item: Equipment) => {
    await assignEquipment.mutateAsync({ id: item.id, patientId: null });
  };

  const filteredEquipment = useMemo(() => {
    if (!searchTerm) return equipment;
    const term = searchTerm.toLowerCase();

    return equipment.filter((item) => {
      const haystack = [
        item.name,
        item.code,
        item.serial_number,
        item.patrimony_code,
        item.description,
        (item as any).patient?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [equipment, searchTerm]);

  const totalCount = filteredEquipment.length;
  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);
  const paginatedEquipment = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEquipment.slice(start, start + PAGE_SIZE);
  }, [filteredEquipment, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages, setCurrentPage]);

  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Equipamento',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Stethoscope className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{row.original.name}</p>
              {row.original.serial_number && (
                <p className="text-sm text-gray-500">S/N: {row.original.serial_number}</p>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Descrição',
        cell: ({ row }) => (
          <div>
            {row.original.description && (
              <p className="text-gray-700 dark:text-gray-300">{row.original.description}</p>
            )}
            {row.original.patrimony_code && (
              <p className="text-sm text-gray-500">Patrimônio: {row.original.patrimony_code}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'patient',
        header: 'Paciente',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {row.original.patient?.name || '-'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            {row.original.status === 'available' && (
              <IconButton
                variant="success"
                onClick={() => openAssignModal(row.original)}
                title="Atribuir a paciente"
              >
                <UserPlus className="h-4 w-4" />
              </IconButton>
            )}
            {row.original.status === 'in_use' && row.original.assigned_patient_id && (
              <IconButton
                variant="warning"
                onClick={() => handleUnassign(row.original)}
                title="Desatribuir"
              >
                <UserMinus className="h-4 w-4" />
              </IconButton>
            )}
            <IconButton onClick={() => openEditModal(row.original)}>
              <Pencil className="h-4 w-4" />
            </IconButton>
            <IconButton variant="danger" onClick={() => openDeleteModal(row.original)}>
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const statusOptions = [
    { value: 'available', label: 'Disponível' },
    { value: 'in_use', label: 'Em Uso' },
    { value: 'maintenance', label: 'Manutenção' },
    { value: 'inactive', label: 'Desativado' },
  ];

  const patientOptions = patients.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Equipamentos
          </h1>
        </div>
        <Button
          onClick={openAddModal}
          variant="solid"
          icon={<Plus className="h-4 w-4" />}
          label="Novo Equipamento"
        />
      </div>
      <Card padding="none">
        <div className="space-y-4 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[40%]">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar por nome, código, série, patrimônio ou paciente..."
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
            data={paginatedEquipment}
            columns={columns}
            showPagination={false}
            isLoading={isLoading}
            emptyState={
              <EmptyState
                icon={<Stethoscope className="h-12 w-12 text-gray-400" />}
                title={searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum equipamento cadastrado'}
                description={
                  searchTerm
                    ? 'Tente uma busca diferente'
                    : 'Cadastre equipamentos para controlar uso pelos pacientes'
                }
                action={
                  !searchTerm && (
                    <Button
                      onClick={openAddModal}
                      size="sm"
                      variant="solid"
                      label="Cadastrar Equipamento"
                    />
                  )
                }
              />
            }
          />
          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            itemLabel="equipamentos"
            onPreviousPage={() => setCurrentPage((page) => page - 1)}
            onNextPage={() => setCurrentPage((page) => page + 1)}
            isLoading={isLoading}
          />
        </div>
      </Card>
      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedEquipment ? 'Editar Equipamento' : 'Novo Equipamento'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Código" placeholder="Código do sistema externo" {...register('code')} />
            <Input
              label="Nome do Equipamento"
              placeholder="Ex: Concentrador de O2, CPAP, BiPAP..."
              {...register('name', { required: 'Nome é obrigatório' })}
              error={errors.name?.message}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Número de Série"
              placeholder="S/N do equipamento"
              {...register('serial_number')}
            />
            <Select
              label="Status"
              options={statusOptions}
              {...register('status', { required: true })}
              required
            />
          </div>

          <Input
            label="Código de Patrimônio"
            placeholder="Código de patrimônio"
            {...register('patrimony_code')}
          />

          <Textarea
            label="Descrição"
            placeholder="Descrição do equipamento..."
            {...register('description')}
          />

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              showIcon={false}
              onClick={() => setIsModalOpen(false)}
              label="Cancelar"
            />
            <Button
              type="submit"
              variant="solid"
              showIcon={false}
              disabled={createEquipment.isPending || updateEquipment.isPending}
              label={selectedEquipment ? 'Salvar' : 'Criar'}
            />
          </ModalFooter>
        </form>
      </Modal>
      {/* Assign Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Atribuir Equipamento"
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
            <p className="font-medium text-gray-900 dark:text-white">{selectedEquipment?.name}</p>
            {selectedEquipment?.serial_number && (
              <p className="text-sm text-gray-500">S/N: {selectedEquipment.serial_number}</p>
            )}
          </div>

          <SearchableSelect
            label="Paciente"
            options={patientOptions}
            placeholder="Selecione um paciente..."
            searchPlaceholder="Buscar paciente..."
            value={selectedPatientId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSelectedPatientId(e.target.value)
            }
            required
          />

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              showIcon={false}
              onClick={() => setIsAssignModalOpen(false)}
              label="Cancelar"
            />
            <Button
              type="button"
              onClick={handleAssign}
              isLoading={assignEquipment.isPending}
              disabled={!selectedPatientId}
            >
              <UserPlus className="h-5 w-5" />
              Atribuir
            </Button>
          </ModalFooter>
        </div>
      </Modal>
      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Excluir Equipamento"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-400">
          Tem certeza que deseja excluir o equipamento <strong>{selectedEquipment?.name}</strong>?
          Esta ação não pode ser desfeita.
        </p>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            showIcon={false}
            onClick={() => setIsDeleteModalOpen(false)}
            label="Cancelar"
          />
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            isLoading={deleteEquipment.isPending}
          >
            Excluir
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
