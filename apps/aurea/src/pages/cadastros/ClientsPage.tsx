import { useState, useMemo, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2, Search, FunnelX, Plus, HeartHandshake } from 'lucide-react';
import {
  Card,
  Button,
  DataTable,
  Badge,
  StatusBadge,
  EmptyState,
  SwitchNew,
  TabButton,
  IconButton,
  ListPagination,
  Modal,
  ModalFooter,
  Input,
  ColorPicker,
  Select,
} from '@/components/ui';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/useClients';
import { useClientContacts, useSaveClientContacts } from '@/hooks/useClientContacts';
import { useListPageState } from '@/hooks/useListPageState';
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination';
import { useForm } from 'react-hook-form';
import type { Client, ClientContact } from '@/types/database';
import ClientContactForm from '@/components/client/ClientContactForm';
import { useAuthStore } from '@/stores/authStore';
import { UF_OPTIONS, fetchAddressFromZip, formatZipInput } from '@/lib/addressZip';

// Funções de formatação
const formatDocument = (document: string): string => {
  if (!document) return '-';
  const cleanDoc = document.replace(/\D/g, '');

  if (cleanDoc.length === 11) {
    // CPF: 000.000.000-00
    return cleanDoc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (cleanDoc.length === 14) {
    // CNPJ: 00.000.000/0000-00
    return cleanDoc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  return cleanDoc;
};

const formatPhone = (phone: string): string => {
  if (!phone) return '-';
  const cleanPhone = phone.replace(/\D/g, '');

  if (cleanPhone.length === 10) {
    // Telefone fixo: (00) 0000-0000
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (cleanPhone.length === 11) {
    // Celular: (00) 00000-0000
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }

  return cleanPhone;
};

// Máscaras para inputs
const applyDocumentMask = (value: string): string => {
  const cleanValue = value.replace(/\D/g, '');

  if (cleanValue.length <= 11) {
    // CPF
    return cleanValue
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{2})$/, '$1-$2');
  } else {
    // CNPJ
    return cleanValue
      .slice(0, 14)
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{2})$/, '$1-$2');
  }
};

const applyPhoneMask = (value: string): string => {
  const cleanValue = value.replace(/\D/g, '');

  if (cleanValue.length <= 10) {
    // Telefone fixo
    return cleanValue.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{4})$/, '$1-$2');
  } else {
    // Celular
    return cleanValue
      .slice(0, 11)
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{4})$/, '$1-$2');
  }
};

interface ClientFormData {
  code: string;
  type: 'insurer' | 'company' | 'individual';
  name: string;
  document: string;
  email: string;
  phone: string;
  zip: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  ans_code: string;
  tiss: string;
  color: string;
  active: boolean;
}

const PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;

