import { useState, useMemo, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2, Truck, Search, FunnelX, Plus } from 'lucide-react';
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
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from '@/hooks/useSuppliers';
import { useListPageState } from '@/hooks/useListPageState';
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination';
import { useForm } from 'react-hook-form';
import type { Supplier } from '@/types/database';
import { UF_OPTIONS, fetchAddressFromZip, formatZipInput } from '@/lib/addressZip';

interface SupplierFormData {
  code: string;
  name: string;
  trade_name: string;
  document: string;
  state_registration: string;
  municipal_registration: string;
  phone: string;
  email: string;
  website: string;
  zip: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  contact_name: string;
  contact_phone: string;
  payment_terms: string;
  notes: string;
  active: boolean;
}

const PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;

// Função para formatar CNPJ/CPF
const formatCNPJCPF = (value: string | null | undefined): string => {
  if (!value) return '-';

  const cleanValue = value.replace(/\D/g, '');

  if (cleanValue.length === 11) {
    // CPF: 000.000.000-00
    return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (cleanValue.length === 14) {
    // CNPJ: 00.000.000/0000-00
    return cleanValue.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  return value;
};

const formatCnpjCpfInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 14);

  if (digits.length <= 11) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

const formatPhoneInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';

  if (digits.length <= 2) return `(${digits}`;

  const area = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (digits.length <= 6) return `(${area}) ${rest}`;

  if (digits.length <= 10) {
    const prefix = rest.slice(0, 4);
    const suffix = rest.slice(4);
    return `(${area}) ${prefix}${suffix ? `-${suffix}` : ''}`;
  }

  const prefix = rest.slice(0, 5);
  const suffix = rest.slice(5);
  return `(${area}) ${prefix}${suffix ? `-${suffix}` : ''}`;
};

