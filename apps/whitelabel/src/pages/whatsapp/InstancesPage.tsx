import { useCallback, useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Edit, LogOut, Plus, QrCode, RefreshCw, Smartphone, Trash, Loader2 } from 'lucide-react';
import { Card, Button, DataTable, EmptyState, Badge, Modal } from '@synia/ui';
import { useAuthStore } from '@/stores/authStore';
import {
  WhatsappInstance,
  useWhatsappInstances,
  useUpdateWhatsappInstance,
  useConnectWhatsappInstance,
  useDisconnectWhatsappInstance,
  useDeleteWhatsappInstance,
  useRefreshWhatsappInstanceStatus,
  useWhatsappInstanceLimits,
} from '@/hooks/useWhatsappInstances';
import { useWhatsappPermissions } from '@/hooks/useWhatsappPermissions';
import InstanceModal from '@/pages/whatsapp/InstanceModal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig: Record<
  string,
  {
    label: string;
    variant: 'success' | 'warning' | 'danger' | 'neutral';
  }
> = {
  connected: { label: 'Conectada', variant: 'success' },
  connecting: { label: 'Conectando', variant: 'warning' },
  disconnected: { label: 'Desconectada', variant: 'neutral' },
  error: { label: 'Erro', variant: 'danger' },
};

function resolveQrSource(value?: string | null) {
  if (!value) return null;
  if (value.startsWith('data:')) return value;
  return `data:image/png;base64,${value}`;
}

