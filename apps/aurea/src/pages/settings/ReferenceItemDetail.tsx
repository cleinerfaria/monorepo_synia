import { Fragment, useState, useMemo } from 'react'
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
import { useRefPriceHistory, useRefCurrentPrices } from '@/hooks/useReferenceTables'
import type { RefItem, RefPriceHistory } from '@/types/database'
import { X, BarChart3, Tag } from 'lucide-react'
import { formatDateOnly, parseDateOnly } from '@/lib/dateOnly'
interface ReferenceItemDetailProps {
  item: RefItem
  isOpen: boolean
  onClose: () => void
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export default function ReferenceItemDetail({ item, isOpen, onClose }: ReferenceItemDetailProps) {
  const [selectedTab, setSelectedTab] = useState(0)
  const [selectedPriceType, setSelectedPriceType] = useState<string | undefined>()

  const { data: priceHistory = [], isLoading: loadingHistory } = useRefPriceHistory(
    item.id,
    selectedPriceType
  )
  const { data: currentPrices = [], isLoading: loadingCurrent } = useRefCurrentPrices(item.id)

  // Get unique price types
  const priceTypes = useMemo(() => {
    const types = new Set(priceHistory.map((p) => p.price_type))
    return Array.from(types).sort()
  }, [priceHistory])

  const tabs = [
    { name: 'Preços Atuais', icon: Tag },
    { name: 'Histórico', icon: BarChart3 },
  ]

  // Price history columns
  const historyColumns: ColumnDef<RefPriceHistory>[] = [
    {
      accessorKey: 'valid_from',
      header: 'Data de Vigência',
      cell: ({ row }) => (
        <span className="text-sm">{formatDateOnly(row.original.valid_from, 'dd/MM/yyyy')}</span>
      ),
    },
    {
      accessorKey: 'price_type',
      header: 'Tipo',
      cell: ({ row }) => (
        <span className="text-sm font-medium uppercase">{row.original.price_type}</span>
      ),
    },
    {
      accessorKey: 'price_value',
      header: 'Valor',
      cell: ({ row }) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {formatCurrency(row.original.price_value)}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Importado em',
      cell: ({ row }) => (
        <span className="text-sm text-gray-500">
          {row.original.created_at
            ? format(new Date(row.original.created_at), 'dd/MM/yyyy HH:mm', {
                locale: ptBR,
              })
            : '-'}
        </span>
      ),
    },
  ]

  // Calculate price variation for chart
  const _chartData = useMemo(() => {
    if (priceHistory.length === 0) return []

    // Group by price_type and sort by date
    const grouped: Record<string, RefPriceHistory[]> = {}
    priceHistory.forEach((p) => {
      if (!grouped[p.price_type]) grouped[p.price_type] = []
      grouped[p.price_type].push(p)
    })

    // Sort each group by date
    Object.keys(grouped).forEach((type) => {
      grouped[type].sort(
        (a, b) => parseDateOnly(a.valid_from).getTime() - parseDateOnly(b.valid_from).getTime()
      )
    })

    return grouped
  }, [priceHistory])

  // Get max price for chart scaling
  const maxPrice = useMemo(() => {
    if (priceHistory.length === 0) return 100
    return Math.max(...priceHistory.map((p) => p.price_value)) * 1.1
  }, [priceHistory])

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
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
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all dark:bg-gray-800">
                {/* Header */}
                <div className="border-b border-gray-200 p-6 dark:border-gray-700">
                  <div className="flex items-start justify-between">
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                        {item.product_name}
                      </Dialog.Title>
                      {item.presentation && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {item.presentation}
                          {item.concentration && ` • ${item.concentration}`}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>
                          <strong>Código:</strong> {item.external_code}
                        </span>
                        {item.ean && (
                          <span>
                            <strong>EAN:</strong> {item.ean}
                          </span>
                        )}
                        {item.manufacturer_name && (
                          <span>
                            <strong>Fabricante:</strong> {item.manufacturer_name}
                          </span>
                        )}
                        {(item.entry_unit || item.base_unit) && (
                          <span>
                            <strong>Unidade:</strong>{' '}
                            {item.entry_unit && (
                              <>
                                {item.entry_unit}
                                {item.quantity && ` x ${item.quantity}`}
                              </>
                            )}
                            {item.entry_unit && item.base_unit && ' → '}
                            {item.base_unit}
                          </span>
                        )}
                      </div>
                    </div>
                    <IconButton onClick={onClose}>
                      <X className="h-5 w-5" />
                    </IconButton>
                  </div>
                </div>

                {/* Content */}
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

                  <Tab.Panels className="max-h-[50vh] overflow-y-auto p-6">
                    {/* Current Prices Tab */}
                    <Tab.Panel>
                      {loadingCurrent ? (
                        <div className="flex justify-center py-8">
                          <Loading />
                        </div>
                      ) : currentPrices.length === 0 ? (
                        <EmptyState
                          icon={<Tag className="h-16 w-16" />}
                          title="Nenhum preço cadastrado"
                          description="Este item ainda não possui preços registrados."
                        />
                      ) : (
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                          {currentPrices.map((price) => (
                            <Card key={price.id}>
                              <CardContent className="p-4">
                                <p className="text-sm uppercase text-gray-500 dark:text-gray-400">
                                  {price.price_type}
                                </p>
                                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                                  {formatCurrency(price.price_value)}
                                </p>
                                <p className="mt-2 text-xs text-gray-500">
                                  Vigência: {formatDateOnly(price.valid_from, 'dd/MM/yyyy')}
                                </p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </Tab.Panel>

                    {/* History Tab */}
                    <Tab.Panel>
                      <div className="space-y-4">
                        {/* Price Type Filter */}
                        {priceTypes.length > 1 && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Filtrar por:</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSelectedPriceType(undefined)}
                                className={classNames(
                                  'rounded-full px-3 py-1 text-sm font-medium transition-colors',
                                  !selectedPriceType
                                    ? 'bg-primary-500/10 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                                )}
                              >
                                Todos
                              </button>
                              {priceTypes.map((type) => (
                                <button
                                  key={type}
                                  onClick={() => setSelectedPriceType(type)}
                                  className={classNames(
                                    'rounded-full px-3 py-1 text-sm font-medium uppercase transition-colors',
                                    selectedPriceType === type
                                      ? 'bg-primary-500/10 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                                  )}
                                >
                                  {type}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Simple Chart */}
                        {priceHistory.length > 1 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-sm">Evolução de Preços</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="flex h-40 items-end gap-1">
                                {priceHistory.slice(-20).map((price, _index) => {
                                  const height = (price.price_value / maxPrice) * 100
                                  const colorMap: Record<string, string> = {
                                    pmc: 'bg-blue-500',
                                    pf: 'bg-green-500',
                                    hospital: 'bg-purple-500',
                                  }
                                  const color =
                                    colorMap[price.price_type.toLowerCase()] || 'bg-gray-500'

                                  return (
                                    <div
                                      key={price.id}
                                      className="group flex flex-1 flex-col items-center"
                                    >
                                      <div className="relative w-full">
                                        <div
                                          className={`w-full ${color} rounded-t transition-all hover:opacity-80`}
                                          style={{ height: `${height}%`, minHeight: '4px' }}
                                        />
                                        <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 group-hover:block">
                                          <div className="whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white">
                                            {formatCurrency(price.price_value)}
                                            <br />
                                            {formatDateOnly(price.valid_from, 'dd/MM/yy')}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                              <div className="mt-2 flex justify-between text-xs text-gray-500">
                                <span>
                                  {priceHistory.length > 0 &&
                                    format(
                                      parseDateOnly(
                                        priceHistory[priceHistory.length - 1].valid_from
                                      ),
                                      'MMM/yy',
                                      { locale: ptBR }
                                    )}
                                </span>
                                <span>
                                  {priceHistory.length > 0 &&
                                    format(parseDateOnly(priceHistory[0].valid_from), 'MMM/yy', {
                                      locale: ptBR,
                                    })}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* History Table */}
                        {loadingHistory ? (
                          <div className="flex justify-center py-8">
                            <Loading />
                          </div>
                        ) : priceHistory.length === 0 ? (
                          <EmptyState
                            icon={<BarChart3 className="h-16 w-16" />}
                            title="Nenhum histórico"
                            description="Este item ainda não possui histórico de preços."
                          />
                        ) : (
                          <DataTable columns={historyColumns} data={priceHistory} />
                        )}
                      </div>
                    </Tab.Panel>
                  </Tab.Panels>
                </Tab.Group>

                {/* Footer */}
                <div className="flex items-center justify-end border-t border-gray-200 p-6 dark:border-gray-700">
                  <Button variant="secondary" onClick={onClose}>
                    Fechar
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
