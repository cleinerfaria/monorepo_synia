import { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Loading,
  EmptyState,
} from '@/components/ui'
import { useRefSourcesWithStats, RefSourceWithStats } from '@/hooks/useReferenceTables'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import ReferenceSourceDetail from './ReferenceSourceDetail'
import ReferenceImportModal from './ReferenceImportModal'
import { Table, Upload, Clock, FileText, RefreshCw } from 'lucide-react'
// Source icons and colors
const sourceConfig: Record<string, { color: string; bgColor: string; description: string }> = {
  simpro: {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    description: 'Tabela de mat/med hospitalar',
  },
  brasindice: {
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    description: 'Guia farmacêutico com preços',
  },
  cmed: {
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    description: 'Preços regulados pela ANVISA',
  },
}

function getStatusInfo(source: RefSourceWithStats) {
  if (!source.last_batch) {
    return {
      label: 'Não importado',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100 dark:bg-gray-700',
    }
  }

  switch (source.last_batch.status) {
    case 'success':
      return {
        label: 'Atualizada',
        color: 'text-green-700 dark:text-green-300',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
      }
    case 'running':
      return {
        label: 'Importando...',
        color: 'text-blue-700 dark:text-blue-300',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      }
    case 'failed':
      return {
        label: 'Erro na importação',
        color: 'text-red-700 dark:text-red-300',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
      }
    case 'partial':
      return {
        label: 'Parcialmente importado',
        color: 'text-yellow-700 dark:text-yellow-300',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      }
    default:
      return {
        label: 'Pendente',
        color: 'text-gray-700 dark:text-gray-300',
        bgColor: 'bg-gray-100 dark:bg-gray-700',
      }
  }
}

export default function ReferenceTablesPage() {
  const { data: sources = [], isLoading, refetch } = useRefSourcesWithStats()

  const [selectedSource, setSelectedSource] = useState<RefSourceWithStats | null>(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importSource, setImportSource] = useState<RefSourceWithStats | null>(null)

  const handleOpenDetail = (source: RefSourceWithStats) => {
    setSelectedSource(source)
  }

  const handleCloseDetail = () => {
    setSelectedSource(null)
  }

  const handleOpenImport = (source: RefSourceWithStats) => {
    setImportSource(source)
    setIsImportModalOpen(true)
  }

  const handleCloseImport = () => {
    setIsImportModalOpen(false)
    setImportSource(null)
  }

  const handleImportSuccess = () => {
    refetch()
    handleCloseImport()
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Tabelas de Referência
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Gerencie tabelas de preços SIMPRO, BRASÍNDICE e CMED
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Sources Grid */}
      {sources.length === 0 ? (
        <EmptyState
          icon={<Table className="h-16 w-16" />}
          title="Nenhuma tabela configurada"
          description="As tabelas de referência serão exibidas aqui após a configuração inicial."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {sources.map((source) => {
            const config = sourceConfig[source.code] || {
              color: 'text-gray-600',
              bgColor: 'bg-gray-100',
              description: '',
            }
            const status = getStatusInfo(source)

            return (
              <div
                key={source.id}
                className="cursor-pointer"
                onClick={() => handleOpenDetail(source)}
              >
                <Card className="transition-shadow hover:shadow-lg">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 ${config.bgColor}`}>
                          <Table className={`h-6 w-6 ${config.color}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{source.name}</CardTitle>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {config.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${status.bgColor} ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    {/* Last Update */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Última atualização
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {source.last_batch?.finished_at
                          ? format(
                              new Date(source.last_batch.finished_at),
                              "dd/MM/yyyy 'às' HH:mm",
                              { locale: ptBR }
                            )
                          : 'Nunca'}
                      </span>
                    </div>

                    {/* Active Items */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Itens ativos</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {source.active_items_count.toLocaleString('pt-BR')}
                      </span>
                    </div>

                    {/* Variation */}
                    {source.variation && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-600 dark:text-green-400">
                          {source.variation.inserted} novos
                        </span>
                        <span className="text-blue-600 dark:text-blue-400">
                          {source.variation.updated} alterados
                        </span>
                        {source.variation.skipped > 0 && (
                          <span className="text-gray-500">
                            {source.variation.skipped} ignorados
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 border-t border-gray-100 pt-2 dark:border-gray-700">
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenImport(source)
                        }}
                      >
                        <Upload className="h-4 w-4" />
                        Importar
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenDetail(source)
                        }}
                      >
                        <Clock className="h-4 w-4" />
                        Histórico
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      )}

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Instruções de Importação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <h4 className="mb-2 font-medium text-gray-900 dark:text-white">BRASÍNDICE</h4>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>• Arquivo: CSV ou XLSX</li>
                <li>• Colunas: código, EAN, descrição, PMC, PF</li>
                <li>• Atualização: quinzenal</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-medium text-gray-900 dark:text-white">CMED</h4>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>• Arquivo: XLSX da ANVISA</li>
                <li>• Colunas: padrão ANVISA</li>
                <li>• Fonte: Portal ANVISA</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-medium text-gray-900 dark:text-white">SIMPRO</h4>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>• Arquivo: CSV ou XLSX</li>
                <li>• Colunas: código, descrição, preço</li>
                <li>• Atualização: mensal</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Drawer/Modal */}
      {selectedSource && (
        <ReferenceSourceDetail
          source={selectedSource}
          isOpen={!!selectedSource}
          onClose={handleCloseDetail}
          onImport={() => handleOpenImport(selectedSource)}
        />
      )}

      {/* Import Modal */}
      {importSource && (
        <ReferenceImportModal
          source={importSource}
          isOpen={isImportModalOpen}
          onClose={handleCloseImport}
          onSuccess={handleImportSuccess}
        />
      )}
    </div>
  )
}
