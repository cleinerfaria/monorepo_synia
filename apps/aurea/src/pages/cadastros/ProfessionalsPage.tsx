import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2, Search, UserIcon, FunnelX } from 'lucide-react'
import {
  Card,
  Button,
  ButtonNew,
  DataTable,
  Modal,
  ModalFooter,
  Badge,
  EmptyState,
  IconButton,
} from '@/components/ui'
import { useProfessionals, useDeleteProfessional } from '@/hooks/useProfessionals'
import type { Professional } from '@/types/database'

const formatPhoneDisplay = (value?: string | null): string => {
  if (!value) return '-'
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (!digits) return value
  if (digits.length <= 2) return digits
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

const filteredProfessionals = (professionals: Professional[], search: string) => {
  if (!search.trim()) return professionals
  const query = search.toLowerCase()
  return professionals.filter((professional) => {
    const name = professional.name?.toLowerCase() || ''
    const role = professional.role?.toLowerCase() || ''
    const council = [
      professional.council_type,
      professional.council_number,
      professional.council_uf,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return name.includes(query) || role.includes(query) || council.includes(query)
  })
}

export default function ProfessionalsPage() {
  const navigate = useNavigate()
  const { data: professionals = [], isLoading } = useProfessionals()
  const deleteProfessional = useDeleteProfessional()

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null)
  const [searchInput, setSearchInput] = useState('')

  const filteredData = useMemo(
    () => filteredProfessionals(professionals, searchInput),
    [professionals, searchInput]
  )

  const hasActiveSearch = searchInput.trim().length > 0

  const handleClearSearch = () => {
    setSearchInput('')
  }

  const handleEdit = useCallback(
    (professional: Professional) => {
      navigate(`/profissionais/${professional.id}`)
    },
    [navigate]
  )

  const openDeleteModal = useCallback((professional: Professional) => {
    setSelectedProfessional(professional)
    setIsDeleteModalOpen(true)
  }, [])

  const handleDelete = async () => {
    if (selectedProfessional) {
      await deleteProfessional.mutateAsync(selectedProfessional.id)
      setIsDeleteModalOpen(false)
    }
  }

  const columns: ColumnDef<Professional>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Nome',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <UserIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-gray-900 dark:text-white">
                {row.original.name}
              </p>
              <p className="truncate text-sm text-gray-500">{row.original.role || '-'}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'council',
        header: 'Conselho',
        cell: ({ row }) => {
          const { council_type, council_number, council_uf } = row.original
          if (!council_type) return '-'
          return (
            <span className="text-gray-700 dark:text-gray-300">
              {council_type} {council_number}/{council_uf}
            </span>
          )
        },
      },
      {
        accessorKey: 'phone',
        header: 'Contato',
        cell: ({ row }) => {
          const formattedPhone = formatPhoneDisplay(row.original.phone)
          return (
            <div>
              <p className="text-gray-700 dark:text-gray-300">{formattedPhone}</p>
              <p className="text-sm text-gray-500">{row.original.email || '-'}</p>
            </div>
          )
        },
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
            <IconButton
              onClick={(e) => {
                e.stopPropagation()
                handleEdit(row.original)
              }}
            >
              <Pencil className="h-4 w-4" />
            </IconButton>
            <IconButton
              variant="danger"
              onClick={(e) => {
                e.stopPropagation()
                openDeleteModal(row.original)
              }}
            >
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </div>
        ),
      },
    ],
    [handleEdit, openDeleteModal]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Profissionais
          </h1>
        </div>
        <ButtonNew
          onClick={() => navigate('/profissionais/novo')}
          variant="solid"
          label="Novo Profissional"
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
                placeholder="Buscar por nome ou conselho..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            {hasActiveSearch && (
              <ButtonNew
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
            data={filteredData}
            columns={columns}
            isLoading={isLoading}
            onRowClick={(row) => navigate(`/profissionais/${row.id}`)}
            emptyState={
              <EmptyState
                title="Nenhum profissional cadastrado"
                description="Comece cadastrando seu primeiro profissional"
                action={
                  <ButtonNew
                    onClick={() => navigate('/profissionais/novo')}
                    size="sm"
                    variant="solid"
                    label="Cadastrar Profissional"
                  />
                }
              />
            }
          />
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Excluir Profissional"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-400">
          Tem certeza que deseja excluir o profissional{' '}
          <strong className="text-gray-900 dark:text-white">{selectedProfessional?.name}</strong>?
          Esta ação não pode ser desfeita.
        </p>

        <ModalFooter>
          <ButtonNew
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
            isLoading={deleteProfessional.isPending}
          >
            Excluir
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
