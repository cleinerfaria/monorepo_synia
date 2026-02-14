import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { ClipboardCheck, Eye, SlidersHorizontal } from 'lucide-react';
import { Card, Button, DataTable, EmptyState, Badge } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useWhatsappPermissions } from '@/hooks/useWhatsappPermissions';
import { useWhatsappSessions, WhatsappSession } from '@/hooks/useWhatsappSessions';
import { useEvaluations } from '@/hooks/useWhatsappAspects';
import SessionDetailModal from '@/pages/whatsapp/SessionDetailModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusLabels: Record<string, { label: string; variant: 'warning' | 'success' | 'neutral' }> =
  {
    pending: { label: 'Pendente', variant: 'warning' },
    evaluated: { label: 'Avaliado', variant: 'success' },
    ignored: { label: 'Ignorado', variant: 'neutral' },
  };

export default function EvaluationsPage() {
  const { company } = useAuthStore();
  const { canManageEvaluations } = useWhatsappPermissions();
  const [searchInput, setSearchInput] = useState('');
  const [selectedSession, setSelectedSession] = useState<WhatsappSession | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: sessions = [], isLoading } = useWhatsappSessions(company?.id);
  const { data: evaluations = [] } = useEvaluations(company?.id);

  const filteredSessions = useMemo(() => {
    if (!searchInput.trim()) return sessions;
    const query = searchInput.toLowerCase();
    return sessions.filter((session) => {
      const contactName = session.conversation?.contact?.display_name || '';
      const phone = session.conversation?.contact?.phone_number || '';
      return contactName.toLowerCase().includes(query) || phone.toLowerCase().includes(query);
    });
  }, [sessions, searchInput]);

  const columns: ColumnDef<WhatsappSession>[] = useMemo(
    () => [
      {
        accessorKey: 'conversation',
        header: 'Contato',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {row.original.conversation?.contact?.display_name || 'Contato'}
            </p>
            <p className="text-sm text-gray-500">
              {row.original.conversation?.contact?.phone_number || '---'}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'instance',
        header: 'Instância',
        cell: ({ row }) => (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {row.original.instance?.name || '---'}
          </span>
        ),
      },
      {
        accessorKey: 'start_at',
        header: 'Inicio',
        cell: ({ row }) =>
          row.original.start_at ? (
            <span className="text-sm text-gray-600">
              {format(new Date(row.original.start_at), 'dd/MM HH:mm', { locale: ptBR })}
            </span>
          ) : (
            <span className="text-sm text-gray-400">---</span>
          ),
      },
      {
        accessorKey: 'end_at',
        header: 'Fim',
        cell: ({ row }) =>
          row.original.end_at ? (
            <span className="text-sm text-gray-600">
              {format(new Date(row.original.end_at), 'dd/MM HH:mm', { locale: ptBR })}
            </span>
          ) : (
            <span className="text-sm text-gray-400">---</span>
          ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const config = statusLabels[row.original.status] || statusLabels.pending;
          return <Badge variant={config.variant}>{config.label}</Badge>;
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
                setSelectedSession(row.original);
                setIsDetailOpen(true);
              }}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              title="Ver detalhes"
            >
              <Eye className="h-4 w-4" />
            </button>
            {canManageEvaluations && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSession(row.original);
                  setIsDetailOpen(true);
                }}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                title="Ajustar corte"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            )}
          </div>
        ),
      },
    ],
    [canManageEvaluations]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Avaliacoes
          </h1>
          <p className="text-sm text-gray-500">Acompanhe cortes de atendimento</p>
        </div>
        {canManageEvaluations && selectedSession && (
          <Button variant="secondary" onClick={() => setIsDetailOpen(true)}>
            <ClipboardCheck className="h-5 w-5" />
            Ver detalhes
          </Button>
        )}
      </div>

      <Card padding="none">
        <div className="space-y-4 p-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative w-full sm:w-[30%]">
              <input
                type="text"
                placeholder="Buscar atendimento..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white py-2 pl-4 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
          <DataTable
            data={filteredSessions}
            columns={columns}
            isLoading={isLoading}
            onRowClick={(row) => {
              setSelectedSession(row);
              setIsDetailOpen(true);
            }}
            emptyState={
              <EmptyState
                icon={<ClipboardCheck className="h-12 w-12 text-gray-400" />}
                title="Nenhum atendimento encontrado"
                description="As conversas serao convertidas em cortes automaticamente"
              />
            }
          />
        </div>
      </Card>

      <SessionDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        session={selectedSession}
        evaluations={evaluations}
        companyId={company?.id || ''}
      />
    </div>
  );
}