export default function InstancesPage() {
  const [searchInput, setSearchInput] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<WhatsappInstance | null>(null);
  const [qrInstance, setQrInstance] = useState<WhatsappInstance | null>(null);
  const [qrPayload, setQrPayload] = useState<{
    qrcode?: string;
    paircode?: string;
    status?: string;
  }>({});

  const { company } = useAuthStore();
  const { canManageInstances } = useWhatsappPermissions();
  const { data: instances = [], isLoading } = useWhatsappInstances(company?.id);
  const { data: limits } = useWhatsappInstanceLimits(company?.id);

  const _updateMutation = useUpdateWhatsappInstance();
  const connectMutation = useConnectWhatsappInstance();
  const disconnectMutation = useDisconnectWhatsappInstance();
  const deleteMutation = useDeleteWhatsappInstance();
  const refreshStatusMutation = useRefreshWhatsappInstanceStatus();

  const handleNewInstance = useCallback(() => {
    setSelectedInstance(null);
    setIsModalOpen(true);
  }, []);

  const handleEditInstance = useCallback((instance: WhatsappInstance) => {
    setSelectedInstance(instance);
    setIsModalOpen(true);
  }, []);

  const handleConnectInstance = useCallback(
    async (instance: WhatsappInstance) => {
      try {
        const result = await connectMutation.mutateAsync({ instance });
        const uazapiInstance = result.uazapi.instance;
        setQrInstance(result.instance);
        setQrPayload({
          qrcode: uazapiInstance?.qrcode,
          paircode: uazapiInstance?.paircode,
          status: uazapiInstance?.status,
        });
      } catch (error: any) {
        toast.error(error.message || 'Erro ao conectar instância');
      }
    },
    [connectMutation]
  );

  const handleDisconnectInstance = useCallback(
    async (instance: WhatsappInstance) => {
      if (!confirm(`Deseja desconectar a instância "${instance.name}"?`)) return;

      try {
        await disconnectMutation.mutateAsync(instance);
        toast.success('Instância desconectada');
      } catch (error: any) {
        toast.error(error.message || 'Erro ao desconectar instância');
      }
    },
    [disconnectMutation]
  );

  const handleDeleteInstance = useCallback(
    async (instance: WhatsappInstance) => {
      if (!confirm(`Deseja excluir a instância "${instance.name}"?`)) return;

      try {
        await deleteMutation.mutateAsync(instance);
        toast.success('Instância removida');
      } catch (error: any) {
        toast.error(error.message || 'Erro ao excluir instância');
      }
    },
    [deleteMutation]
  );

  const filteredInstances = useMemo(() => {
    if (!searchInput.trim()) return instances;
    const query = searchInput.toLowerCase();
    return instances.filter(
      (instance) =>
        instance.name.toLowerCase().includes(query) ||
        instance.provider_instance_id.toLowerCase().includes(query) ||
        (instance.phone_number || '').toLowerCase().includes(query)
    );
  }, [instances, searchInput]);

  const columns: ColumnDef<WhatsappInstance>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Instância',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <Smartphone className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-gray-900 dark:text-white">
                {row.original.name}
              </p>
              <p className="truncate text-sm text-gray-500">{row.original.provider_instance_id}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'phone_number',
        header: 'Numero',
        cell: ({ row }) => (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {row.original.phone_number || '---'}
          </span>
        ),
      },
      {
        accessorKey: 'sector',
        header: 'Setor',
        cell: ({ row }) =>
          row.original.sector ? (
            <Badge variant="neutral">{row.original.sector}</Badge>
          ) : (
            <span className="text-gray-400">---</span>
          ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const config = statusConfig[row.original.status] || statusConfig.disconnected;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        accessorKey: 'updated_at',
        header: 'Ultima atividade',
        cell: ({ row }) => {
          const value = row.original.last_seen_at || row.original.updated_at;
          return value ? (
            <span className="text-sm text-gray-500">
              {format(new Date(value), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </span>
          ) : (
            <span className="text-sm text-gray-400">---</span>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleConnectInstance(row.original);
              }}
              disabled={
                !canManageInstances ||
                row.original.status === 'connected' ||
                connectMutation.isPending
              }
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              title="Conectar"
            >
              {connectMutation.isPending &&
              connectMutation.variables?.instance?.id === row.original.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <QrCode className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDisconnectInstance(row.original);
              }}
              disabled={!canManageInstances || row.original.status !== 'connected'}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              title="Desconectar"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditInstance(row.original);
              }}
              disabled={!canManageInstances}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              title="Editar"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteInstance(row.original);
              }}
              disabled={!canManageInstances}
              className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/30"
              title="Excluir"
            >
              <Trash className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [
      canManageInstances,
      connectMutation,
      handleConnectInstance,
      handleDeleteInstance,
      handleDisconnectInstance,
      handleEditInstance,
    ]
  );

  const emptyState = (
    <EmptyState
      icon={<Smartphone className="h-12 w-12 text-gray-400" />}
      title="Nenhuma instância cadastrada"
      description="Crie sua primeira instância para conectar o WhatsApp"
      action={
        canManageInstances ? (
          <Button
            icon={<Plus className="mr-1 h-4 w-4" />}
            onClick={handleNewInstance}
            size="sm"
            data-testid="new-instance-btn-empty"
          >
            Nova instância
          </Button>
        ) : undefined
      }
    />
  );

  useEffect(() => {
    if (!qrInstance) return;

    const interval = setInterval(async () => {
      try {
        const result = await refreshStatusMutation.mutateAsync(qrInstance);
        const uazapiInstance = result.uazapi.instance;
        setQrPayload({
          qrcode: uazapiInstance?.qrcode,
          paircode: uazapiInstance?.paircode,
          status: uazapiInstance?.status,
        });

        if (uazapiInstance?.status === 'connected') {
          toast.success('Instância conectada!');
          setQrInstance(null);
        }
      } catch (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _e
      ) {
        console.error('Erro ao atualizar status da instância');
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [qrInstance, refreshStatusMutation]);

  const limitLabel = limits ? `${limits.activeCount} / ${limits.limit}` : '--';
  const isLimitReached = limits ? limits.activeCount >= limits.limit : false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Instâncias
          </h1>
          <div className="mt-2">
            <Badge variant="neutral">Instâncias: {limitLabel}</Badge>
          </div>
        </div>
        {canManageInstances && (
          <Button
            icon={<Plus className="mr-1 h-4 w-4" />}
            disabled={!company?.id || isLimitReached}
            data-testid="new-instance-btn"
          >
            Nova instância
          </Button>
        )}
      </div>
      {isLimitReached && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          Limite de instâncias atingido. Ajuste o plano para liberar novas conexões.
        </div>
      )}

      <Card padding="none">
        <div className="space-y-4 p-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative w-full sm:w-[30%]">
              <input
                type="text"
                placeholder="Buscar por nome, ID ou numero..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white py-2 pl-4 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
          <DataTable
            data={filteredInstances}
            columns={columns}
            isLoading={isLoading}
            onRowClick={canManageInstances ? handleEditInstance : undefined}
            emptyState={emptyState}
          />
        </div>
      </Card>

      <InstanceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedInstance(null);
        }}
        companyId={company?.id || ''}
        instance={selectedInstance}
      />

      <Modal
        isOpen={!!qrInstance}
        onClose={() => setQrInstance(null)}
        title="Conectar instância"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Status atual</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {qrPayload.status || qrInstance?.status || 'connecting'}
              </p>
            </div>
            <Button
              variant="neutral"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={() => qrInstance && refreshStatusMutation.mutateAsync(qrInstance)}
            >
              Atualizar
            </Button>
          </div>

          {qrPayload.qrcode ? (
            <div className="flex flex-col items-center gap-3">
              <img
                src={resolveQrSource(qrPayload.qrcode) || undefined}
                alt="QR Code"
                className="h-56 w-56 rounded-lg border border-gray-200 bg-white p-2"
              />
              <p className="text-sm text-gray-500">Escaneie o QR code no WhatsApp</p>
            </div>
          ) : qrPayload.paircode ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center">
              <p className="text-sm text-gray-500">Codigo de pareamento</p>
              <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                {qrPayload.paircode}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-lg bg-gray-50 p-6 text-center dark:bg-gray-800">
              <Loader2 className="text-primary-500 h-8 w-8 animate-spin" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Gerando QR Code</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Aguarde um momento...</p>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
