import { useState, useMemo, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Beaker, Download, Search, FunnelX } from 'lucide-react';
import {
  Card,
  Button,
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
  useActiveIngredientsPaginated,
  useCreateActiveIngredient,
  useUpdateActiveIngredient,
} from '@/hooks/useActiveIngredients';
import { useListPageState } from '@/hooks/useListPageState';
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination';
import { useForm } from 'react-hook-form';
import type { ActiveIngredient } from '@/types/database';
import { ImportActiveIngredientsFromCmedModal } from '@/components/catalog/ImportActiveIngredientsFromCmedModal';

interface ActiveIngredientFormData {
  code: string;
  name: string;
  cas_number: string;
  therapeutic_class: string;
  description: string;
  active: boolean;
}

const PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;

export default function ActiveIngredientsPage() {
  const [currentPage, setCurrentPage] = useListPageState();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data: paginatedData, isLoading } = useActiveIngredientsPaginated(
    currentPage,
    PAGE_SIZE,
    searchTerm
  );

  const ingredients = paginatedData?.data ?? [];
  const totalCount = paginatedData?.totalCount ?? 0;
  const totalPages = paginatedData?.totalPages ?? 1;

  const createIngredient = useCreateActiveIngredient();
  const updateIngredient = useUpdateActiveIngredient();

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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<ActiveIngredient | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ActiveIngredientFormData>();

  const { name: activeName, ref: activeRef, onBlur: activeOnBlur } = register('active');
  const activeValue = watch('active');

  const openCreateModal = () => {
    setSelectedIngredient(null);
    reset({
      code: '',
      name: '',
      cas_number: '',
      therapeutic_class: '',
      description: '',
      active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (ingredient: ActiveIngredient) => {
    setSelectedIngredient(ingredient);
    reset({
      code: ingredient.code || '',
      name: ingredient.name,
      cas_number: ingredient.cas_number || '',
      therapeutic_class: ingredient.therapeutic_class || '',
      description: ingredient.description || '',
      active: ingredient.active ?? true,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: ActiveIngredientFormData) => {
    const payload = {
      ...data,
      code: data.code || null,
      cas_number: data.cas_number || null,
      therapeutic_class: data.therapeutic_class || null,
      description: data.description || null,
    };

    if (selectedIngredient) {
      await updateIngredient.mutateAsync({
        id: selectedIngredient.id,
        ...payload,
      });
    } else {
      await createIngredient.mutateAsync(payload);
    }
    setIsModalOpen(false);
  };

  const columns: ColumnDef<ActiveIngredient>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Nome',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Beaker className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{row.original.name}</p>
              {row.original.cas_number && (
                <p className="text-sm text-gray-500">CAS: {row.original.cas_number}</p>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'therapeutic_class',
        header: 'Classe Terapêutica',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {row.original.therapeutic_class || '-'}
          </span>
        ),
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
    []
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Princípios Ativos
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setIsImportModalOpen(true)}>
            <Download className="h-5 w-5" />
            Importar do CMED
          </Button>
          <Button onClick={openCreateModal} variant="solid" label="Novo Princípio Ativo" />
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
                placeholder="Buscar por nome, classe ou CAS..."
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
            data={ingredients}
            columns={columns}
            showPagination={false}
            isLoading={isLoading}
            onRowClick={openEditModal}
            emptyState={
              <EmptyState
                title={
                  searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum princípio ativo cadastrado'
                }
                description={
                  searchTerm
                    ? 'Tente uma busca diferente'
                    : 'Comece cadastrando seu primeiro princípio ativo'
                }
                action={
                  !searchTerm && (
                    <Button
                      onClick={openCreateModal}
                      size="sm"
                      variant="solid"
                      label="Cadastrar Princípio Ativo"
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
        title={selectedIngredient ? 'Editar Princípio Ativo' : 'Novo Princípio Ativo'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Código Externo"
              placeholder="Código do sistema externo (DCB, etc.)"
              {...register('code')}
            />
            <Input
              label="Nome"
              placeholder="Ex: Captopril, Dipirona, Omeprazol"
              {...register('name', { required: 'Nome é obrigatório' })}
              error={errors.name?.message}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Número CAS" placeholder="Ex: 62571-86-2" {...register('cas_number')} />
            <Input
              label="Classe Terapêutica"
              placeholder="Ex: Anti-hipertensivo, Analgésico"
              {...register('therapeutic_class')}
            />
          </div>

          <Textarea
            label="Descrição"
            placeholder="Descrição ou observações adicionais..."
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
              label={selectedIngredient ? 'Salvar Alterações' : 'Cadastrar'}
            />
          </ModalFooter>
        </form>
      </Modal>

      {/* Import from CMED Modal */}
      <ImportActiveIngredientsFromCmedModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
}
