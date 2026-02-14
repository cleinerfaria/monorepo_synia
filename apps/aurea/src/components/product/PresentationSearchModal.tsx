import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Modal, Button, Input, Loading, EmptyState, ListPagination } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import type { RefItemUnified, ProductPresentation } from '@/types/database'
import toast from 'react-hot-toast'
import { useListPageState } from '@/hooks/useListPageState'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { Search, Link, X, Filter, Check } from 'lucide-react'
const PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE

interface SearchFilters {
  nome: string
  fabricante: string
  concentration: string
  substance: string
  tiss: string
  tuss: string
  ggrem: string
  brasindice: string
  simpro: string
  ean: string
}

const emptyFilters: SearchFilters = {
  nome: '',
  fabricante: '',
  concentration: '',
  substance: '',
  tiss: '',
  tuss: '',
  ggrem: '',
  brasindice: '',
  simpro: '',
  ean: '',
}

interface PresentationSearchModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  productName: string
  productConcentration?: string
  existingPresentations: ProductPresentation[]
  onSelectItem: (item: RefItemUnified) => void
}

/**
 * Hook para buscar itens da view vw_ref_item_unified com filtros avançados e paginação
 */
function useSearchRefItemsUnifiedAdvanced(
  filters: SearchFilters,
  page: number,
  pageSize: number = PAGE_SIZE
) {
  return useQuery({
    queryKey: ['ref-items-unified-advanced', filters, page, pageSize],
    queryFn: async () => {
      // Check if at least one filter is active
      const hasActiveFilter = Object.values(filters).some((v) => v.trim().length >= 2)
      if (!hasActiveFilter) {
        return { data: [], totalCount: 0 }
      }

      let query = supabase.from('vw_ref_item_unified').select('*', { count: 'exact' })

      // Apply filters
      // O campo "name" busca também na substância (princípio ativo)
      if (filters.nome.trim().length >= 2) {
        const searchTerm = filters.nome.trim()
        query = query.or(`name.ilike.%${searchTerm}%,substance.ilike.%${searchTerm}%`)
      }
      if (filters.fabricante.trim().length >= 2) {
        query = query.ilike('manufacturer', `%${filters.fabricante.trim()}%`)
      }
      if (filters.concentration.trim().length >= 1) {
        query = query.ilike('concentration', `%${filters.concentration.trim()}%`)
      }
      if (filters.substance.trim().length >= 2) {
        query = query.ilike('substance', `%${filters.substance.trim()}%`)
      }
      if (filters.tiss.trim()) {
        query = query.ilike('tiss', `%${filters.tiss.trim()}%`)
      }
      if (filters.tuss.trim()) {
        query = query.ilike('tuss', `%${filters.tuss.trim()}%`)
      }
      if (filters.ggrem.trim()) {
        query = query.ilike('ggrem_code', `%${filters.ggrem.trim()}%`)
      }
      if (filters.brasindice.trim()) {
        query = query.ilike('brasindice_code', `%${filters.brasindice.trim()}%`)
      }
      if (filters.simpro.trim()) {
        query = query.ilike('simpro_code', `%${filters.simpro.trim()}%`)
      }
      if (filters.ean.trim()) {
        query = query.ilike('ean', `%${filters.ean.trim()}%`)
      }

      // Pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data, error, count } = await query.order('name').range(from, to)

      if (error) throw error
      return {
        data: data as RefItemUnified[],
        totalCount: count || 0,
      }
    },
    enabled: Object.values(filters).some((v) => v.trim().length >= 2),
    staleTime: 30000,
  })
}

