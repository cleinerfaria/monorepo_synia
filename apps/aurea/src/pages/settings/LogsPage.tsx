import { useState, useMemo, useCallback } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import {
  Card,
  DataTable,
  Select,
  Badge,
  EmptyState,
  Modal,
  ModalFooter,
  Button,
} from '@/components/ui'
import { useUserActionLogs } from '@/hooks/useLogs'
import type { UserActionLog } from '@/types/logs'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search } from 'lucide-react'
const actionLabels = {
  create: 'Criação',
  update: 'Edição',
  delete: 'Exclusão',
}

const entityLabels = {
  client: 'Cliente',
  user: 'Usuário',
  product: 'Produto',
  patient: 'Paciente',
  professional: 'Profissional',
  prescription: 'Prescrição',
  nfe: 'Nota Fiscal',
}

export default function LogsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [selectedEntity, setSelectedEntity] = useState<string>('')
  const [selectedAction, setSelectedAction] = useState<string>('')
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<UserActionLog | null>(null)

  const { data: logs = [], isLoading } = useUserActionLogs({
    entity: selectedEntity || undefined,
    limit: 1000,
  })

  const openDetailsModal = useCallback((log: UserActionLog) => {
    setSelectedLog(log)
    setIsDetailsModalOpen(true)
  }, [])

  const closeDetailsModal = useCallback(() => {
    setIsDetailsModalOpen(false)
    setSelectedLog(null)
  }, [])

  const formatJson = (value?: Record<string, any>) => {
    if (!value || Object.keys(value).length === 0) return 'Sem dados'
    return JSON.stringify(value, null, 2)
  }

  const columns: ColumnDef<UserActionLog>[] = useMemo(
    () => [
      {
        accessorKey: 'created_at',
        header: 'Data/Hora',
        cell: ({ row }) => {
          const date = new Date(row.original.created_at)
          return (
            <div className="text-sm">
              <div className="font-medium text-gray-900 dark:text-white">
                {date.toLocaleDateString('pt-BR')}
              </div>
              <div className="text-gray-500">
                {date.toLocaleTimeString('pt-BR')} •{' '}
                {formatDistanceToNow(date, {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'app_user',
        header: 'Usuário',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {row.original.app_user?.name || 'Sistema'}
            </p>
            <p className="text-sm text-gray-500">{row.original.app_user?.email || '-'}</p>
          </div>
        ),
      },
      {
        accessorKey: 'action',
        header: 'Ação',
        cell: ({ row }) => {
          const action = row.original.action
          const variant =
            action === 'create' ? 'success' : action === 'update' ? 'warning' : 'danger'

          return <Badge variant={variant}>{actionLabels[action] || action}</Badge>
        },
      },
      {
        accessorKey: 'entity',
        header: 'Entidade',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {entityLabels[row.original.entity as keyof typeof entityLabels] ||
                row.original.entity}
            </p>
            {row.original.entity_name && (
              <p className="text-sm text-gray-500">{row.original.entity_name}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'details',
        header: 'Detalhes',
        cell: ({ row }) => {
          const { old_data, new_data } = row.original
          let changesText = ''

          if (row.original.action === 'create' && new_data) {
            changesText = 'Registro criado'
          } else if (row.original.action === 'delete' && old_data) {
            changesText = 'Registro excluído'
          } else if (row.original.action === 'update' && old_data && new_data) {
            const changes: string[] = []
            Object.keys(new_data).forEach((key) => {
              if (old_data[key] !== new_data[key]) {
                changes.push(key)
              }
            })
            changesText =
              changes.length > 0 ? `Alterado: ${changes.join(', ')}` : 'Dados atualizados'
          }

          return (
            <div className="max-w-xs truncate text-sm text-gray-600 dark:text-gray-400">
              {changesText || '-'}
            </div>
          )
        },
      },
      {
        id: 'data',
        header: 'Dados',
        cell: ({ row }) => (
          <Button size="sm" variant="secondary" onClick={() => openDetailsModal(row.original)}>
            Ver dados
          </Button>
        ),
      },
    ],
    [openDetailsModal]
  )

  const entityOptions = [
    { value: '', label: 'Todas as entidades' },
    { value: 'client', label: 'Clientes' },
    { value: 'user', label: 'Usuários' },
    { value: 'product', label: 'Produtos' },
    { value: 'patient', label: 'Pacientes' },
    { value: 'professional', label: 'Profissionais' },
    { value: 'prescription', label: 'Prescrições' },
    { value: 'nfe', label: 'Notas Fiscais' },
  ]

  const actionOptions = [
    { value: '', label: 'Todas as ações' },
    { value: 'create', label: 'Criação' },
    { value: 'update', label: 'Edição' },
    { value: 'delete', label: 'Exclusão' },
  ]

  const filteredLogs = useMemo(() => {
    let filtered = logs

    if (selectedAction) {
      filtered = filtered.filter((log) => log.action === selectedAction)
    }

    if (searchInput.trim()) {
      const query = searchInput.toLowerCase()
      filtered = filtered.filter(
        (log) =>
          log.entity_name?.toLowerCase().includes(query) ||
          log.app_user?.name?.toLowerCase().includes(query) ||
          log.app_user?.email?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [logs, selectedAction, searchInput])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Logs de Ações
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Histórico de ações realizadas no sistema
          </p>
        </div>
      </div>

      {/* Table */}
      <Card padding="none">
        <div className="space-y-4 p-6">
          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative w-full sm:w-[30%]">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou usuário..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="w-full sm:w-[200px]">
              <Select
                options={entityOptions}
                value={selectedEntity}
                onChange={(value: string) => setSelectedEntity(value)}
                placeholder="Filtrar por entidade"
              />
            </div>

            <div className="w-full sm:w-[200px]">
              <Select
                options={actionOptions}
                value={selectedAction}
                onChange={(value: string) => setSelectedAction(value)}
                placeholder="Filtrar por ação"
              />
            </div>
          </div>

          <DataTable
            data={filteredLogs}
            columns={columns}
            isLoading={isLoading}
            emptyState={
              <EmptyState
                title="Nenhum log encontrado"
                description="Não há logs para os filtros selecionados"
              />
            }
          />
        </div>
      </Card>

      <Modal isOpen={isDetailsModalOpen} onClose={closeDetailsModal} title="Dados do log" size="lg">
        <div className="space-y-6">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
              Dados anteriores
            </h4>
            <pre className="max-h-64 overflow-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-800 dark:bg-gray-900 dark:text-gray-200">
              {formatJson(selectedLog?.old_data)}
            </pre>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
              Dados atuais
            </h4>
            <pre className="max-h-64 overflow-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-800 dark:bg-gray-900 dark:text-gray-200">
              {formatJson(selectedLog?.new_data)}
            </pre>
          </div>
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={closeDetailsModal}>
            Fechar
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
