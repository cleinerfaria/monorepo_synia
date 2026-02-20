import { useState, useMemo, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, SlidersHorizontal, Search, FunnelX, Plus, Check, X } from 'lucide-react';
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
  IconButton,
} from '@/components/ui';
import {
  useUnitsOfMeasurePaginated,
  useCreateUnitOfMeasure,
  useUpdateUnitOfMeasure,
} from '@/hooks/useUnitsOfMeasure';
import { useListPageState } from '@/hooks/useListPageState';
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination';
import { useForm } from 'react-hook-form';
import type { UnitOfMeasure, UnitScope } from '@/hooks/useUnitsOfMeasure';

interface UnitOfMeasureFormData {
  code: string;
  name: string;
  symbol: string;
  description: string;
  allowed_scopes: UnitScope[];
  active: boolean;
}

const PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;

const UNIT_SCOPE_OPTIONS: Array<{
  value: UnitScope;
  label: string;
  description: string;
}> = [
  {
    value: 'medication_base',
    label: 'Medicamento (Base)',
    description: 'Usada em estoque de medicamentos',
  },
  {
    value: 'medication_prescription',
    label: 'Medicamento (Prescricao)',
    description: 'Usada em prescricao de medicamentos',
  },
  {
    value: 'material_base',
    label: 'Material (Base)',
    description: 'Usada em estoque de materiais',
  },
  {
    value: 'material_prescription',
    label: 'Material (Prescricao)',
    description: 'Usada em prescricao de materiais',
  },
  {
    value: 'diet_base',
    label: 'Dieta (Base)',
    description: 'Usada em estoque de dietas',
  },
  {
    value: 'diet_prescription',
    label: 'Dieta (Prescricao)',
    description: 'Usada em prescricao de dietas',
  },
  {
    value: 'prescription_frequency',
    label: 'Frequencia de Prescricao',
    description: 'Usada em frequencia de prescricao',
  },
  {
    value: 'procedure',
    label: 'Procedimento',
    description: 'Usada em procedimentos',
  },
  {
    value: 'equipment',
    label: 'Equipamento',
    description: 'Usada em equipamentos',
  },
  {
    value: 'scale',
    label: 'Escala',
    description: 'Usada em escala/plantao',
  },
];