export default function SuppliersPage() {
  const { data: suppliers = [], isLoading } = useSuppliers();
  const [currentPage, setCurrentPage] = useListPageState();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searchInput, setSearchInput] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SupplierFormData>();

  const stateValue = watch('state');
  const activeValue = watch('active');
  const { ref: activeRef, name: activeName, onBlur: activeOnBlur } = register('active');
  const [documentValue, setDocumentValue] = useState('');
  const [phoneValue, setPhoneValue] = useState('');
  const [contactPhoneValue, setContactPhoneValue] = useState('');
  const [zipValue, setZipValue] = useState('');
  const [isZipLookupLoading, setIsZipLookupLoading] = useState(false);

  const openCreateModal = () => {
    setSelectedSupplier(null);
    reset({
      code: '',
      name: '',
      trade_name: '',
      document: '',
      state_registration: '',
      municipal_registration: '',
      phone: '',
      email: '',
      website: '',
      zip: '',
      street: '',
      number: '',
      complement: '',
      district: '',
      city: '',
      state: '',
      contact_name: '',
      contact_phone: '',
      payment_terms: '',
      notes: '',
      active: true,
    });
    setDocumentValue('');
    setPhoneValue('');
    setContactPhoneValue('');
    setZipValue('');
    setIsZipLookupLoading(false);
    setIsModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    const formattedDocument = formatCnpjCpfInput(supplier.document || '');
    const formattedPhone = formatPhoneInput(supplier.phone || '');
    const formattedContactPhone = formatPhoneInput(supplier.contact_phone || '');
    const formattedZip = formatZipInput(supplier.zip || '');

    setSelectedSupplier(supplier);
    reset({
      code: supplier.code || '',
      name: supplier.name,
      trade_name: supplier.trade_name || '',
      document: formattedDocument,
      state_registration: supplier.state_registration || '',
      municipal_registration: supplier.municipal_registration || '',
      phone: formattedPhone,
      email: supplier.email || '',
      website: supplier.website || '',
      zip: formattedZip,
      street: supplier.street || '',
      number: supplier.number || '',
      complement: supplier.complement || '',
      district: supplier.district || '',
      city: supplier.city || '',
      state: supplier.state || '',
      contact_name: supplier.contact_name || '',
      contact_phone: formattedContactPhone,
      payment_terms: supplier.payment_terms || '',
      notes: supplier.notes || '',
      active: supplier.active ?? true,
    });
    setDocumentValue(formattedDocument);
    setPhoneValue(formattedPhone);
    setContactPhoneValue(formattedContactPhone);
    setZipValue(formattedZip);
    setIsZipLookupLoading(false);
    setIsModalOpen(true);
  };

  const openDeleteModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
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

    const mappedFields: Array<[keyof SupplierFormData, string | undefined]> = [
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

  const onSubmit = async (data: SupplierFormData) => {
    const toNullable = (value: string): string | null => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : null;
    };

    const payload = {
      ...data,
      code: toNullable(data.code),
      trade_name: toNullable(data.trade_name),
      document: data.document ? data.document.replace(/\D/g, '') : null,
      state_registration: toNullable(data.state_registration),
      municipal_registration: toNullable(data.municipal_registration),
      phone: toNullable(data.phone),
      email: toNullable(data.email),
      website: toNullable(data.website),
      zip: toNullable(data.zip),
      street: toNullable(data.street),
      number: toNullable(data.number),
      complement: toNullable(data.complement),
      district: toNullable(data.district),
      city: toNullable(data.city),
      state: toNullable(data.state),
      contact_name: toNullable(data.contact_name),
      contact_phone: toNullable(data.contact_phone),
      payment_terms: toNullable(data.payment_terms),
      notes: toNullable(data.notes),
    };

    if (selectedSupplier) {
      await updateSupplier.mutateAsync({
        id: selectedSupplier.id,
        ...payload,
      });
    } else {
      await createSupplier.mutateAsync(payload);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (selectedSupplier) {
      await deleteSupplier.mutateAsync(selectedSupplier.id);
      setIsDeleteModalOpen(false);
    }
  };

  const filteredSuppliers = useMemo(() => {
    if (!searchInput.trim()) return suppliers;
    const query = searchInput.toLowerCase();
    return suppliers.filter((supplier) => {
      const name = supplier.name?.toLowerCase() || '';
      const tradeName = supplier.trade_name?.toLowerCase() || '';
      const document = supplier.document?.toLowerCase() || '';
      return name.includes(query) || tradeName.includes(query) || document.includes(query);
    });
  }, [suppliers, searchInput]);
  const totalCount = filteredSuppliers.length;
  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);
  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSuppliers.slice(start, start + PAGE_SIZE);
  }, [filteredSuppliers, currentPage]);

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

  const columns: ColumnDef<Supplier>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Fornecedor',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Truck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{row.original.name}</p>
              {row.original.trade_name && (
                <p className="text-sm text-gray-500">{row.original.trade_name}</p>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'document',
        header: 'CNPJ/CPF',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {formatCNPJCPF(row.original.document)}
          </span>
        ),
      },
      {
        accessorKey: 'location',
        header: 'Localização',
        cell: ({ row }) => {
          const { city, state } = row.original;
          if (!city && !state) return '-';
          return (
            <span className="text-gray-700 dark:text-gray-300">
              {[city, state].filter(Boolean).join(' - ')}
            </span>
          );
        },
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
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(row.original);
              }}
            >
              <Pencil className="h-4 w-4" />
            </IconButton>
            <IconButton
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                openDeleteModal(row.original);
              }}
            >
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
            Fornecedores
          </h1>
        </div>
        <Button
          onClick={openCreateModal}
          variant="solid"
          icon={<Plus className="h-4 w-4" />}
          label="Novo Fornecedor"
        />
      </div>

      {/* Table */}
      <Card padding="none">
        <div className="space-y-4 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[30%]">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou CNPJ..."
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
            data={paginatedSuppliers}
            columns={columns}
            showPagination={false}
            isLoading={isLoading}
            onRowClick={openEditModal}
            emptyState={
              <EmptyState
                title="Nenhum fornecedor cadastrado"
                description="Comece cadastrando seu primeiro fornecedor"
                action={
                  <Button
                    onClick={openCreateModal}
                    size="sm"
                    variant="solid"
                    label="Cadastrar Fornecedor"
                  />
                }
              />
            }
          />
          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            itemLabel="fornecedores"
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
        title={selectedSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Dados Básicos */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Dados Básicos</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[repeat(24,minmax(0,1fr))]">
              <div className="col-span-4">
                <Input label="Código" placeholder="Código" {...register('code')} />
              </div>
              <div className="col-span-12">
                <Input
                  label="Razão Social"
                  autoUppercase={true}
                  placeholder="Nome oficial da empresa"
                  {...register('name', { required: 'Razão social é obrigatória' })}
                  error={errors.name?.message}
                  required
                />
              </div>
              <div className="col-span-8">
                <Input
                  label="Nome Fantasia"
                  autoUppercase={true}
                  placeholder="Nome comercial"
                  {...register('trade_name')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input
                label="CNPJ/CPF"
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                {...register('document')}
                value={documentValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const formatted = formatCnpjCpfInput(e.target.value);
                  setDocumentValue(formatted);
                  setValue('document', formatted, { shouldDirty: true });
                }}
              />
              <Input
                label="Inscrição Estadual"
                placeholder="Número IE"
                {...register('state_registration')}
              />
              <Input
                label="Inscrição Municipal"
                placeholder="Número IM"
                {...register('municipal_registration')}
              />
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-4 border-t border-gray-200 pt-4 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Endereço</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="relative md:col-span-3">
                <Input
                  label="CEP"
                  placeholder="00000-000"
                  inputMode="numeric"
                  {...register('zip')}
                  value={zipValue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
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
                <Select label="UF" options={UF_OPTIONS} value={stateValue} {...register('state')} />
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="space-y-4 border-t border-gray-200 pt-4 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Contato</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[repeat(24,minmax(0,1fr))]">
              <div className="md:col-span-6">
                <Input
                  label="Telefone"
                  placeholder="(00) 0000-0000"
                  inputMode="numeric"
                  {...register('phone')}
                  value={phoneValue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const formatted = formatPhoneInput(e.target.value);
                    setPhoneValue(formatted);
                    setValue('phone', formatted, { shouldDirty: true });
                  }}
                />
              </div>
              <div className="md:col-span-10">
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="contato@fornecedor.com"
                  {...register('email')}
                />
              </div>
              <div className="md:col-span-8">
                <Input
                  label="Website"
                  placeholder="https://www.fornecedor.com.br"
                  {...register('website')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Nome do Contato"
                placeholder="Nome do representante"
                {...register('contact_name')}
              />
              <Input
                label="Telefone do Contato"
                placeholder="(00) 00000-0000"
                inputMode="numeric"
                {...register('contact_phone')}
                value={contactPhoneValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const formatted = formatPhoneInput(e.target.value);
                  setContactPhoneValue(formatted);
                  setValue('contact_phone', formatted, { shouldDirty: true });
                }}
              />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-4 border-t border-gray-200 pt-4 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Informações Adicionais
            </h3>
            <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-4">
              <div className="col-span-full md:col-span-12">
                <Textarea
                  label="Condições de Pagamento"
                  placeholder="Ex: 30/60/90 dias, boleto bancário"
                  rows={2}
                  {...register('payment_terms')}
                />
              </div>
              <div className="col-span-full md:col-span-12">
                <Textarea
                  label="Observações"
                  placeholder="Observações adicionais..."
                  rows={2}
                  {...register('notes')}
                />
              </div>
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
                onClick={() => setIsModalOpen(false)}
                label="Cancelar"
              />
              <Button
                type="submit"
                variant="solid"
                disabled={createSupplier.isPending || updateSupplier.isPending}
                label={selectedSupplier ? 'Salvar Alterações' : 'Cadastrar'}
              />
            </div>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Excluir Fornecedor"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-400">
          Tem certeza que deseja excluir o fornecedor{' '}
          <strong className="text-gray-900 dark:text-white">{selectedSupplier?.name}</strong>? Esta
          ação não pode ser desfeita.
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
            isLoading={deleteSupplier.isPending}
          >
            Excluir
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
