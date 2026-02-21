import { useState, useMemo, useCallback, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { CircleHelp, Download, RefreshCw, Search, User } from 'lucide-react';
import { Card, DataTable, EmptyState, Badge, Button, Modal, ModalFooter, Select } from '@synia/ui';
import {
  useWhatsappContacts,
  resolveContactDisplayName,
  resolveContactPhone,
  useSyncWhatsappContacts,
  usePreviewWhatsappContactsSync,
  useExportWhatsappContacts,
} from '@/hooks/useWhatsappContacts';
import { WhatsappContact } from '@/hooks/useWhatsappMessages';
import { useAuthStore } from '@/stores/authStore';
import { useWhatsappPermissions } from '@/hooks/useWhatsappPermissions';
import { useWhatsappInstances, WhatsappInstance } from '@/hooks/useWhatsappInstances';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

type InstanceSyncStats = {
  instanceId: string;
  instanceName: string;
  pages: number;
  processed: number;
  newContacts: number;
  updatedContacts: number;
};

type ContactsSyncProgress = {
  isSyncing: boolean;
  totalInstances: number;
  currentInstanceIndex: number;
  currentInstanceName: string;
  currentPage: number;
  totalProcessed: number;
  totalNew: number;
  totalUpdated: number;
  instanceStats: InstanceSyncStats[];
};

type ContactsSyncPreview = {
  isLoading: boolean;
  totalRecords: number | null;
  totalDeviceContacts: number | null;
  previewContacts: Array<{
    jid: string | null;
    displayName: string;
    phone: string | null;
    isGroup: boolean;
  }>;
  error: string | null;
  instanceId: string | null;
};

function formatPhoneNumber(value?: string | null) {
  if (!value) return '-';

  const source = String(value);
  const withoutJid = source.includes('@') ? source.split('@')[0] : source;
  const digits = withoutJid.replace(/\D/g, '');

  if (!digits) return source;

  const formatLocal = (area: string, number: string) => {
    if (number.length === 9) return `(${area}) ${number.slice(0, 5)}-${number.slice(5)}`;
    if (number.length === 8) return `(${area}) ${number.slice(0, 4)}-${number.slice(4)}`;
    return `(${area}) ${number}`;
  };

  if (digits.startsWith('55') && digits.length >= 12) {
    const area = digits.slice(2, 4);
    const number = digits.slice(4);
    return `+55 ${formatLocal(area, number)}`;
  }

  if (digits.length === 11 || digits.length === 10) {
    const area = digits.slice(0, 2);
    const number = digits.slice(2);
    return formatLocal(area, number);
  }

  return source;
}

export default function ContactsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [syncProgress, setSyncProgress] = useState<ContactsSyncProgress | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [selectedInstanceId, setSelectedInstanceId] = useState('');
  const [syncPreview, setSyncPreview] = useState<ContactsSyncPreview>({
    isLoading: false,
    totalRecords: null,
    totalDeviceContacts: null,
    previewContacts: [],
    error: null,
    instanceId: null,
  });

  const { company } = useAuthStore();
  const { canViewMessages, canManageMessages } = useWhatsappPermissions();
  const { data: contacts = [], isLoading } = useWhatsappContacts(company?.id);
  const { data: instances = [] } = useWhatsappInstances(company?.id);

  const syncContacts = useSyncWhatsappContacts();
  const previewContactsSync = usePreviewWhatsappContactsSync();
  const previewContactsMutate = previewContactsSync.mutateAsync;
  const exportContacts = useExportWhatsappContacts();
  const activeInstances = useMemo(
    () => instances.filter((i) => i.active && ['connected', 'connecting'].includes(i.status)),
    [instances]
  );
  const selectedInstance = useMemo(
    () => activeInstances.find((instance) => instance.id === selectedInstanceId) || null,
    [activeInstances, selectedInstanceId]
  );

  useEffect(() => {
    if (!isSyncModalOpen || selectedInstanceId || activeInstances.length === 0) return;
    setSelectedInstanceId(activeInstances[0].id);
  }, [activeInstances, isSyncModalOpen, selectedInstanceId]);

  const filteredContacts = useMemo(() => {
    if (!searchInput.trim()) return contacts;
    const query = searchInput.toLowerCase();
    return contacts.filter((contact) => {
      const displayName = resolveContactDisplayName(contact).toLowerCase();
      const phone = resolveContactPhone(contact)?.toLowerCase() || '';
      return displayName.includes(query) || phone.includes(query);
    });
  }, [contacts, searchInput]);

  const formatDate = useCallback((dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  }, []);

  const handleOpenSyncModal = useCallback(() => {
    if (!company?.id || instances.length === 0) {
      toast.error('Nenhuma instancia disponivel para sincronizacao');
      return;
    }
    if (activeInstances.length === 0) {
      toast.error('Nenhuma instancia ativa encontrada');
      return;
    }
    setIsSyncModalOpen(true);
  }, [activeInstances.length, company?.id, instances.length]);

  const handleLoadSyncPreview = useCallback(
    async (instance: WhatsappInstance) => {
      setSyncPreview({
        isLoading: true,
        totalRecords: null,
        totalDeviceContacts: null,
        previewContacts: [],
        error: null,
        instanceId: instance.id,
      });

      try {
        const result: any = await previewContactsMutate({ instance });
        const totalRecords = Number(result?.pagination?.totalRecords ?? 0);
        const totalDeviceContacts = Number(result?.pagination?.totalDeviceContacts ?? totalRecords);
        const previewContacts = Array.isArray(result?.previewContacts)
          ? result.previewContacts.slice(0, 10)
          : [];

        setSyncPreview({
          isLoading: false,
          totalRecords,
          totalDeviceContacts,
          previewContacts,
          error: null,
          instanceId: instance.id,
        });
      } catch (error: any) {
        setSyncPreview({
          isLoading: false,
          totalRecords: null,
          totalDeviceContacts: null,
          previewContacts: [],
          error: error.message || 'Falha ao consultar total de contatos',
          instanceId: instance.id,
        });
      }
    },
    [previewContactsMutate]
  );

  const handleInstanceSelection = useCallback(
    (instanceId: string) => {
      setSelectedInstanceId(instanceId);
      const instance = activeInstances.find((item) => item.id === instanceId);
      if (instance) {
        handleLoadSyncPreview(instance);
      }
    },
    [activeInstances, handleLoadSyncPreview]
  );

  useEffect(() => {
    if (!isSyncModalOpen || !selectedInstance) return;
    if (syncPreview.instanceId === selectedInstance.id) return;
    handleLoadSyncPreview(selectedInstance);
  }, [handleLoadSyncPreview, isSyncModalOpen, selectedInstance, syncPreview.instanceId]);

  const handleConfirmSyncContacts = useCallback(async () => {
    if (!selectedInstance) {
      toast.error('Selecione uma instancia para sincronizar');
      return;
    }

    setIsSyncModalOpen(false);

    try {
      let totalContacts = 0;
      let totalNew = 0;
      let totalUpdated = 0;

      setSyncProgress({
        isSyncing: true,
        totalInstances: 1,
        currentInstanceIndex: 1,
        currentInstanceName: selectedInstance.name,
        currentPage: 0,
        totalProcessed: 0,
        totalNew: 0,
        totalUpdated: 0,
        instanceStats: [
          {
            instanceId: selectedInstance.id,
            instanceName: selectedInstance.name,
            pages: 0,
            processed: 0,
            newContacts: 0,
            updatedContacts: 0,
          },
        ],
      });

      const PAGE_SIZE = 200;
      const MAX_PAGES_PER_INSTANCE = 100;
      let offset = 0;
      let pageCount = 0;

      while (pageCount < MAX_PAGES_PER_INSTANCE) {
        setSyncProgress((prev) =>
          prev
            ? {
                ...prev,
                currentPage: pageCount + 1,
              }
            : prev
        );

        const result: any = await syncContacts.mutateAsync({
          instance: selectedInstance,
          limit: PAGE_SIZE,
          offset,
        });

        const pageContacts = Number(result?.contacts || 0);
        const pageNew = Number(result?.newContacts || 0);
        const pageUpdated = Number(result?.updatedContacts || 0);

        totalContacts += pageContacts;
        totalNew += pageNew;
        totalUpdated += pageUpdated;

        setSyncProgress((prev) =>
          prev
            ? {
                ...prev,
                totalProcessed: prev.totalProcessed + pageContacts,
                totalNew: prev.totalNew + pageNew,
                totalUpdated: prev.totalUpdated + pageUpdated,
                instanceStats: prev.instanceStats.map((stats) =>
                  stats.instanceId === selectedInstance.id
                    ? {
                        ...stats,
                        pages: stats.pages + 1,
                        processed: stats.processed + pageContacts,
                        newContacts: stats.newContacts + pageNew,
                        updatedContacts: stats.updatedContacts + pageUpdated,
                      }
                    : stats
                ),
              }
            : prev
        );

        const hasNextPage = Boolean(result?.pagination?.hasNextPage);
        if (hasNextPage || pageContacts >= PAGE_SIZE) {
          offset += PAGE_SIZE;
          pageCount += 1;
          continue;
        }

        break;
      }

      setSyncProgress((prev) => (prev ? { ...prev, isSyncing: false } : prev));

      if (totalContacts === 0) {
        toast('Nenhum contato encontrado para esta instancia');
      } else {
        toast.success(
          `Sincronizacao concluida! ${totalNew} novos contatos, ${totalUpdated} atualizados.`
        );
      }
    } catch (error: any) {
      console.error('Erro ao sincronizar contatos:', error);
      setSyncProgress((prev) => (prev ? { ...prev, isSyncing: false } : prev));
      toast.error(error.message || 'Erro ao sincronizar contatos');
    }
  }, [selectedInstance, syncContacts]);

  const handleExportContacts = useCallback(async () => {
    if (!company?.id) {
      toast.error('Empresa nao identificada');
      return;
    }

    try {
      const result = await exportContacts.mutateAsync({ companyId: company.id });
      toast.success(`Exportacao concluida! ${result.total} contatos exportados.`);
    } catch (error: any) {
      console.error('Erro ao exportar contatos:', error);
      toast.error(error.message || 'Erro ao exportar contatos');
    }
  }, [company?.id, exportContacts]);

  const columns: ColumnDef<WhatsappContact>[] = useMemo(
    () => [
      {
        accessorKey: 'display_name',
        header: 'Contato',
        cell: ({ row }) => {
          const contact = row.original;
          const displayName = resolveContactDisplayName(contact);

          return (
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                {contact.profile_pic_url ? (
                  <>
                    <img
                      src={contact.profile_pic_url}
                      alt={displayName}
                      className="h-10 w-10 rounded-lg object-cover"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.classList.remove('hidden');
                      }}
                    />
                    <User className="hidden h-5 w-5 text-green-600 dark:text-green-400" />
                  </>
                ) : (
                  <User className="h-5 w-5 text-green-600 dark:text-green-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900 dark:text-white">{displayName}</p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'phone_number',
        header: 'Telefone',
        cell: ({ row }) => {
          const phone = resolveContactPhone(row.original);
          return (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {formatPhoneNumber(phone)}
            </span>
          );
        },
      },
      {
        accessorKey: 'is_group',
        header: 'Tipo',
        cell: ({ row }) => (
          <Badge variant={row.original.is_group ? 'info' : 'neutral'}>
            {row.original.is_group ? 'Grupo' : 'Individual'}
          </Badge>
        ),
      },
      {
        accessorKey: 'updated_at',
        header: 'Ultima atualizacao',
        cell: ({ row }) => (
          <div className="text-sm text-gray-500">{formatDate(row.original.updated_at)}</div>
        ),
      },
    ],
    [formatDate]
  );

  if (!canViewMessages) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
              Contatos
            </h1>
            <p className="text-sm text-gray-500">Lista de contatos do WhatsApp</p>
          </div>
        </div>
      </div>
    );
  }

  const emptyState = searchInput.trim() ? (
    <EmptyState
      icon={<User className="h-12 w-12 text-gray-400" />}
      title="Nenhum contato encontrado"
      description="Tente ajustar sua busca"
    />
  ) : (
    <EmptyState
      icon={<User className="h-12 w-12 text-gray-400" />}
      title="Nenhum contato encontrado"
      description="Os contatos aparecerao aqui quando voce comecar a receber mensagens do WhatsApp"
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Contatos
          </h1>
          <p className="text-sm text-gray-500">Lista de contatos do WhatsApp</p>
        </div>
        {canManageMessages && (
          <div className="flex gap-2">
            <Button
              variant="neutral"
              onClick={handleOpenSyncModal}
              disabled={!!syncProgress?.isSyncing || activeInstances.length === 0}
            >
              <RefreshCw className="h-4 w-4" />
              {syncProgress?.isSyncing ? 'Sincronizando...' : 'Atualizar'}
            </Button>
            <Button
              variant="neutral"
              onClick={handleExportContacts}
              disabled={exportContacts.isPending || contacts.length === 0}
            >
              <Download className="h-4 w-4" />
              {exportContacts.isPending ? 'Exportando...' : 'Exportar'}
            </Button>
          </div>
        )}
      </div>

      <Modal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        title="Sincronizar contatos"
        description="Selecione a instancia e confira o total estimado antes de iniciar."
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Instancia"
            value={selectedInstanceId}
            onChange={(value: string) => handleInstanceSelection(String(value))}
            options={activeInstances.map((instance) => ({
              value: instance.id,
              label: instance.name,
              description: instance.phone_number || instance.status,
            }))}
            placeholder="Selecione uma instancia"
          />

          <Card>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Pre-visualizacao do dispositivo
              </p>
              {syncPreview.isLoading ? (
                <p className="text-sm text-gray-500">Consultando total de contatos...</p>
              ) : syncPreview.error ? (
                <p className="text-sm text-red-500">{syncPreview.error}</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <div className="group relative flex items-center gap-1">
                      <Badge variant="info">
                        Total no dispositivo:{' '}
                        {syncPreview.totalDeviceContacts !== null
                          ? syncPreview.totalDeviceContacts
                          : '-'}
                      </Badge>
                      <CircleHelp className="h-3.5 w-3.5 text-gray-400" />
                      <div className="pointer-events-none absolute left-0 top-6 z-20 hidden w-64 rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-lg group-hover:block">
                        Total no dispositivo = agenda total do WhatsApp.
                      </div>
                    </div>
                    <div className="group relative flex items-center gap-1">
                      <Badge variant="neutral">
                        Total na API:{' '}
                        {syncPreview.totalRecords !== null ? syncPreview.totalRecords : '-'}
                      </Badge>
                      <CircleHelp className="h-3.5 w-3.5 text-gray-400" />
                      <div className="pointer-events-none absolute left-0 top-6 z-20 hidden w-64 rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-lg group-hover:block">
                        Total na API = contatos retornados pela API.
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900/40">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Amostra de contatos (ate 10)
                    </p>
                    {syncPreview.previewContacts.length === 0 ? (
                      <p className="text-xs text-gray-500">Nenhum contato na amostra.</p>
                    ) : (
                      <div className="max-h-44 space-y-1 overflow-auto">
                        {syncPreview.previewContacts.map((contact, index) => (
                          <div
                            key={`${contact.jid || 'contact'}-${index}`}
                            className="flex items-center justify-between rounded-md bg-white px-2 py-1 text-xs dark:bg-gray-800/70"
                          >
                            <span className="truncate text-gray-800 dark:text-gray-200">
                              {contact.displayName}
                            </span>
                            <span className="ml-2 truncate text-gray-500">
                              {formatPhoneNumber(contact.phone || contact.jid)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        <ModalFooter>
          <Button
            variant="neutral"
            onClick={() => selectedInstance && handleLoadSyncPreview(selectedInstance)}
            disabled={!selectedInstance || syncPreview.isLoading}
          >
            Atualizar total
          </Button>
          <Button
            onClick={handleConfirmSyncContacts}
            disabled={!selectedInstance || syncPreview.isLoading}
          >
            Iniciar sincronizacao
          </Button>
        </ModalFooter>
      </Modal>

      {syncProgress && (
        <Card>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={syncProgress.isSyncing ? 'warning' : 'success'}>
                {syncProgress.isSyncing ? 'Sincronizando' : 'Concluido'}
              </Badge>
              <Badge variant="neutral">
                Instancia {syncProgress.currentInstanceIndex}/{syncProgress.totalInstances}
              </Badge>
              <Badge variant="neutral">Pagina atual: {syncProgress.currentPage}</Badge>
            </div>

            {syncProgress.currentInstanceName && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Instancia atual:{' '}
                <span className="font-medium">{syncProgress.currentInstanceName}</span>
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Badge variant="info">Processados: {syncProgress.totalProcessed}</Badge>
              <Badge variant="success">Novos: {syncProgress.totalNew}</Badge>
              <Badge variant="neutral">Atualizados: {syncProgress.totalUpdated}</Badge>
            </div>

            <div className="space-y-2">
              {syncProgress.instanceStats.map((stats) => (
                <div
                  key={stats.instanceId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
                >
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {stats.instanceName}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="neutral">Paginas: {stats.pages}</Badge>
                    <Badge variant="info">Processados: {stats.processed}</Badge>
                    <Badge variant="success">Novos: {stats.newContacts}</Badge>
                    <Badge variant="neutral">Atualizados: {stats.updatedContacts}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Card padding="none">
        <div className="space-y-4 p-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative w-full sm:w-[30%]">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou telefone..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
          <DataTable
            data={filteredContacts}
            columns={columns}
            isLoading={isLoading}
            emptyState={emptyState}
          />
        </div>
      </Card>
    </div>
  );
}
