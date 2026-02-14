import { useState, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ColumnDef } from '@tanstack/react-table'
import { format, parse } from 'date-fns'
import {
  Card,
  ButtonNew,
  DataTable,
  Modal,
  ModalFooter,
  DatePicker,
  Select,
  SearchableSelect,
  Textarea,
  StatusBadge,
  EmptyState,
  FilterToggleButton,
  getStatusBadgeConfig,
  IconButton,
} from '@/components/ui'
import { ColorBadge } from '@/components/ui/ColorBadge'
import {
  usePrescriptions,
  useCreatePrescription,
  useDeletePrescription,
  useUpdatePrescription,
} from '@/hooks/usePrescriptions'
import { usePatients } from '@/hooks/usePatients'
import { useProfessionals } from '@/hooks/useProfessionals'
import { useForm } from 'react-hook-form'
import type { Prescription, Patient, Professional, PrescriptionType } from '@/types/database'
import {
  Pencil,
  Trash2,
  Eye,
  ClipboardList,
  Heart,
  FlaskConical,
  Search,
  Funnel,
  FunnelX,
  X,
} from 'lucide-react'
interface PrescriptionFormData {
  patient_id: string
  professional_id: string
  status: 'draft' | 'active' | 'suspended' | 'finished'
  type: PrescriptionType | ''
  start_date: string
  end_date: string
  notes: string
}

function parseDateOnly(value: string): Date {
  return parse(value, 'yyyy-MM-dd', new Date())
}

