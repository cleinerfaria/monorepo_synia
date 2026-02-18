import { useState, useMemo, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, ClipboardList, Search, FunnelX, Plus } from 'lucide-react';
import {
  Card,
  Button,
  DataTable,
  ListPagination,
  Modal,
  ModalFooter,
  Input,
  Textarea,
  Badge,
  EmptyState,
  SwitchNew,
  Select,
  IconButton,
} from '@/components/ui';
import {
  useProceduresPaginated,
  useCreateProcedure,
  useUpdateProcedure,
} from '@/hooks/useProcedures';
import { useUnitsOfMeasure } from '@/hooks/useUnitsOfMeasure';
import { useListPageState } from '@/hooks/useListPageState';
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination';
import { useForm } from 'react-hook-form';
import type { Procedure } from '@/types/database';

interface ProcedureFormData {
  code: string;
  name: string;
  category: 'visit' | 'care' | 'therapy' | 'administration' | 'evaluation';
  unit_id: string;
  description: string;
  active: boolean;
}

const PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;

const PROCEDURE_CATEGORIES = [
  { value: 'visit', label: 'Visita' },
  { value: 'care', label: 'Cuidado' },
  { value: 'therapy', label: 'Terapia' },
  { value: 'administration', label: 'Administração' },
  { value: 'evaluation', label: 'Avaliação' },
] as const;

const getCategoryLabel = (category: string) => {
  const found = PROCEDURE_CATEGORIES.find((cat) => cat.value === category);
  return found?.label || category;
};

const getCategoryColor = (category: string): 'info' | 'success' | 'warning' | 'danger' | 'gold' => {
  switch (category) {
    case 'visit':
      return 'info';
    case 'care':
      return 'success';
    case 'therapy':
      return 'warning';
    case 'administration':
      return 'gold';
    case 'evaluation':
      return 'danger';
    default:
      return 'info';
  }
};

export default function ProceduresPage() {
  const [currentPage, setCurrentPage] = useListPageState();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data: paginatedData, isLoading } = useProceduresPaginated(
    currentPage,
    PAGE_SIZE,
    searchTerm
  );

  const procedures = paginatedData?.data ?? [];
  const totalCount = paginatedData?.totalCount ?? 0;
  const totalPages = paginatedData?.totalPages ?? 1;

  const { data: unitsOfMeasure } = useUnitsOfMeasure();

  const createProcedure = useCreateProcedure();
  const updateProcedure = useUpdateProcedure();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setCurrentPage(1);
      setSearchTerm(searchInput);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchInput, setCurrentPage]);

  const hasActiveSearch = searchTerm.trim().length > 0;

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProcedureFormData>();

  const { name: activeName, ref: activeRef, onBlur: activeOnBlur } = register('active');
  const activeValue = watch('active');

  const openCreateModal = () => {
    setSelectedProcedure(null);
    reset({
      code: '',
      name: '',
      category: 'visit',
      description: '',
      active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (procedure: Procedure) => {
    setSelectedProcedure(procedure);
    reset({
      code: procedure.code || '',
      name: procedure.name,
      category: procedure.category,
      unit_id: procedure.unit_id || undefined,
      description: procedure.description || '',
      active: procedure.active ?? true,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: ProcedureFormData) => {
    const payload = {
      ...data,
      code: data.code || null,
      unit_id: data.unit_id || null,
      description: data.description || null,
    };

    if (selectedProcedure) {
      await updateProcedure.mutateAsync({
        id: selectedProcedure.id,
        ...payload,
      });
    } else {
      await createProcedure.mutateAsync(payload);
    }
    setIsModalOpen(false);
  };

  const columns: ColumnDef<Procedure>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Nome',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{row.original.name}</p>
              {row.original.code && (
                <p className="text-sm text-gray-500">Código: {row.original.code}</p>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Categoria',
        cell: ({ row }) => (
          <Badge variant={getCategoryColor(row.original.category)}>
            {getCategoryLabel(row.original.category)}
          </Badge>
        ),
      },
      {
        accessorKey: 'unit_id',
        header: 'Unidade',
        cell: ({ row }) => {
          if (!row.original.unit_id) return <span className="text-gray-500">-</span>;

          const unit = unitsOfMeasure?.find((u) => u.id === row.original.unit_id);
          return (
            <span className="text-gray-700 dark:text-gray-300">
              {unit ? `${unit.name} (${unit.symbol})` : row.original.unit_id}
            </span>
          );
        },
      },
      {
        accessorKey: 'active',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={row.original.active ? 'success' : 'neutral'}>
            {row.original.active ? 'Ativo' : 'Inativo'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(row.original);
              }}
            >
              <Pencil className="h-4 w-4" />
            </IconButton>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unitsOfMeasure]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Procedimentos
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={openCreateModal}
            variant="solid"
            icon={<Plus className="h-4 w-4" />}
            label="Novo Procedimento"
          />
        </div>
      </div>

      {/* Table */}
      <Card padding="none">
        <div className="space-y-4 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[30%]">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar por nome, código ou categoria..."
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
            data={procedures}
            columns={columns}
            showPagination={false}
            isLoading={isLoading}
            onRowClick={openEditModal}
            emptyState={
              <EmptyState
                title={
                  searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum procedimento cadastrado'
                }
                description={
                  searchTerm
                    ? 'Tente uma busca diferente'
                    : 'Comece cadastrando seu primeiro procedimento'
                }
                action={
                  !searchTerm && (
                    <Button
                      onClick={openCreateModal}
                      size="sm"
                      variant="solid"
                      label="Cadastrar Procedimento"
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
            itemLabel="registros"
            onPreviousPage={() => setCurrentPage((page) => page - 1)}
            onNextPage={() => setCurrentPage((page) => page + 1)}
          />
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedProcedure ? 'Editar Procedimento' : 'Novo Procedimento'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Código" placeholder="Código do procedimento" {...register('code')} />
            <Input
              label="Nome"
              placeholder="Ex: Consulta Médica, Curativo, Fisioterapia"
              {...register('name', { required: 'Nome é obrigatório' })}
              error={errors.name?.message}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label="Categoria"
              placeholder="Selecione a categoria"
              options={PROCEDURE_CATEGORIES.map((cat) => ({ value: cat.value, label: cat.label }))}
              {...register('category', { required: 'Categoria é obrigatória' })}
              error={errors.category?.message}
              required
            />
            <Select
              label="Unidade de Medida"
              placeholder="Selecione a unidade"
              options={
                unitsOfMeasure?.map((unit) => ({
                  value: unit.id,
                  label: `${unit.name} (${unit.symbol})`,
                })) || []
              }
              {...register('unit_id', { required: 'Unidade de medida é obrigatória' })}
              error={errors.unit_id?.message}
              required
            />
          </div>

          <Textarea
            label="Descrição"
            placeholder="Descrição ou observações adicionais sobre o procedimento..."
            rows={3}
            {...register('description')}
          />

          <SwitchNew
            label="Status"
            showStatus
            name={activeName}
            ref={activeRef}
            onBlur={activeOnBlur}
            checked={!!activeValue}
            onChange={(e) => {
              setValue('active', e.target.checked, { shouldDirty: true });
            }}
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
              label={selectedProcedure ? 'Salvar Alterações' : 'Cadastrar'}
            />
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