export default function ClientsPage() {
  const { data: clients = [], isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const saveContacts = useSaveClientContacts();
  const { company } = useAuthStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'contact'>('basic');
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useListPageState();
  const [zipValue, setZipValue] = useState('');
  const [isZipLookupLoading, setIsZipLookupLoading] = useState(false);

  // Hooks para carregar contatos (somente ao editar)
  const { data: existingContactsData } = useClientContacts(selectedClient?.id);

  // Sincroniza contatos locais com o servidor sem criar loop de render.
  useEffect(() => {
    if (!selectedClient) {
      setContacts((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const nextContacts = existingContactsData ?? [];
    setContacts(nextContacts);
  }, [selectedClient, existingContactsData]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClientFormData>();

  // Observar mudanças nos campos
  const watchType = watch('type');
  const watchState = watch('state');

  const activeValue = watch('active');
  const { ref: activeRef, name: activeName, onBlur: activeOnBlur } = register('active');

  const openCreateModal = () => {
    setSelectedClient(null);
    setIsModalOpen(true);
  };

  // useEffect para controlar reset do formulário
  useEffect(() => {
    if (isModalOpen) {
      if (selectedClient) {
        // Editing
        reset({
          code: selectedClient.code || '',
          type: (selectedClient.type as ClientFormData['type']) || 'company',
          name: selectedClient.name,
          document: selectedClient.document || '',
          email: selectedClient.email || '',
          phone: selectedClient.phone || '',
          zip: selectedClient.zip || '',
          street: selectedClient.street || '',
          number: selectedClient.number || '',
          complement: selectedClient.complement || '',
          district: selectedClient.district || '',
          city: selectedClient.city || '',
          state: selectedClient.state || '',
          ans_code: (selectedClient as any).ans_code || '',
          tiss: (selectedClient as any).tiss || '',
          color: (selectedClient as any).color || '',
          active: selectedClient.active ? true : false,
        });
        setZipValue(formatZipInput(selectedClient.zip || ''));
      } else {
        // Creating
        reset({
          code: '',
          type: 'company',
          name: '',
          document: '',
          email: '',
          phone: '',
          zip: '',
          street: '',
          number: '',
          complement: '',
          district: '',
          city: '',
          state: '',
          ans_code: '',
          tiss: '',
          color: '',
          active: true,
        });
        setZipValue('');
        setContacts([]);
      }
      setIsZipLookupLoading(false);
      setActiveTab('basic');
    }
  }, [isModalOpen, selectedClient, reset]);

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

    const mappedFields: Array<[keyof ClientFormData, string | undefined]> = [
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

  const handleSaveContacts = async (contactsToSave: ClientContact[]) => {
    if (!selectedClient) {
      alert('É necessário salvar o cliente primeiro');
      return;
    }

    try {
      await saveContacts.mutateAsync({
        clientId: selectedClient.id,
        contacts: contactsToSave,
      });
    } catch (error) {
      console.error('Erro ao salvar contatos:', error);
    }
  };

  const openEditModal = (client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const openDeleteModal = (client: Client) => {
    setSelectedClient(client);
    setIsDeleteModalOpen(true);
  };

  const onSubmit = async (data: ClientFormData) => {
    const toNullable = (value: string): string | null => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : null;
    };

    const payload = {
      ...data,
      name: data.name ? data.name.toUpperCase() : '',
      code: toNullable(data.code),
      zip: toNullable(data.zip),
      street: toNullable(data.street),
      number: toNullable(data.number),
      complement: toNullable(data.complement),
      district: toNullable(data.district),
      city: toNullable(data.city),
      state: toNullable(data.state),
      ans_code: toNullable(data.ans_code),
      tiss: toNullable(data.tiss),
      color: toNullable(data.color),
    };
    if (selectedClient) {
      await updateClient.mutateAsync({ id: selectedClient.id, ...payload });
    } else {
      await createClient.mutateAsync(payload);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (selectedClient) {
      await deleteClient.mutateAsync(selectedClient.id);
      setIsDeleteModalOpen(false);
    }
  };

  const columns: ColumnDef<Client>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Nome',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
              <HeartHandshake className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <p className="font-medium text-gray-900 dark:text-white">{row.original.name}</p>
          </div>
        ),
      },
      {
        accessorKey: 'document',
        header: 'Documento',
        cell: ({ row }) => (
          <p className="font-mono text-sm text-gray-700 dark:text-gray-300">
            {formatDocument(row.original.document || '')}
          </p>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Tipo',
        cell: ({ row }) => <StatusBadge status={row.original.type} />,
      },
      {
        accessorKey: 'color',
        header: 'Cor',
        cell: ({ row }) => {
          const client = row.original as any;
          if (client.type === 'insurer' && client.color) {
            return (
              <div className="flex items-center gap-2">
                <div
                  className="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: client.color }}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">{client.color}</span>
              </div>
            );
          }
          return <span className="text-gray-400">-</span>;
        },
      },
      {
        accessorKey: 'phone',
        header: 'Contato',
        cell: ({ row }) => (
          <div>
            <p className="font-mono text-sm text-gray-700 dark:text-gray-300">
              {formatPhone(row.original.phone || '')}
            </p>
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
    []
  );

  const typeOptions = [
    { value: 'insurer', label: 'Operadora de Saúde' },
    { value: 'company', label: 'Empresa' },
    { value: 'individual', label: 'Pessoa Física' },
  ];

  const filteredClients = useMemo(() => {
    if (!searchInput.trim()) return clients;
    const query = searchInput.toLowerCase();
    return clients.filter((client) => {
      const name = client.name?.toLowerCase() || '';
      const document = client.document?.toLowerCase() || '';
      return name.includes(query) || document.includes(query);
    });
  }, [clients, searchInput]);

  const totalCount = filteredClients.length;
  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredClients.slice(start, start + PAGE_SIZE);
  }, [filteredClients, currentPage]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Clientes
          </h1>
        </div>
        <Button
          onClick={openCreateModal}
          size="md"
          variant="solid"
          icon={<Plus className="h-4 w-4" />}
          label="Novo Cliente"
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
                placeholder="Buscar por nome ou documento..."
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
            data={paginatedClients}
            columns={columns}
            showPagination={false}
            isLoading={isLoading}
            onRowClick={openEditModal}
            emptyState={
              <EmptyState
                title="Nenhum cliente cadastrado"
                description="Comece cadastrando seu primeiro cliente"
                action={
                  <Button
                    onClick={openCreateModal}
                    size="sm"
                    variant="solid"
                    icon={<Plus className="h-4 w-4" />}
                    label="Cadastrar Cliente"
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
            itemLabel="clientes"
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
        title={selectedClient ? 'Editar Cliente' : 'Novo Cliente'}
        size="xl"
      >
        <div className="flex min-h-[515px] flex-col">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              <TabButton active={activeTab === 'basic'} onClick={() => setActiveTab('basic')}>
                Dados Básicos
              </TabButton>
              <TabButton
                active={activeTab === 'contact'}
                onClick={() => {
                  if (selectedClient) setActiveTab('contact');
                }}
                disabled={!selectedClient}
                className={!selectedClient ? 'cursor-not-allowed opacity-50' : undefined}
                title={!selectedClient ? 'Salve o cliente para habilitar contatos' : undefined}
              >
                Contatos
              </TabButton>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pt-4">
            {/* Conteúdo das abas */}
            {activeTab === 'basic' && (
              <form className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                  <div className="md:col-span-2">
                    <Input label="Código" placeholder="Código" {...register('code')} />
                  </div>
                  <div className="md:col-span-4">
                    <Select
                      label="Tipo de Cliente"
                      options={typeOptions}
                      value={watchType}
                      {...register('type', { required: 'Tipo é obrigatório' })}
                      error={errors.type?.message}
                      required
                    />
                  </div>
                  <div className="md:col-span-6">
                    <Input
                      label="Nome / Razão Social"
                      placeholder="Nome do cliente"
                      {...register('name', { required: 'Nome é obrigatório' })}
                      error={errors.name?.message}
                      required
                      onBlur={(e) => {
                        const value = e.target.value.toUpperCase();
                        if (value !== e.target.value) {
                          // Atualiza o valor do campo para caixa alta
                          setValue('name', value);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                  <div className="md:col-span-3">
                    <Input
                      label="CPF/CNPJ"
                      placeholder="Números..."
                      {...register('document')}
                      onChange={(e) => {
                        const maskedValue = applyDocumentMask(e.target.value);
                        setValue('document', maskedValue, { shouldDirty: true });
                      }}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Input
                      label="Telefone"
                      placeholder="(00) 00000-0000"
                      {...register('phone')}
                      onChange={(e) => {
                        const maskedValue = applyPhoneMask(e.target.value);
                        setValue('phone', maskedValue, { shouldDirty: true });
                      }}
                    />
                  </div>
                  <div className="md:col-span-6">
                    <Input
                      label="E-mail"
                      type="email"
                      placeholder="email@exemplo.com"
                      {...register('email')}
                    />
                  </div>
                </div>
                <div className="space-y-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                    <div className="md:col-span-3">
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
                        <div className="absolute right-3 top-9 flex items-center gap-2">
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
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Buscando...
                          </span>
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

                {/* Campos específicos para operadoras */}
                {watchType === 'insurer' && (
                  <div className="space-y-4">
                    <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <Input
                          label="Registro ANS"
                          placeholder="Ex: 123456"
                          {...register('ans_code')}
                        />
                        <Input
                          label="Código TISS"
                          placeholder="Ex: 12345678"
                          {...register('tiss')}
                        />
                        <div className="flex flex-col gap-2">
                          <ColorPicker
                            label="Cor da Operadora"
                            placeholder="#1aa2ff"
                            {...register('color')}
                            hint="Cor para identificar a operadora no sistema"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            )}

            {/* Aba: Contatos */}
            {activeTab === 'contact' && selectedClient && (
              <ClientContactForm
                contacts={contacts}
                onChange={setContacts}
                companyId={company?.id || ''}
                clientId={selectedClient.id}
                onSave={handleSaveContacts}
                isSaving={saveContacts.isPending}
              />
            )}
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
                disabled={createClient.isPending || updateClient.isPending}
                label={selectedClient ? 'Salvar Alterações' : 'Cadastrar'}
              />
            </div>
          </ModalFooter>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Excluir Cliente"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-400">
          Tem certeza que deseja excluir o cliente{' '}
          <strong className="text-gray-900 dark:text-white">{selectedClient?.name}</strong>? Esta
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
            isLoading={deleteClient.isPending}
          >
            Excluir
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
