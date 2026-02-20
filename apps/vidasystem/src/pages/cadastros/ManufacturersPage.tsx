import { useState, useMemo, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2, Building2, RefreshCw, Search, FunnelX, Plus } from 'lucide-react';
import {
  Card,
  Button,
  DataTable,
  ListPagination,
  Modal,
  ModalFooter,
  Input,
  Select,
  Textarea,
  Badge,
  EmptyState,
  SwitchNew,
  IconButton,
} from '@/components/ui';
import {
  useManufacturersPaginated,
  useCreateManufacturer,
  useUpdateManufacturer,
  useDeleteManufacturer,
  useReferenceTablesStatus,
  useSyncManufacturersFromReference,
} from '@/hooks/useManufacturers';
import { useListPageState } from '@/hooks/useListPageState';
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination';
import { useForm } from 'react-hook-form';
import type { Manufacturer } from '@/types/database';
import { UF_OPTIONS, fetchAddressFromZip, formatZipInput } from '@/lib/addressZip';

interface ManufacturerFormData {
  code: string;
  name: string;
  trade_name: string;
  document: string;
  website: string;
  phone: string;
  email: string;
  zip: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  notes: string;
  active: boolean;
}

const PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;

export default function ManufacturersPage() {
  const [currentPage, setCurrentPage] = useListPageState();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data: paginatedData, isLoading } = useManufacturersPaginated(
    currentPage,
    PAGE_SIZE,
    searchTerm
  );

  const manufacturers = paginatedData?.data ?? [];
  const totalCount = paginatedData?.totalCount ?? 0;
  const totalPages = paginatedData?.totalPages ?? 1;

  const createManufacturer = useCreateManufacturer();
  const updateManufacturer = useUpdateManufacturer();
  const deleteManufacturer = useDeleteManufacturer();
  const { data: refStatus } = useReferenceTablesStatus();
  const syncManufacturers = useSyncManufacturersFromReference();

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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [selectedManufacturer, setSelectedManufacturer] = useState<Manufacturer | null>(null);
  const [zipValue, setZipValue] = useState('');
  const [isZipLookupLoading, setIsZipLookupLoading] = useState(false);

  const canSync = refStatus?.hasCmed && refStatus?.hasBrasindice;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ManufacturerFormData>();

  const { name: activeName, ref: activeRef, onBlur: activeOnBlur } = register('active');
  const activeValue = watch('active');
  const watchState = watch('state');

  const openCreateModal = () => {
    setSelectedManufacturer(null);
    reset({
      code: '',
      name: '',
      trade_name: '',
      document: '',
      website: '',
      phone: '',
      email: '',
      zip: '',
      street: '',
      number: '',
      complement: '',
      district: '',
      city: '',
      state: '',
      notes: '',
      active: true,
    });
    setZipValue('');
    setIsZipLookupLoading(false);
    setIsModalOpen(true);
  };

  const openEditModal = (manufacturer: Manufacturer) => {
    setSelectedManufacturer(manufacturer);
    reset({
      code: manufacturer.code || '',
      name: manufacturer.name,
      trade_name: manufacturer.trade_name || '',
      document: manufacturer.document || '',
      website: manufacturer.website || '',
      phone: manufacturer.phone || '',
      email: manufacturer.email || '',
      zip: manufacturer.zip || '',
      street: manufacturer.street || '',
      number: manufacturer.number || '',
      complement: manufacturer.complement || '',
      district: manufacturer.district || '',
      city: manufacturer.city || '',
      state: manufacturer.state || '',
      notes: manufacturer.notes || '',
      active: manufacturer.active ?? true,
    });
    setZipValue(formatZipInput(manufacturer.zip || ''));
    setIsZipLookupLoading(false);
    setIsModalOpen(true);
  };

  const openDeleteModal = (manufacturer: Manufacturer) => {
    setSelectedManufacturer(manufacturer);
    setIsDeleteModalOpen(true);
  };

  const handleZipChange = async (value: string) => {
    const formattedZip = formatZipInput(value);
    setZipValue(formattedZip);
    setValue('zip', formattedZip, { shouldDirty: true });

    const digits = formattedZip.replace(/\D/g, '');
    if (digits.length !== 8) {
      setIsZipLookupLoading(false);
      return;
    }

    setIsZipLookupLoading(true);
    const zipData = await fetchAddressFromZip(formattedZip);
    setIsZipLookupLoading(false);

    if (watch('zip') !== formattedZip) return;
    if (!zipData) return;

    const mappedFields: Array<[keyof ManufacturerFormData, string | undefined]> = [
      ['street', zipData.logradouro],
      ['district', zipData.bairro],
      ['city', zipData.localidade],
      ['state', zipData.uf],
      ['complement', zipData.complemento],
    ];

    mappedFields.forEach(([field, fieldValue]) => {
      if (!fieldValue) return;
      setValue(field, fieldValue, { shouldDirty: true });
    });
  };

  const onSubmit = async (data: ManufacturerFormData) => {
    const toNullable = (value: string): string | null => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : null;
    };

    const payload = {
      ...data,
      code: toNullable(data.code),
      trade_name: toNullable(data.trade_name),
      document: toNullable(data.document),
      website: toNullable(data.website),
      phone: toNullable(data.phone),
      email: toNullable(data.email),
      zip: toNullable(data.zip),
      street: toNullable(data.street),
      number: toNullable(data.number),
      complement: toNullable(data.complement),
      district: toNullable(data.district),
      city: toNullable(data.city),
      state: toNullable(data.state),
      notes: toNullable(data.notes),
    };

    if (selectedManufacturer) {
      await updateManufacturer.mutateAsync({
        id: selectedManufacturer.id,
        ...payload,
      });
    } else {
      await createManufacturer.mutateAsync(payload);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (selectedManufacturer) {
      await deleteManufacturer.mutateAsync(selectedManufacturer.id);
      setIsDeleteModalOpen(false);
    }
  };

  const handleSync = async () => {
    await syncManufacturers.mutateAsync();
    setIsSyncModalOpen(false);
  };

  const columns: ColumnDef<Manufacturer>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Fabricante',
        cell: ({ row }) => {
          const name = row.original.name || '';
          const truncatedName = name.length > 80 ? name.substring(0, 80) + '...' : name;

          return (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                {row.original.trade_name ? (
                  <>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {row.original.trade_name}
                    </p>
                    <p className="truncate text-sm text-gray-500" title={name}>
                      {truncatedName}
                    </p>
                  </>
                ) : (
                  <p className="truncate font-medium text-gray-900 dark:text-white" title={name}>
                    {truncatedName}
                  </p>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'document',
        header: 'CNPJ',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">{row.original.document || '-'}</span>
        ),
      },
      {
        accessorKey: 'brasindice_code',
        header: 'Cód. Brasíndice',
        cell: ({ row }) => (
          <span className="font-mono text-gray-700 dark:text-gray-300">
            {(row.original as any).brasindice_code || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'contact',
        header: 'Contato',
        cell: ({ row }) => (
          <div>
            <p className="text-gray-700 dark:text-gray-300">{row.original.phone || '-'}</p>
            <p className="text-sm text-gray-500">{row.original.email || '-'}</p>
          </div>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Fabricantes
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="neutral"
            onClick={() => setIsSyncModalOpen(true)}
            disabled={!canSync}
            icon={<RefreshCw className="mr-1 h-4 w-4" />}
            title={
              !canSync
                ? 'Importe CMED e Brasíndice nas Tabelas de Referência para habilitar'
                : 'Sincronizar fabricantes das tabelas de referência'
            }
          >
            Sincronizar de Referência
          </Button>
          <Button
            onClick={openCreateModal}
            variant="solid"
            icon={<Plus className="h-4 w-4" />}
            label="Novo Fabricante"
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
                placeholder="Buscar por nome, CNPJ ou código..."
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
            data={manufacturers}
            columns={columns}
            showPagination={false}
            isLoading={isLoading}
            onRowClick={openEditModal}
            emptyState={
              <EmptyState
                title={searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum fabricante cadastrado'}
                description={
                  searchTerm
                    ? 'Tente uma busca diferente'
                    : 'Comece cadastrando seu primeiro fabricante'
                }
                action={
                  !searchTerm && (
                    <Button
                      onClick={openCreateModal}
                      size="sm"
                      variant="solid"
                      label="Cadastrar Fabricante"
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
        title={selectedManufacturer ? 'Editar Fabricante' : 'Novo Fabricante'}
        size="lg"
        panelClassName="max-w-[calc(42rem+100px)]"
      >
        <div className="flex min-h-[515px] flex-col">
          <div className="flex-1 overflow-y-auto pt-4">
            <form className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-2">
                  <Input
                    label="Código"
                    placeholder="Código do sistema externo"
                    {...register('code')}
                  />
                </div>
                <div className="md:col-span-5">
                  <Input
                    label="Razão Social"
                    placeholder="Nome oficial da empresa"
                    {...register('name', { required: 'Razão social é obrigatória' })}
                    error={errors.name?.message}
                    required
                  />
                </div>
                <div className="md:col-span-5">
                  <Input
                    label="Nome Fantasia"
                    placeholder="Nome comercial"
                    {...register('trade_name')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-4">
                  <Input label="CNPJ" placeholder="00.000.000/0000-00" {...register('document')} />
                </div>
                <div className="md:col-span-3">
                  <Input label="Telefone" placeholder="(00) 0000-0000" {...register('phone')} />
                </div>
                <div className="md:col-span-5">
                  <Input
                    label="E-mail"
                    type="email"
                    placeholder="contato@fabricante.com"
                    {...register('email')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-12">
                  <Input
                    label="Website"
                    placeholder="https://www.fabricante.com.br"
                    {...register('website')}
                  />
                </div>
              </div>

              <div className="space-y-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                  <div className="relative md:col-span-3">
                    <Input
                      label="CEP"
                      placeholder="00000-000"
                      inputMode="numeric"
                      {...register('zip')}
                      value={zipValue}
                      onChange={(e) => {
                        void handleZipChange(e.target.value);
                      }}
                    />
                    {isZipLookupLoading && (
                      <div className="absolute right-3 top-7 flex items-center gap-2">
                        <svg
                          className="text-primary-500 h-4 w-4 animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-7">
                    <Input
                      label="Logradouro"
                      placeholder="Rua, Avenida, etc."
                      {...register('street')}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input label="Número" placeholder="123" {...register('number')} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-[repeat(24,minmax(0,1fr))]">
                  <div className="md:col-span-8">
                    <Input
                      label="Complemento"
                      placeholder="Apto, bloco, sala..."
                      {...register('complement')}
                    />
                  </div>
                  <div className="md:col-span-6">
                    <Input label="Bairro" placeholder="Bairro" {...register('district')} />
                  </div>
                  <div className="md:col-span-6">
                    <Input label="Cidade" placeholder="Cidade" {...register('city')} />
                  </div>
                  <div className="md:col-span-4">
                    <Select
                      label="UF"
                      options={UF_OPTIONS}
                      value={watchState}
                      {...register('state')}
                    />
                  </div>
                </div>
              </div>

              <Textarea
                label="Observações"
                placeholder="Observações adicionais..."
                rows={2}
                {...register('notes')}
              />
            </form>
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
                showIcon={false}
                onClick={() => setIsModalOpen(false)}
                label="Cancelar"
              />
              <Button
                type="button"
                variant="solid"
                size="md"
                showIcon={false}
                onClick={handleSubmit(onSubmit)}
                disabled={createManufacturer.isPending || updateManufacturer.isPending}
                label={selectedManufacturer ? 'Salvar Alterações' : 'Cadastrar'}
              />
            </div>
          </ModalFooter>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Excluir Fabricante"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-400">
          Tem certeza que deseja excluir o fabricante{' '}
          <strong className="text-gray-900 dark:text-white">{selectedManufacturer?.name}</strong>?
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
          <Button type="button" variant="danger" onClick={handleDelete} showIcon={false}>
            Excluir
          </Button>
        </ModalFooter>
      </Modal>

      {/* Sync Confirmation Modal */}
      <Modal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        title="Sincronizar Fabricantes"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Esta ação irá buscar fabricantes nas tabelas de referência (CMED e Brasíndice) através
            do pareamento por código EAN/GTIN dos produtos.
          </p>
          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <h4 className="mb-2 font-medium text-blue-900 dark:text-blue-100">O que será feito:</h4>
            <ul className="list-inside list-disc space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>Buscar produtos com mesmo EAN no CMED e Brasíndice</li>
              <li>Extrair CNPJ (do CMED) e código Brasíndice</li>
              <li>Cadastrar novos fabricantes com dados combinados</li>
              <li>Atualizar fabricantes existentes se necessário</li>
            </ul>
          </div>
        </div>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            showIcon={false}
            onClick={() => setIsSyncModalOpen(false)}
            label="Cancelar"
          />
          <Button
            type="button"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={handleSync}
            isLoading={syncManufacturers.isPending}
          >
            Sincronizar
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
