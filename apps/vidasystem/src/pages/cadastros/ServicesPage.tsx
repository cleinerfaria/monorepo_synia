import { useState, useMemo, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Search, FunnelX, Plus, Check, X, Stethoscope } from 'lucide-react';
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
  useServicesPaginated,
  useCreateService,
  useUpdateService,
  type Service,
} from '@/hooks/useServices';
import { useListPageState } from '@/hooks/useListPageState';
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination';
import { useForm } from 'react-hook-form';

interface ServiceFormData {
  code: string;
  name: string;
  description: string;
  sort_order: number;
  active: boolean;
}

const PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;

export default function ServicesPage() {
  const [currentPage, setCurrentPage] = useListPageState();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data: paginatedData, isLoading } = useServicesPaginated(currentPage, PAGE_SIZE, searchTerm);

  const services = paginatedData?.data ?? [];
  const totalCount = paginatedData?.totalCount ?? 0;
  const totalPages = paginatedData?.totalPages ?? 1;

  const createService = useCreateService();
  const updateService = useUpdateService();

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
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ServiceFormData>({
    defaultValues: {
      code: '',
      name: '',
      description: '',
      sort_order: 0,
      active: true,
    },
  });

  const { name: activeName, ref: activeRef, onBlur: activeOnBlur } = register('active');
  const activeValue = watch('active');

  const openCreateModal = () => {
    setSelectedService(null);
    reset({
      code: '',
      name: '',
      description: '',
      sort_order: 0,
      active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (service: Service) => {
    setSelectedService(service);
    reset({
      code: service.code || '',
      name: service.name || '',
      description: service.description || '',
      sort_order: service.sort_order ?? 0,
      active: service.active ?? true,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: ServiceFormData) => {
    const payload = {
      code: data.code.trim(),
      name: data.name.trim(),
      description: data.description || null,
      sort_order: data.sort_order,
      active: data.active,
    };

    if (selectedService) {
      await updateService.mutateAsync({
        id: selectedService.id,
        ...payload,
      });
    } else {
      await createService.mutateAsync(payload);
    }

    setIsModalOpen(false);
  };

  const columns: ColumnDef<Service>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Nome',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Stethoscope className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{row.original.name}</p>
            </div>
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
        accessorKey: 'sort_order',
        header: 'Ordem',
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Serviços
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={openCreateModal}
            variant="solid"
            icon={<Plus className="h-4 w-4" />}
            label="Novo Serviço"
          />
        </div>
      </div>

      <Card padding="none">
        <div className="space-y-4 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[30%]">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar por nome, código ou descrição..."
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
            data={services}
            columns={columns}
            showPagination={false}
            isLoading={isLoading}
            onRowClick={openEditModal}
            emptyState={
              <EmptyState
                title={searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum serviço cadastrado'}
                description={
                  searchTerm ? 'Tente uma busca diferente' : 'Comece cadastrando seu primeiro serviço'
                }
                action={
                  !searchTerm && (
                    <Button
                      onClick={openCreateModal}
                      size="sm"
                      variant="solid"
                      label="Cadastrar Serviço"
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedService ? 'Editar Serviço' : 'Novo Serviço'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Código"
              placeholder="internacao_domiciliar"
              {...register('code', {
                required: 'Código é obrigatório',
                validate: (value) => value.trim().length > 0 || 'Código é obrigatório',
              })}
              error={errors.code?.message}
              required
            />
            <Input
              label="Nome"
              placeholder="Internação Domiciliar"
              {...register('name', {
                required: 'Nome é obrigatório',
                validate: (value) => value.trim().length > 0 || 'Nome é obrigatório',
              })}
              error={errors.name?.message}
              required
            />
          </div>

          <Textarea label="Descrição" rows={3} {...register('description')} />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Ordem"
              type="number"
              min={0}
              {...register('sort_order', {
                required: 'Ordem é obrigatória',
                valueAsNumber: true,
                min: { value: 0, message: 'Ordem deve ser maior ou igual a zero' },
              })}
              error={errors.sort_order?.message}
              required
            />
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
                label={selectedService ? 'Salvar Alterações' : 'Cadastrar'}
              />
            </div>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
