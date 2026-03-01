import { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Route, Search, FunnelX, Plus, Check, X } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  DataTable,
  ListPagination,
  EmptyState,
  Input,
  Modal,
  ModalFooter,
  SwitchNew,
  Textarea,
  IconButton,
} from '@/components/ui';
import {
  useAdministrationRoutes,
  useCreateAdministrationRoute,
  useUpdateAdministrationRoute,
} from '@/hooks/useAdministrationRoutes';
import { useListPageState } from '@/hooks/useListPageState';
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination';
import { useForm } from 'react-hook-form';
import type { Tables } from '@/types/database';

type AdministrationRoute = Tables<'administration_routes'>;

interface AdministrationRouteFormData {
  code: string;
  name: string;
  abbreviation: string;
  description: string;
  prescription_order: number;
  active: boolean;
}

const PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;

export default function AdministrationRoutesPage() {
  const { data: routes = [], isLoading } = useAdministrationRoutes();
  const createRoute = useCreateAdministrationRoute();
  const updateRoute = useUpdateAdministrationRoute();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useListPageState();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<AdministrationRoute | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AdministrationRouteFormData>();

  const { name: activeName, ref: activeRef, onBlur: activeOnBlur } = register('active');
  const activeValue = watch('active');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchInput, setCurrentPage]);

  const sortedRoutes = useMemo(() => {
    return [...routes].sort((a, b) =>
      String(a.name ?? '').localeCompare(String(b.name ?? ''), 'pt-BR', { sensitivity: 'base' })
    );
  }, [routes]);

  const filteredRoutes = useMemo(() => {
    if (!searchTerm) return sortedRoutes;

    const normalizedSearch = searchTerm.toLowerCase();
    return sortedRoutes.filter((route) =>
      [route.name, route.abbreviation, route.description].some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(normalizedSearch)
      )
    );
  }, [sortedRoutes, searchTerm]);

  const hasActiveSearch = searchTerm.trim().length > 0;

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const totalCount = filteredRoutes.length;
  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);
  const paginatedRoutes = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRoutes.slice(start, start + PAGE_SIZE);
  }, [filteredRoutes, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages, setCurrentPage]);

  const openCreateModal = () => {
    setSelectedRoute(null);
    reset({
      code: '',
      name: '',
      abbreviation: '',
      description: '',
      prescription_order: 999,
      active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (route: AdministrationRoute) => {
    setSelectedRoute(route);
    reset({
      code: route.code || '',
      name: route.name,
      abbreviation: route.abbreviation || '',
      description: route.description || '',
      prescription_order: route.prescription_order ?? 999,
      active: route.active ?? true,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: AdministrationRouteFormData) => {
    const payload = {
      code: data.code || null,
      name: data.name,
      abbreviation: data.abbreviation || null,
      description: data.description || null,
      prescription_order: data.prescription_order,
      active: data.active,
    };

    if (selectedRoute) {
      await updateRoute.mutateAsync({
        id: selectedRoute.id,
        ...payload,
      });
    } else {
      await createRoute.mutateAsync(payload);
    }
    setIsModalOpen(false);
  };

  const columns: ColumnDef<AdministrationRoute>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Via',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <Route className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{row.original.name}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'abbreviation',
        header: 'Abreviação',
        cell: ({ row }) =>
          row.original.abbreviation ? (
            <Badge variant="info">{row.original.abbreviation}</Badge>
          ) : (
            <span className="text-gray-500">-</span>
          ),
      },
      {
        accessorKey: 'prescription_order',
        header: 'Ordem de Prescrição',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {row.original.prescription_order || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Descrição',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {row.original.description || '-'}
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
              title="Editar via"
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
            Vias de Administração
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={openCreateModal}
            variant="solid"
            icon={<Plus className="h-4 w-4" />}
            label="Nova Via"
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
                placeholder="Buscar por nome, abreviação ou descrição..."
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
            data={paginatedRoutes}
            columns={columns}
            showPagination={false}
            isLoading={isLoading}
            onRowClick={openEditModal}
            emptyState={
              <EmptyState
                icon={<Route className="h-12 w-12 text-gray-400" />}
                title={searchTerm ? 'Nenhum resultado encontrado' : 'Nenhuma via cadastrada'}
                description={
                  searchTerm
                    ? 'Tente uma busca diferente'
                    : 'Cadastre as vias de administração usadas nas prescrições'
                }
                action={
                  !searchTerm && (
                    <Button
                      onClick={openCreateModal}
                      size="sm"
                      variant="solid"
                      label="Cadastrar Via"
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
            itemLabel="vias"
            onPreviousPage={() => setCurrentPage((page) => page - 1)}
            onNextPage={() => setCurrentPage((page) => page + 1)}
            isLoading={isLoading}
          />
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedRoute ? 'Editar Via de Administração' : 'Nova Via de Administração'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Código" placeholder="Ex: vo, iv, sc" {...register('code')} />
            <Input
              label="Nome"
              placeholder="Ex: Oral, Intravenosa, Subcutânea"
              {...register('name', { required: 'Nome é obrigatório' })}
              error={errors.name?.message}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Abreviação" placeholder="Ex: VO, IV, SC" {...register('abbreviation')} />
          </div>

          <Input
            label="Ordem de Prescrição"
            placeholder="Digite um número (menor = aparece primeiro)"
            type="number"
            {...register('prescription_order', {
              required: 'Ordem é obrigatória',
              min: { value: 0, message: 'Deve ser um número positivo' },
              valueAsNumber: true,
            })}
            error={errors.prescription_order?.message}
            required
          />

          <Textarea
            label="Descrição"
            placeholder="Descrição ou observações..."
            rows={3}
            {...register('description')}
          />

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
                disabled={createRoute.isPending || updateRoute.isPending}
                label={selectedRoute ? 'Salvar Alterações' : 'Cadastrar'}
              />
            </div>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
