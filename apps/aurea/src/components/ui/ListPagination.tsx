import { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { Button } from './Button'

interface ListPaginationProps {
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize?: number
  itemLabel?: string
  onPreviousPage: () => void
  onNextPage: () => void
  isLoading?: boolean
  trailingContent?: ReactNode
}

export function ListPagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize = DEFAULT_LIST_PAGE_SIZE,
  itemLabel = 'registros',
  onPreviousPage,
  onNextPage,
  isLoading = false,
  trailingContent,
}: ListPaginationProps) {
  const safeTotalPages = Math.max(totalPages, 1)
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), safeTotalPages)
  const hasRecords = totalCount > 0
  const startRecord = hasRecords ? (safeCurrentPage - 1) * pageSize + 1 : 0
  const endRecord = hasRecords ? Math.min(safeCurrentPage * pageSize, totalCount) : 0
  const previousDisabled = safeCurrentPage === 1 || isLoading
  const nextDisabled = safeCurrentPage === safeTotalPages || isLoading

  return (
    <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {hasRecords
          ? `Mostrando ${startRecord} a ${endRecord} de ${totalCount} ${itemLabel}`
          : `Total: 0 ${itemLabel}`}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          aria-label="Página anterior"
          onClick={onPreviousPage}
          disabled={previousDisabled}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="text-sm text-gray-600 dark:text-gray-400">
          Página {safeCurrentPage} de {safeTotalPages}
        </span>

        <Button
          variant="secondary"
          size="sm"
          aria-label="Próxima página"
          onClick={onNextPage}
          disabled={nextDisabled}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {trailingContent}
      </div>
    </div>
  )
}
