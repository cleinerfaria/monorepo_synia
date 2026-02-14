import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ColumnDef } from '@tanstack/react-table'
import { Users, Pencil, Ban, CircleCheck, X, Funnel, Search, FunnelX } from 'lucide-react'
import {
  Card,
  ButtonNew,
  DataTable,
  ListPagination,
  StatusBadge,
  Badge,
  EmptyState,
  SearchableSelect,
  FilterToggleButton,
  type BadgeVariant,
  IconButton,
  ColorBadge,
} from '@/components/ui'
import { usePatientsPaginated, useUpdatePatient } from '@/hooks/usePatients'
import { useClients } from '@/hooks/useClients'
import { useListPageState } from '@/hooks/useListPageState'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import type { Patient, Client } from '@/types/database'
import { format, differenceInYears } from 'date-fns'
import { formatDateOnly, parseDateOnlyOrNull } from '@/lib/dateOnly'

const PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE

export default function PatientsPage() {
  const navigate = useNavigate()

  // Paginação e busca server-side
  const [currentPage, setCurrentPage] = useListPageState()
  const [searchTerm, setSearchTerm] = useState('')
  const [searchInput, setSearchInput] = useState('')

  // Filtros (agora server-side)
  const [clientFilter, setClientFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Ordenação server-side
  const [sortColumn, setSortColumn] = useState<string>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Filters object for the paginated hook
  const filters = useMemo(
    () => ({
      clientId: clientFilter || undefined,
      gender: genderFilter || undefined,
      status: statusFilter || undefined,
    }),
    [clientFilter, genderFilter, statusFilter]
  )

  const { data: paginatedData, isLoading } = usePatientsPaginated(
    currentPage,
    PAGE_SIZE,
    searchTerm,
    filters,
    sortColumn,
    sortDirection
  )

  const items = paginatedData?.data ?? []
  const totalCount = paginatedData?.totalCount ?? 0
  const totalPages = paginatedData?.totalPages ?? 1

  const updateItem = useUpdatePatient()

  // Dados para os filtros
  const { data: clientsData = [] } = useClients()
  const clients = clientsData as Client[]

  // Search handlers
  const handleSearch = useCallback(() => {
    setCurrentPage(1)
    setSearchTerm(searchInput)
  }, [searchInput, setCurrentPage])

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearchTerm('')
    setClientFilter('')
    setGenderFilter('')
    setStatusFilter('')
    setCurrentPage(1)
  }

  const hasActiveFilters = searchTerm || clientFilter || genderFilter || statusFilter

  const toggleActive = async (item: Patient) => {
    await updateItem.mutateAsync({
      id: item.id,
      active: !item.active,
    })
  }

  // Handler para ordenação por coluna
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  const columns: ColumnDef<Patient>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: () => (
          <button
            onClick={() => handleSort('name')}
            className="hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1"
          >
            NOME
            {sortColumn === 'name' && (
              <span className="text-primary-500">{sortDirection === 'asc' ? '^' : 'v'}</span>
            )}
          </button>
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{row.original.name}</p>
            {row.original.cpf && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{row.original.cpf}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'birth_date',
        header: () => (
          <button
            onClick={() => handleSort('birth_date')}
            className="hover:text-primary-600 dark:hover:text-primary-400 flex w-full items-center justify-center gap-1"
          >
            DATA NASC.
            {sortColumn === 'birth_date' && (
              <span className="text-primary-500">{sortDirection === 'asc' ? '^' : 'v'}</span>
            )}
          </button>
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-center text-gray-700 dark:text-gray-300">
            {row.original.birth_date ? formatDateOnly(row.original.birth_date) : '-'}
          </div>
        ),
      },
      {
        accessorKey: 'age',
        header: () => <span className="block w-full text-center">IDADE</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const birthDate = parseDateOnlyOrNull(row.original.birth_date)
          return (
            <div className="text-center text-gray-700 dark:text-gray-300">
              {birthDate ? `${differenceInYears(new Date(), birthDate)} anos` : '-'}
            </div>
          )
        },
      },
      {
        accessorKey: 'gender',
        header: () => <span className="block w-full text-center">SEXO</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const genderVariants: Record<string, BadgeVariant> = {
            male: 'info', // Azul
            female: 'pink', // Rosa
            other: 'neutral', // Cinza
            // Compatibility com valores antigos
            M: 'info',
            F: 'pink',
            O: 'neutral',
          }
          const genderLabels: Record<string, string> = {
            male: 'Masculino',
            female: 'Feminino',
            other: 'Outro',
            // Compatibility com valores antigos
            M: 'Masculino',
            F: 'Feminino',
            O: 'Outro',
          }
          const gender = row.original.gender
          return (
            <div className="text-center">
              {gender ? (
                <Badge variant={genderVariants[gender]}>{genderLabels[gender]}</Badge>
              ) : (
                <span className="text-gray-400 dark:text-gray-500">-</span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'patient_payer',
        header: () => <span className="block w-full text-center">OPERADORA</span>,
        enableSorting: false,
        cell: ({ row }) => {
          // Buscar o client da fonte pagadora principal
          const primaryPayer = (row.original as any).patient_payer?.find(
            (payer: any) => payer.is_primary
          )
          const client = primaryPayer?.client
          const operatoraName = client?.name
          const operatoraColor = client?.color

          return (
            <div className="flex justify-center">
              {operatoraName ? (
                <ColorBadge color={operatoraColor}>{operatoraName}</ColorBadge>
              ) : (
                <span className="text-gray-400 dark:text-gray-500">-</span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'active',
        header: () => (
          <button
            onClick={() => handleSort('active')}
            className="hover:text-primary-600 dark:hover:text-primary-400 flex w-full items-center justify-center gap-1"
          >
            STATUS
            {sortColumn === 'active' && (
              <span className="text-primary-500">{sortDirection === 'asc' ? '^' : 'v'}</span>
            )}
          </button>
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-center">
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleActive(row.original)
              }}
              className="cursor-pointer"
            >
              <StatusBadge status={row.original.active ? 'active' : 'inactive'} />
            </button>
          </div>
        ),
      },
      {
        accessorKey: 'updated_at',
        header: () => <span className="block w-full text-center">ÚLTIMA ALTERAÇÃO</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-center text-gray-700 dark:text-gray-300">
            {row.original.updated_at
              ? format(new Date(row.original.updated_at), 'dd/MM/yyyy HH:mm')
              : '-'}
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <IconButton
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/pacientes/${row.original.id}`)
              }}
            >
              <Pencil className="h-4 w-4" />
            </IconButton>
            <IconButton
              variant={row.original.active ? 'danger' : 'success'}
              onClick={(e) => {
                e.stopPropagation()
                toggleActive(row.original)
              }}
              title={row.original.active ? 'Inativar' : 'Ativar'}
            >
              {row.original.active ? (
                <Ban className="h-4 w-4" />
              ) : (
                <CircleCheck className="h-4 w-4" />
              )}
            </IconButton>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, sortColumn, sortDirection]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Pacientes
          </h1>
        </div>
        <ButtonNew
          onClick={() => navigate('/pacientes/novo')}
          variant="solid"
          label="Novo Paciente"
        />
      </div>

      {/* Table */}
      <Card padding="none">
        <div className="space-y-4 p-6">
          {/* Barra de pesquisa e botão de filtros */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou CPF..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <ButtonNew
                onClick={handleSearch}
                variant="outline"
                size="md"
                showIcon
                icon={<Search className="h-4 w-4" />}
                label=""
                className="w-9 justify-center pr-3"
              />
              <FilterToggleButton
                active={Boolean(showFilters || hasActiveFilters)}
                onClick={() => setShowFilters(!showFilters)}
                icon={<Funnel className="mr-1 h-4 w-4" />}
                count={
                  [searchTerm, clientFilter, genderFilter, statusFilter].filter(Boolean).length
                }
                className="min-w-24 justify-center"
              />
              {hasActiveFilters && (
                <ButtonNew
                  onClick={clearFilters}
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
          </div>

          {/* Painel de filtros */}
          {showFilters && (
            <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Filtro por Operadora */}
                <SearchableSelect
                  label="Operadora"
                  options={[
                    { value: '', label: 'Todas' },
                    { value: 'no_operator', label: 'Sem Operadora' },
                    ...clients
                      .filter((c) => c.active && c.type === 'insurer')
                      .map((c) => ({
                        value: c.id,
                        label: c.name,
                      })),
                  ]}
                  placeholder="Selecione..."
                  searchPlaceholder="Buscar operadora..."
                  value={clientFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setClientFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                />

                {/* Filtro por Sexo */}
                <SearchableSelect
                  label="Sexo"
                  options={[
                    { value: '', label: 'Todos' },
                    { value: 'male', label: 'Masculino' },
                    { value: 'female', label: 'Feminino' },
                    { value: 'other', label: 'Outro' },
                  ]}
                  placeholder="Selecione..."
                  searchPlaceholder="Buscar..."
                  value={genderFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setGenderFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                />

                {/* Filtro por Status */}
                <SearchableSelect
                  label="Status"
                  options={[
                    { value: '', label: 'Todos' },
                    { value: 'active', label: 'Ativo' },
                    { value: 'inactive', label: 'Inativo' },
                  ]}
                  placeholder="Selecione..."
                  searchPlaceholder="Buscar status..."
                  value={statusFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setStatusFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
            </div>
          )}
          <DataTable
            data={items}
            columns={columns}
            showPagination={false}
            isLoading={isLoading}
            onRowClick={(row) => navigate(`/pacientes/${row.id}`)}
            emptyState={
              hasActiveFilters ? (
                <EmptyState
                  icon={<Funnel className="h-12 w-12 text-gray-400" />}
                  title="Nenhum paciente encontrado"
                  description="Nenhum paciente corresponde aos filtros selecionados"
                  action={
                    <ButtonNew
                      onClick={clearFilters}
                      variant="solid"
                      size="sm"
                      icon={<X className="h-4 w-4" />}
                      label="Limpar filtros"
                    />
                  }
                />
              ) : (
                <EmptyState
                  icon={<Users className="h-12 w-12 text-gray-400" />}
                  title="Nenhum paciente cadastrado"
                  description="Cadastre pacientes para gerenciar suas informações"
                  action={
                    <ButtonNew
                      onClick={() => navigate('/pacientes/novo')}
                      variant="solid"
                      label="Novo Paciente"
                    />
                  }
                />
              )
            }
          />

          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            itemLabel="pacientes"
            onPreviousPage={() => setCurrentPage((page) => page - 1)}
            onNextPage={() => setCurrentPage((page) => page + 1)}
          />
        </div>
      </Card>
    </div>
  )
}