export default function PresentationSearchModal({
  isOpen,
  onClose,
  productId: _productId,
  productName,
  productConcentration,
  existingPresentations,
  onSelectItem,
}: PresentationSearchModalProps) {
  const [filters, setFilters] = useState<SearchFilters>(emptyFilters)
  const [debouncedFilters, setDebouncedFilters] = useState<SearchFilters>(emptyFilters)
  const [currentPage, setCurrentPage] = useListPageState({
    storageKey: 'presentation-search-modal-page',
  })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Função para remover acentos e ç
  const removeAccents = (text: string): string => {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos
      .replace(/ç/g, 'c')
      .replace(/Ç/g, 'C')
  }

  // Debounce filters
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [filters, setCurrentPage])

  // Reset filters when modal opens
  useEffect(() => {
    if (isOpen) {
      const cleanedProductName = removeAccents(productName)
      setFilters({ ...emptyFilters, nome: cleanedProductName })
      setDebouncedFilters({ ...emptyFilters, nome: cleanedProductName })
      setCurrentPage(1)
      setShowAdvancedFilters(false)
    }
  }, [isOpen, productName, setCurrentPage])

  const { data: searchResult, isLoading } = useSearchRefItemsUnifiedAdvanced(
    debouncedFilters,
    currentPage,
    PAGE_SIZE
  )

  const items = searchResult?.data ?? []
  const totalCount = searchResult?.totalCount ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Check if EAN already exists in presentations
  const existingEans = useMemo(() => {
    return new Set(
      existingPresentations
        .map((p) => p.barcode)
        .filter((barcode): barcode is string => Boolean(barcode))
    )
  }, [existingPresentations])

  const handleFilterChange = useCallback((field: keyof SearchFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(emptyFilters)
  }, [])

  const hasActiveFilters = Object.values(filters).some((v) => v.trim().length > 0)

  const handleSelectItem = useCallback(
    (item: RefItemUnified) => {
      onSelectItem(item)
      toast.success(`Apresentação selecionada: ${item.name}`)
    },
    [onSelectItem]
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Buscar Apresentação nas Tabelas de Referência — Produto: ${productName}${productConcentration ? ` ${productConcentration}` : ''}`}
      size="screen"
      static
    >
      <div className="flex h-full flex-col overflow-hidden p-1">
        {/* Filtros */}
        <div className="mb-3 flex-shrink-0 space-y-2">
          {/* Filtro principal - Nome */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, posologia..."
                value={filters.nome}
                onChange={(e) => handleFilterChange('nome', e.target.value)}
                className="focus:border-primary-500 focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant={showAdvancedFilters ? 'primary' : 'secondary'}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
            {hasActiveFilters && (
              <Button type="button" size="sm" variant="secondary" onClick={clearFilters}>
                <X className="h-4 w-4" />
                Limpar
              </Button>
            )}
          </div>

          {/* Filtros avançados */}
          {showAdvancedFilters && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
              <div className="grid grid-cols-3 gap-2 md:grid-cols-9">
                <Input
                  label="Fabricante"
                  placeholder="Fabricante..."
                  value={filters.fabricante}
                  onChange={(e) => handleFilterChange('fabricante', e.target.value)}
                  inputSize="sm"
                />
                <Input
                  label="Concentração"
                  placeholder="500mg..."
                  value={filters.concentration}
                  onChange={(e) => handleFilterChange('concentration', e.target.value)}
                  inputSize="sm"
                />
                <Input
                  label="EAN"
                  placeholder="EAN..."
                  value={filters.ean}
                  onChange={(e) => handleFilterChange('ean', e.target.value)}
                  inputSize="sm"
                />
                <Input
                  label="Substância"
                  placeholder="Substância..."
                  value={filters.substance}
                  onChange={(e) => handleFilterChange('substance', e.target.value)}
                  inputSize="sm"
                />
                <Input
                  label="TISS"
                  placeholder="TISS"
                  value={filters.tiss}
                  onChange={(e) => handleFilterChange('tiss', e.target.value)}
                  inputSize="sm"
                />
                <Input
                  label="TUSS"
                  placeholder="TUSS"
                  value={filters.tuss}
                  onChange={(e) => handleFilterChange('tuss', e.target.value)}
                  inputSize="sm"
                />
                <Input
                  label="GGREM"
                  placeholder="GGREM"
                  value={filters.ggrem}
                  onChange={(e) => handleFilterChange('ggrem', e.target.value)}
                  inputSize="sm"
                />
                <Input
                  label="Brasíndice"
                  placeholder="Brasíndice"
                  value={filters.brasindice}
                  onChange={(e) => handleFilterChange('brasindice', e.target.value)}
                  inputSize="sm"
                />
                <Input
                  label="Simpro"
                  placeholder="Simpro"
                  value={filters.simpro}
                  onChange={(e) => handleFilterChange('simpro', e.target.value)}
                  inputSize="sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Resultados */}
        <div className="flex-1 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
          {!hasActiveFilters ? (
            <div className="flex h-64 items-center justify-center">
              <EmptyState
                icon={<Search className="h-16 w-16" />}
                title="Faça uma busca"
                description="Digite ao menos 2 caracteres no campo de nome ou fabricante para iniciar a busca."
              />
            </div>
          ) : isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loading />
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              <EmptyState
                icon={<Search className="h-16 w-16" />}
                title="Produto não encontrado"
                description="Tente ajustar os filtros de busca."
              />
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    Nome / Apresentação
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    Fabricante
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    Qtd/Unid
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    EAN
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    Códigos
                  </th>
                  <th
                    scope="col"
                    className="w-24 px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                {items.map((item) => {
                  const alreadyLinked = item.ean ? existingEans.has(item.ean) : false
                  return (
                    <tr
                      key={item.ean}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        alreadyLinked ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="px-3 py-3">
                        <div className="max-w-md">
                          <p
                            className="truncate text-sm font-medium text-gray-900 dark:text-white"
                            title={item.name ?? undefined}
                          >
                            {item.name}
                          </p>
                          {item.substance && (
                            <p
                              className="text-primary-600 dark:text-primary-400 truncate text-xs"
                              title={
                                item.substance +
                                (item.concentration ? ` ${item.concentration}` : '')
                              }
                            >
                              {item.substance}
                              {item.concentration && ` ${item.concentration}`}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="block max-w-full text-xs leading-4 text-gray-700 dark:text-gray-300">
                          {item.manufacturer || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.quantity || 1}
                          </span>
                          {item.unit && (
                            <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                              {item.unit}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                          {item.ean}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {item.tiss && (
                            <span className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              TISS: {item.tiss}
                            </span>
                          )}
                          {item.tuss && (
                            <span className="inline-flex items-center rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              TUSS: {item.tuss}
                            </span>
                          )}
                          {item.ggrem_code && (
                            <span className="inline-flex items-center rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                              GGREM: {item.ggrem_code}
                            </span>
                          )}
                          {item.brasindice_code && (
                            <span className="inline-flex items-center rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                              BRAS: {item.brasindice_code}
                            </span>
                          )}
                          {item.simpro_code && (
                            <span className="inline-flex items-center rounded bg-cyan-100 px-1.5 py-0.5 text-xs font-medium text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">
                              SIMP: {item.simpro_code}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {alreadyLinked ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <Check className="h-4 w-4" />
                            Vinculado
                          </span>
                        ) : (
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => handleSelectItem(item)}
                          >
                            <Link className="h-4 w-4" />
                            Associar
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <ListPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          itemLabel="resultados"
          onPreviousPage={() => setCurrentPage((page) => page - 1)}
          onNextPage={() => setCurrentPage((page) => page + 1)}
          trailingContent={
            <Button type="button" variant="secondary" onClick={onClose}>
              Fechar
            </Button>
          }
        />
      </div>
    </Modal>
  )
}
