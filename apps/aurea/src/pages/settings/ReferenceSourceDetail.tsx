import { useState, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { Dialog, Transition, Tab } from '@headlessui/react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ColumnDef } from '@tanstack/react-table'
import {
  Button,
  DataTable,
  Loading,
  EmptyState,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  IconButton,
} from '@/components/ui'
import {
  RefSourceWithStats,
  useRefImportBatches,
  useRefItems,
  useRefCategories,
  useResetStuckImports,
  useDeleteImportBatch,
} from '@/hooks/useReferenceTables'
import type { RefItemWithPrices } from '@/hooks/useReferenceTables'
import type { RefImportBatch } from '@/types/database'
import ReferenceItemDetail from './ReferenceItemDetail'
import {
  X,
  Clock,
  Table,
  Settings,
  Upload,
  AlertTriangle,
  CheckCircle,
  Search,
  Trash2,
  Ban,
} from 'lucide-react'
interface ReferenceSourceDetailProps {
  source: RefSourceWithStats
  isOpen: boolean
  onClose: () => void
  onImport: () => void
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

// Helper function to format seconds to HH:MM:SS
function formatDurationSeconds(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }
  return `${minutes}m ${secs}s`
}

export default function ReferenceSourceDetail({
  source,
  isOpen,
  onClose,
  onImport,
}: ReferenceSourceDetailProps) {
  const [selectedTab, setSelectedTab] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedItem, setSelectedItem] = useState<RefItemWithPrices | null>(null)
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [batchToDelete, setBatchToDelete] = useState<RefImportBatch | null>(null)

  const { data: batches = [], isLoading: loadingBatches } = useRefImportBatches(source.id)
  const { data: items = [], isLoading: loadingItems } = useRefItems(source.id, {
    search: searchTerm || undefined,
    category: selectedCategory || undefined,
    isActive: true,
  })
  const { data: categories = [] } = useRefCategories(source.id)
  const resetStuckImports = useResetStuckImports()
  const deleteImportBatch = useDeleteImportBatch()

  const hasStuckImports = batches.some((b) => b.status === 'running')

  const handleDeleteBatch = (batch: RefImportBatch) => {
    setBatchToDelete(batch)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!batchToDelete) return

    setDeletingBatchId(batchToDelete.id)
    try {
      await deleteImportBatch.mutateAsync(batchToDelete.id)
      setShowDeleteConfirm(false)
      setBatchToDelete(null)
    } catch {
      // Erro tratado pelo toast no hook
    } finally {
      setDeletingBatchId(null)
    }
  }

  const tabs = [
    { name: 'Importações', icon: Clock },
    { name: 'Itens / Preços', icon: Table },
    { name: 'Configuração', icon: Settings },
  ]

  // Import batch columns
  const batchColumns: ColumnDef<RefImportBatch>[] = [
    {
      accessorKey: 'created_at',
      header: 'Data',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.created_at
            ? format(new Date(row.original.created_at), 'dd/MM/yyyy HH:mm', {
                locale: ptBR,
              })
            : '-'}
        </span>
      ),
    },
    {
      accessorKey: 'file_name',
      header: 'Arquivo',
      cell: ({ row }) => (
        <span
          className="block max-w-[200px] truncate text-sm font-medium"
          title={row.original.file_name || '-'}
        >
          {row.original.file_name || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status
        const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
          success: {
            color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
            icon: CheckCircle,
            label: 'Sucesso',
          },
          failed: {
            color: 'text-red-600 bg-red-100 dark:bg-red-900/30',
            icon: AlertTriangle,
            label: 'Erro',
          },
          running: {
            color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
            icon: Clock,
            label: 'Executando',
          },
          partial: {
            color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
            icon: AlertTriangle,
            label: 'Parcial',
          },
          pending: {
            color: 'text-gray-600 bg-gray-100 dark:bg-gray-700',
            icon: Clock,
            label: 'Pendente',
          },
          cancelled: {
            color: 'text-gray-500 bg-gray-100 dark:bg-gray-700',
            icon: Ban,
            label: 'Cancelada',
          },
        }
        const config = statusConfig[status] || statusConfig.pending
        const Icon = config.icon

        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${config.color}`}
          >
            <Icon className="h-3 w-3" />
            {config.label}
          </span>
        )
      },
    },
    {
      accessorKey: 'rows_read',
      header: 'Lidos',
      cell: ({ row }) => (
        <span className="text-sm">{(row.original.rows_read ?? 0).toLocaleString('pt-BR')}</span>
      ),
    },
    {
      accessorKey: 'rows_inserted',
      header: 'Inseridos',
      cell: ({ row }) => (
        <span className="text-sm text-green-600">
          {(row.original.rows_inserted ?? 0).toLocaleString('pt-BR')}
        </span>
      ),
    },
    {
      accessorKey: 'rows_updated',
      header: 'Alterados',
      cell: ({ row }) => (
        <span className="text-sm text-blue-600">
          {(row.original.rows_updated ?? 0).toLocaleString('pt-BR')}
        </span>
      ),
    },
    {
      accessorKey: 'rows_error',
      header: 'Erros',
      cell: ({ row }) => (
        <span className={`text-sm ${(row.original.rows_error ?? 0) > 0 ? 'text-red-600' : ''}`}>
          {(row.original.rows_error ?? 0).toLocaleString('pt-BR')}
        </span>
      ),
    },
    {
      id: 'duration',
      header: 'Duração',
      cell: ({ row }) => {
        if (!row.original.started_at || !row.original.finished_at) return '-'
        const start = new Date(row.original.started_at).getTime()
        const end = new Date(row.original.finished_at).getTime()
        const duration = Math.round((end - start) / 1000)
        return <span className="text-sm">{formatDurationSeconds(duration)}</span>
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const batch = row.original
        // Only show delete button for success or partial imports that haven't been cancelled or failed
        const canDelete = batch.status === 'success' || batch.status === 'partial'
        const isDeleting = deletingBatchId === batch.id

        // Don't show button if status doesn't allow deletion
        if (!canDelete) return null

        return (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteBatch(batch)
            }}
            disabled={isDeleting}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            title="Cancelar importação e remover preços"
          >
            <Trash2 className={`h-4 w-4 ${isDeleting ? 'animate-pulse' : ''}`} />
          </button>
        )
      },
    },
  ]

  // Item columns
  const itemColumns: ColumnDef<RefItemWithPrices>[] = [
    {
      accessorKey: 'external_code',
      header: 'Código',
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.external_code}</span>,
    },
    {
      accessorKey: 'product_name',
      header: 'Produto',
      cell: ({ row }) => (
        <div className="max-w-[250px]">
          <span className="block truncate text-sm font-medium">{row.original.product_name}</span>
          {row.original.presentation && (
            <span className="block truncate text-xs text-gray-500">
              {row.original.presentation}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'concentration',
      header: 'Concentração',
      cell: ({ row }) => <span className="text-sm">{row.original.concentration || '-'}</span>,
    },
    {
      accessorKey: 'ean',
      header: 'EAN',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-gray-500">{row.original.ean || '-'}</span>
      ),
    },
    {
      accessorKey: 'manufacturer_name',
      header: 'Fabricante',
      cell: ({ row }) => <span className="text-sm">{row.original.manufacturer_name || '-'}</span>,
    },
    {
      accessorKey: 'category',
      header: 'Categoria',
      cell: ({ row }) => <span className="text-sm">{row.original.category || '-'}</span>,
    },
    {
      accessorKey: 'pf',
      header: 'PF',
      cell: ({ row }) => {
        const prices = row.original.current_prices
        const pfPrice = prices?.find(
          (p: any) => p.price_type === 'PF' || p.price_type === 'pf' || p.price_type?.includes('PF')
        )
        if (!pfPrice) {
          return <span className="text-sm text-gray-500">-</span>
        }
        return (
          <span className="font-mono text-sm font-medium">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: pfPrice.currency || 'BRL',
            }).format(pfPrice.price_value)}
          </span>
        )
      },
    },
    {
      accessorKey: 'pmc',
      header: 'PMC',
      cell: ({ row }) => {
        const prices = row.original.current_prices
        const pmcPrice = prices?.find(
          (p: any) =>
            p.price_type === 'PMC' || p.price_type === 'pmc' || p.price_type?.includes('PMC')
        )
        if (!pmcPrice) {
          return <span className="text-sm text-gray-500">-</span>
        }
        return (
          <span className="font-mono text-sm font-medium">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: pmcPrice.currency || 'BRL',
            }).format(pmcPrice.price_value)}
          </span>
        )
      },
    },
  ]

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="flex h-screen max-h-[90vh] w-full max-w-[104rem] transform flex-col overflow-hidden rounded-2xl bg-white shadow-xl transition-all dark:bg-gray-800">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
                    <div>
                      <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
                        {source.name}
                      </Dialog.Title>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {source.active_items_count.toLocaleString('pt-BR')} itens ativos •{' '}
                        {source.total_imports} importações
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasStuckImports && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => resetStuckImports.mutate()}
                          disabled={resetStuckImports.isPending}
                        >
                          <AlertTriangle className="h-4 w-4" />
                          Resetar Presas
                        </Button>
                      )}
                      <Button variant="primary" size="sm" onClick={onImport}>
                        <Upload className="h-4 w-4" />
                        Importar Agora
                      </Button>
                      <IconButton onClick={onClose}>
                        <X className="h-5 w-5" />
                      </IconButton>
                    </div>
                  </div>

                  {/* Tabs */}
                  <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
                    <Tab.List className="flex border-b border-gray-200 px-6 dark:border-gray-700">
                      {tabs.map((tab) => (
                        <Tab
                          key={tab.name}
                          className={({ selected }) =>
                            classNames(
                              'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium outline-none transition-colors',
                              selected
                                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                            )
                          }
                        >
                          <tab.icon className="h-4 w-4" />
                          {tab.name}
                        </Tab>
                      ))}
                    </Tab.List>

                    <Tab.Panels className="flex-1 overflow-y-auto p-6">
                      {/* Importações Tab */}
                      <Tab.Panel>
                        {loadingBatches ? (
                          <div className="flex justify-center py-8">
                            <Loading />
                          </div>
                        ) : batches.length === 0 ? (
                          <EmptyState
                            icon={<Clock className="h-16 w-16" />}
                            title="Nenhuma importação realizada"
                            description="Importe um arquivo para começar a usar esta tabela de referência."
                            action={<Button onClick={onImport}>Importar Agora</Button>}
                          />
                        ) : (
                          <DataTable columns={batchColumns} data={batches} />
                        )}
                      </Tab.Panel>

                      {/* Itens / Preços Tab */}
                      <Tab.Panel>
                        <div className="space-y-4">
                          {/* Filters */}
                          <div className="flex gap-4">
                            <div className="flex-1">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                  type="text"
                                  placeholder="Buscar por código, descrição ou EAN..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                              </div>
                            </div>
                            <select
                              value={selectedCategory}
                              onChange={(e) => setSelectedCategory(e.target.value)}
                              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            >
                              <option value="">Todas as categorias</option>
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Items Table */}
                          {loadingItems ? (
                            <div className="flex justify-center py-8">
                              <Loading />
                            </div>
                          ) : items.length === 0 ? (
                            <EmptyState
                              icon={<Table className="h-16 w-16" />}
                              title="Nenhum item encontrado"
                              description={
                                searchTerm || selectedCategory
                                  ? 'Tente ajustar os filtros de busca.'
                                  : 'Importe um arquivo para cadastrar itens.'
                              }
                            />
                          ) : (
                            <DataTable columns={itemColumns} data={items} />
                          )}
                        </div>
                      </Tab.Panel>

                      {/* Configuração Tab */}
                      <Tab.Panel>
                        <div className="space-y-6">
                          <Card>
                            <CardHeader>
                              <CardTitle>Configurações do Importador</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-1 gap-4">
                                <div>
                                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Tipos de Arquivo Aceitos
                                  </label>
                                  <p className="text-sm text-gray-500">
                                    {source.code === 'cmed' && 'XLSX'}
                                    {source.code === 'simpro' && 'XML'}
                                    {source.code === 'brasindice' && 'TXT'}
                                  </p>
                                </div>
                              </div>

                              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/30">
                                <p className="text-sm text-blue-900 dark:text-blue-100">
                                  <span className="font-medium">Importante:</span> Selecione a
                                  alíquota correta para o estado durante a importação para garantir
                                  a precisão dos preços.
                                </p>
                              </div>

                              <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Colunas Esperadas
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {source.code === 'cmed' &&
                                    ['código', 'descrição', 'ean', 'fabricante', 'pmc', 'pf'].map(
                                      (col) => (
                                        <span
                                          key={col}
                                          className="rounded bg-gray-100 px-2 py-1 text-sm dark:bg-gray-700"
                                        >
                                          {col}
                                        </span>
                                      )
                                    )}
                                  {source.code === 'simpro' &&
                                    ['código', 'descrição', 'preço_pf', 'preço_pmc'].map((col) => (
                                      <span
                                        key={col}
                                        className="rounded bg-gray-100 px-2 py-1 text-sm dark:bg-gray-700"
                                      >
                                        {col}
                                      </span>
                                    ))}
                                  {source.code === 'brasindice' &&
                                    ['código', 'descrição', 'ean', 'pmc', 'pf'].map((col) => (
                                      <span
                                        key={col}
                                        className="rounded bg-gray-100 px-2 py-1 text-sm dark:bg-gray-700"
                                      >
                                        {col}
                                      </span>
                                    ))}
                                </div>
                              </div>

                              {source.code === 'cmed' && (
                                <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                                  <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                                    Os arquivos CMED podem ser baixados do site oficial da ANVISA:
                                  </p>
                                  <a
                                    href="https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                                  >
                                    https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos
                                  </a>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </Tab.Panel>
                    </Tab.Panels>
                  </Tab.Group>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Delete Confirmation Modal - usando Portal para renderizar fora do Dialog principal */}
      {showDeleteConfirm &&
        batchToDelete &&
        createPortal(
          <div className="fixed inset-0 z-[60] overflow-y-auto">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation()
                if (deletingBatchId !== batchToDelete.id) {
                  setShowDeleteConfirm(false)
                  setBatchToDelete(null)
                }
              }}
            />

            {/* Modal container */}
            <div className="pointer-events-none fixed inset-0 flex items-center justify-center p-4">
              <div
                className="pointer-events-auto w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  {deletingBatchId === batchToDelete.id ? (
                    // Progress view during deletion
                    <div className="py-4 text-center">
                      <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
                      </div>
                      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                        Removendo registros...
                      </h3>
                      <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                        Aguarde enquanto os registros de preço são removidos.
                      </p>
                      <div className="space-y-2 rounded-lg bg-gray-50 p-4 text-left dark:bg-gray-900/50">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
                          <span className="text-gray-600 dark:text-gray-300">
                            Verificando lote de importação...
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
                          <span className="text-gray-600 dark:text-gray-300">
                            Deletando registros de preço...
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-transparent" />
                          <span className="text-gray-400 dark:text-gray-500">
                            Atualizando status...
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Confirmation view
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Cancelar importação?
                        </h3>
                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                          Os registros de preço da importação serão removidos:
                        </p>
                        <p
                          className="mt-1 break-all text-sm font-medium text-gray-800 dark:text-gray-200"
                          title={batchToDelete.file_name || ''}
                        >
                          {batchToDelete.file_name}
                        </p>
                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                          Os itens importados serão mantidos, apenas os preços associados a esta
                          importação serão deletados.
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                          <button
                            type="button"
                            className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                            onClick={() => {
                              setShowDeleteConfirm(false)
                              setBatchToDelete(null)
                            }}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-red-600"
                            onClick={() => confirmDelete()}
                          >
                            <Trash2 className="h-4 w-4" />
                            Sim, remover preços
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {selectedItem && (
        <ReferenceItemDetail
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  )
}