export default function UnitsOfMeasurePage() {
  const [currentPage, setCurrentPage] = useListPageState();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data: paginatedData, isLoading } = useUnitsOfMeasurePaginated(
    currentPage,
    PAGE_SIZE,
    searchTerm
  );

  const units = paginatedData?.data ?? [];
  const totalCount = paginatedData?.totalCount ?? 0;
  const totalPages = paginatedData?.totalPages ?? 1;

  const createUnit = useCreateUnitOfMeasure();
  const updateUnit = useUpdateUnitOfMeasure();

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
  const [selectedUnit, setSelectedUnit] = useState<UnitOfMeasure | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UnitOfMeasureFormData>();

  const { name: activeName, ref: activeRef, onBlur: activeOnBlur } = register('active');
  const activeValue = watch('active');
  const allowedScopes = watch('allowed_scopes') || [];

  useEffect(() => {
    register('allowed_scopes');
  }, [register]);

  const openCreateModal = () => {
    setSelectedUnit(null);
    reset({
      code: '',
      name: '',
      symbol: '',
      description: '',
      allowed_scopes: [],
      active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (unit: UnitOfMeasure) => {
    setSelectedUnit(unit);
    reset({
      code: unit.code || '',
      name: unit.name,
      symbol: unit.symbol || '',
      description: unit.description || '',
      allowed_scopes: unit.allowed_scopes || [],
      active: unit.active ?? true,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: UnitOfMeasureFormData) => {
    const payload = {
      ...data,
      description: data.description || null,
      allowed_scopes: data.allowed_scopes || [],
    };

    if (selectedUnit) {
      await updateUnit.mutateAsync({
        id: selectedUnit.id,
        ...payload,
      });
    } else {
      await createUnit.mutateAsync(payload);
    }
    setIsModalOpen(false);
  };

  const columns: ColumnDef<UnitOfMeasure>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Nome',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <SlidersHorizontal className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="font-medium text-gray-900 dark:text-white">{row.original.name}</p>
          </div>
        ),
      },
      {
        accessorKey: 'code',
        header: 'Código',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">{row.original.code || '-'}</span>
        ),
      },
      {
        accessorKey: 'symbol',
        header: 'Símbolo',
        cell: ({ row }) => <Badge variant="info">{row.original.symbol}</Badge>,
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
              title="Editar unidade"
            >
              <Pencil className="h-4 w-4" />
            </IconButton>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Unidades de Medida
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={openCreateModal}
            variant="solid"
            icon={<Plus className="h-4 w-4" />}
            label="Nova Unidade"
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
                placeholder="Buscar por nome, código ou símbolo..."
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
            data={units}
            columns={columns}
            showPagination={false}
            isLoading={isLoading}
            onRowClick={(unit) => openEditModal(unit)}
            emptyState={
              <EmptyState
                title={searchTerm ? 'Nenhum resultado encontrado' : 'Nenhuma unidade cadastrada'}
                description={
                  searchTerm
                    ? 'Tente uma busca diferente'
                    : 'Comece cadastrando sua primeira unidade de medida'
                }
                action={
                  !searchTerm && (
                    <Button
                      onClick={openCreateModal}
                      size="sm"
                      variant="solid"
                      label="Cadastrar Unidade"
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
        title={selectedUnit ? 'Editar Unidade de Medida' : 'Nova Unidade de Medida'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="md:col-span-1">
              <Input
                label="Código"
                placeholder="Ex: KG, MG, ML, UN"
                {...register('code', { required: 'Código é obrigatório' })}
                error={errors.code?.message}
                required
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Nome"
                placeholder="Ex: Quilograma, Miligrama, Mililitro"
                {...register('name', { required: 'Nome é obrigatório' })}
                error={errors.name?.message}
                required
              />
            </div>
            <div className="md:col-span-1">
              <Input
                label="Símbolo"
                placeholder="Ex: kg, mg, ml, un"
                {...register('symbol', { required: 'Símbolo é obrigatório' })}
                error={errors.symbol?.message}
                required
              />
            </div>
          </div>

          <Textarea
            label="Descrição"
            placeholder="Descrição ou observações adicionais..."
            rows={1}
            {...register('description')}
          />

          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Escopos permitidos
              </label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setValue(
                      'allowed_scopes',
                      UNIT_SCOPE_OPTIONS.map((option) => option.value),
                      { shouldDirty: true }
                    );
                  }}
                >
                  Selecionar todos
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setValue('allowed_scopes', [], { shouldDirty: true });
                  }}
                >
                  Limpar
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {UNIT_SCOPE_OPTIONS.map((option) => {
                const isChecked = allowedScopes.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 p-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        const nextScopes = isChecked
                          ? allowedScopes.filter((scope) => scope !== option.value)
                          : [...allowedScopes, option.value];
                        setValue('allowed_scopes', nextScopes, { shouldDirty: true });
                      }}
                      className="text-primary-600 focus:ring-primary-500 mt-0.5 h-4 w-4 rounded border-gray-300"
                    />
                    <span className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {option.label}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {option.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <ModalFooter className="mt-4 !justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
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
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="neutral"
                icon={<X className="h-4 w-4" />}
                onClick={() => setIsModalOpen(false)}
                label="Cancelar"
              />
              <Button
                type="submit"
                variant="solid"
                icon={<Check className="h-4 w-4" />}
                disabled={createUnit.isPending || updateUnit.isPending}
                label={selectedUnit ? 'Salvar Alterações' : 'Cadastrar'}
              />
            </div>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