export default function PrescriptionsPage() {
  const navigate = useNavigate()
  const { data: prescriptionsData = [], isLoading } = usePrescriptions()
  const prescriptions = prescriptionsData as Prescription[]
  const { data: patientsData = [] } = usePatients()
  const patients = patientsData as Patient[]
  const { data: professionalsData = [] } = useProfessionals()
  const professionals = professionalsData as Professional[]
  const createPrescription = useCreatePrescription()
  const updatePrescription = useUpdatePrescription()
  const deletePrescription = useDeletePrescription()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null)
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [professionalFilter, setProfessionalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [periodStartFilter, setPeriodStartFilter] = useState('')
  const [periodEndFilter, setPeriodEndFilter] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PrescriptionFormData>()

  const watchType = watch('type')
  const watchPatientId = watch('patient_id')
  const watchProfessionalId = watch('professional_id')

  const {
    ref: startDateRef,
    min: _startDateMin,
    max: _startDateMax,
    ...startDateField
  } = register('start_date')
  const {
    ref: endDateRef,
    min: _endDateMin,
    max: _endDateMax,
    ...endDateField
  } = register('end_date')

  const openCreateModal = () => {
    setEditingPrescription(null)
    reset({
      patient_id: '',
      professional_id: '',
      status: 'draft',
      type: 'medical',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: '',
      notes: '',
    })
    setIsModalOpen(true)
  }

  const openEditModal = useCallback(
    (prescription: Prescription) => {
      setEditingPrescription(prescription)
      reset({
        patient_id: prescription.patient_id || '',
        professional_id: prescription.professional_id || '',
        status: (prescription.status || 'draft') as 'draft' | 'active' | 'suspended' | 'finished',
        type: (prescription.type || 'medical') as PrescriptionType | '',
        start_date: prescription.start_date || '',
        end_date: prescription.end_date || '',
        notes: prescription.notes || '',
      })
      setIsModalOpen(true)
    },
    [reset]
  )

  const openDeleteModal = (prescription: Prescription) => {
    setSelectedPrescription(prescription)
    setIsDeleteModalOpen(true)
  }

  const closeFormModal = () => {
    setIsModalOpen(false)
    setEditingPrescription(null)
  }

  const onSubmit = async (data: PrescriptionFormData) => {
    if (editingPrescription) {
      await updatePrescription.mutateAsync({
        id: editingPrescription.id,
        ...data,
        type: data.type || null,
        professional_id: data.professional_id || null,
        end_date: data.end_date || data.start_date,
      })
      setIsModalOpen(false)
      setEditingPrescription(null)
      return
    }

    const result = await createPrescription.mutateAsync({
      patient_id: data.patient_id,
      type: (data.type || 'medical') as PrescriptionType,
      status: data.status,
      start_date: data.start_date,
      end_date: data.end_date || data.start_date,
      professional_id: data.professional_id || null,
      notes: data.notes || null,
    })
    setIsModalOpen(false)
    // Navigate to prescription detail to add items
    if (result?.id) {
      navigate(`/prescricoes/${result.id}`)
    }
  }

  const handleDelete = async () => {
    if (selectedPrescription) {
      await deletePrescription.mutateAsync(selectedPrescription.id)
      setIsDeleteModalOpen(false)
    }
  }

  const handleSearch = useCallback(() => {
    setSearchTerm(searchInput.trim())
  }, [searchInput])

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearchTerm('')
    setTypeFilter('')
    setProfessionalFilter('')
    setStatusFilter('')
    setPeriodStartFilter('')
    setPeriodEndFilter('')
  }

  const filteredPrescriptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const filterStart = periodStartFilter ? parseDateOnly(periodStartFilter) : null
    const filterEnd = periodEndFilter ? parseDateOnly(periodEndFilter) : null

    return prescriptions.filter((prescription) => {
      if (typeFilter && prescription.type !== typeFilter) return false
      if (statusFilter && prescription.status !== statusFilter) return false

      if (professionalFilter) {
        const professionalId =
          (prescription as any).professional?.id || (prescription as any).professional_id
        if (professionalId !== professionalFilter) return false
      }

      if (filterStart || filterEnd) {
        const start = prescription.start_date ? parseDateOnly(prescription.start_date) : null
        const end = prescription.end_date ? parseDateOnly(prescription.end_date) : null

        if (filterStart && end && end < filterStart) return false
        if (filterEnd && start && start > filterEnd) return false
      }

      if (term) {
        const patientName = (prescription as any).patient?.name || ''
        const professionalName = (prescription as any).professional?.name || ''
        const notes = prescription.notes || ''
        const typeLabel = prescription.type ? getStatusBadgeConfig(prescription.type).label : ''

        const haystack = `${patientName} ${professionalName} ${notes} ${typeLabel}`.toLowerCase()
        if (!haystack.includes(term)) return false
      }

      return true
    })
  }, [
    prescriptions,
    searchTerm,
    typeFilter,
    professionalFilter,
    statusFilter,
    periodStartFilter,
    periodEndFilter,
  ])

  const hasActiveFilters =
    searchTerm ||
    typeFilter ||
    professionalFilter ||
    statusFilter ||
    periodStartFilter ||
    periodEndFilter

  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'patient',
        header: 'Paciente',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {row.original.patient?.name || '-'}
            </p>
            <p className="text-sm text-gray-500">
              {row.original.created_at
                ? `Criada em ${format(new Date(row.original.created_at), 'dd/MM/yyyy')}`
                : ''}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'operadora',
        header: () => <span className="block w-full text-center">Operadora</span>,
        cell: ({ row }) => {
          const patient = row.original.patient
          // Buscar o client da fonte pagadora principal
          const primaryPayer = patient?.patient_payer?.find((payer: any) => payer.is_primary)
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
        accessorKey: 'professional',
        header: 'Profissional',
        cell: ({ row }) => {
          const prof = row.original.professional
          return prof ? (
            <div>
              <p className="text-gray-700 dark:text-gray-300">{prof.name}</p>
              <p className="text-sm text-gray-500">{prof.role}</p>
            </div>
          ) : (
            '-'
          )
        },
      },
      {
        accessorKey: 'type',
        header: () => <span className="block w-full text-center">Tipo</span>,
        cell: ({ row }) => {
          const type = row.original.type
          if (!type) return '-'
          return (
            <div className="text-center">
              <StatusBadge status={type} />
            </div>
          )
        },
      },
      {
        accessorKey: 'period',
        header: 'Período',
        cell: ({ row }) => {
          const start = row.original.start_date
          const end = row.original.end_date
          if (!start && !end) return '-'
          return (
            <span className="text-gray-700 dark:text-gray-300">
              {start ? format(parseDateOnly(start), 'dd/MM/yyyy') : '...'}
              {' - '}
              {end ? format(parseDateOnly(end), 'dd/MM/yyyy') : 'Indeterminado'}
            </span>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <IconButton
              onClick={(e) => {
                e.stopPropagation()
                openEditModal(row.original)
              }}
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </IconButton>
            <Link
              to={`/prescricoes/${row.original.id}`}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-border-focus/40 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
              <Eye className="h-4 w-4" />
            </Link>
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
    [openEditModal]
  )

  const patientOptions = patients
    .filter((p) => p.active)
    .map((p) => ({ value: p.id, label: p.name }))

  const professionalOptions = professionals
    .filter((p) => p.active)
    .map((p) => ({
      value: p.id,
      label: `${p.name} (${p.role || 'Profissional'})`,
    }))

  const statusOptions = [
    { value: 'draft', label: 'Rascunho' },
    { value: 'active', label: 'Ativa' },
    { value: 'suspended', label: 'Suspensa' },
    { value: 'finished', label: 'Finalizada' },
  ]

  const prescriptionTypeOptions = [
    {
      value: 'medical',
      label: 'Médica',
      icon: ClipboardList,
      description: 'Prescrição médica tradicional',
    },
    {
      value: 'nursing',
      label: 'Enfermagem',
      icon: Heart,
      description: 'Cuidados e procedimentos de enfermagem',
    },
    {
      value: 'nutrition',
      label: 'Nutrição',
      icon: FlaskConical,
      description: 'Dietas e suplementação nutricional',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Prescrições
          </h1>
        </div>
        <ButtonNew onClick={openCreateModal} variant="solid" label="Nova Prescrição" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total', value: prescriptions.length, color: 'gray' },
          {
            label: 'Ativas',
            value: prescriptions.filter((p) => p.status === 'active').length,
            color: 'green',
          },
          {
            label: 'Rascunho',
            value: prescriptions.filter((p) => p.status === 'draft').length,
            color: 'amber',
          },
          {
            label: 'Finalizadas',
            value: prescriptions.filter((p) => p.status === 'finished').length,
            color: 'blue',
          },
        ].map((stat) => (
          <Card key={stat.label} padding="sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card padding="none">
        <div className="space-y-4 p-6">
          {/* Barra de pesquisa e botão de filtros */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por paciente, profissional ou observações..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
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
                  [
                    searchTerm,
                    typeFilter,
                    professionalFilter,
                    statusFilter,
                    periodStartFilter,
                    periodEndFilter,
                  ].filter(Boolean).length
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <SearchableSelect
                  label="Tipo"
                  options={[
                    { value: '', label: 'Todos' },
                    { value: 'medical', label: 'Médica' },
                    { value: 'nursing', label: 'Enfermagem' },
                    { value: 'nutrition', label: 'Nutrição' },
                  ]}
                  placeholder="Selecione..."
                  searchPlaceholder="Buscar tipo..."
                  value={typeFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setTypeFilter(e.target.value)
                  }}
                />

                <SearchableSelect
                  label="Profissional"
                  options={[{ value: '', label: 'Todos' }, ...professionalOptions]}
                  placeholder="Selecione..."
                  searchPlaceholder="Buscar profissional..."
                  value={professionalFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setProfessionalFilter(e.target.value)
                  }}
                />

                <SearchableSelect
                  label="Status"
                  options={[{ value: '', label: 'Todos' }, ...statusOptions]}
                  placeholder="Selecione..."
                  searchPlaceholder="Buscar status..."
                  value={statusFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setStatusFilter(e.target.value)
                  }}
                />

                <DatePicker
                  label="Período (de)"
                  value={periodStartFilter}
                  onChange={(value: any) => {
                    const nextValue =
                      typeof value === 'string' ? value : (value as any)?.target?.value || ''
                    setPeriodStartFilter(nextValue)
                  }}
                />

                <DatePicker
                  label="Período (até)"
                  value={periodEndFilter}
                  onChange={(value: any) => {
                    const nextValue =
                      typeof value === 'string' ? value : (value as any)?.target?.value || ''
                    setPeriodEndFilter(nextValue)
                  }}
                />
              </div>
            </div>
          )}

          <DataTable
            data={filteredPrescriptions}
            columns={columns}
            isLoading={isLoading}
            onRowClick={(prescription) => navigate(`/prescricoes/${prescription.id}`)}
            emptyState={
              hasActiveFilters ? (
                <EmptyState
                  icon={<Funnel className="h-12 w-12 text-gray-400" />}
                  title="Nenhuma prescrição encontrada"
                  description="Nenhuma prescrição corresponde aos filtros selecionados"
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
                  title="Nenhuma prescrição encontrada"
                  description="Crie uma nova prescrição para começar"
                  action={
                    <ButtonNew
                      onClick={openCreateModal}
                      size="sm"
                      variant="solid"
                      label="Nova Prescrição"
                    />
                  }
                />
              )
            }
          />
        </div>
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeFormModal}
        title={editingPrescription ? 'Editar Prescrição' : 'Nova Prescrição'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Tipo de Prescrição"
            options={prescriptionTypeOptions}
            value={watchType}
            {...register('type')}
            required
          />

          <SearchableSelect
            label="Paciente"
            options={patientOptions}
            placeholder="Selecione o paciente..."
            searchPlaceholder="Buscar paciente..."
            value={watchPatientId || ''}
            {...register('patient_id', { required: 'Paciente é obrigatório' })}
            error={errors.patient_id?.message}
            required
          />

          <SearchableSelect
            label="Profissional Prescritor"
            options={professionalOptions}
            placeholder="Selecione o profissional..."
            searchPlaceholder="Buscar profissional..."
            value={watchProfessionalId || ''}
            {...register('professional_id', { required: 'Profissional é obrigatório' })}
            error={errors.professional_id?.message}
            required
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DatePicker label="Data de Início" {...startDateField} ref={startDateRef} />
            <DatePicker label="Data de Término" {...endDateField} ref={endDateRef} />
          </div>

          <Select label="Status" options={statusOptions} {...register('status')} />

          <Textarea
            label="Observações"
            placeholder="Observações gerais sobre a prescrição..."
            {...register('notes')}
          />

          <ModalFooter>
            <ButtonNew
              type="button"
              variant="outline"
              showIcon={false}
              onClick={closeFormModal}
              label="Cancelar"
            />
            <ButtonNew
              type="submit"
              variant="solid"
              showIcon={false}
              disabled={createPrescription.isPending || updatePrescription.isPending}
              label={editingPrescription ? 'Salvar Alterações' : 'Criar e Adicionar Itens'}
            />
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Excluir Prescrição"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-400">
          Tem certeza que deseja excluir esta prescrição? Todos os itens também serão removidos.
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
          <ButtonNew
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={deletePrescription.isPending}
            showIcon={false}
            label={deletePrescription.isPending ? 'Excluindo...' : 'Excluir'}
          />
        </ModalFooter>
      </Modal>
    </div>
  )
}
