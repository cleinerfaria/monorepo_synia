import { useState, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2, Truck, Search, FunnelX } from 'lucide-react'
import {
  Card,
  Button,
  ButtonNew,
  DataTable,
  Modal,
  ModalFooter,
  Input,
  Select,
  Textarea,
  Badge,
  EmptyState,
  SwitchNew,
  IconButton,
} from '@/components/ui'
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from '@/hooks/useSuppliers'
import { useForm } from 'react-hook-form'
import type { Supplier } from '@/types/database'

interface SupplierFormData {
  code: string
  name: string
  trade_name: string
  document: string
  state_registration: string
  municipal_registration: string
  phone: string
  email: string
  website: string
  address: string
  city: string
  state: string
  zip_code: string
  contact_name: string
  contact_phone: string
  payment_terms: string
  notes: string
  active: boolean
}

// Função para formatar CNPJ/CPF
const formatCNPJCPF = (value: string | null | undefined): string => {
  if (!value) return '-'

  const cleanValue = value.replace(/\D/g, '')

  if (cleanValue.length === 11) {
    // CPF: 000.000.000-00
    return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  } else if (cleanValue.length === 14) {
    // CNPJ: 00.000.000/0000-00
    return cleanValue.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }

  return value
}

const formatCnpjCpfInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 14)

  if (digits.length <= 11) {
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
    if (digits.length <= 9) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
    }
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
  }

  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

const formatPhoneInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (!digits) return ''

  if (digits.length <= 2) return `(${digits}`

  const area = digits.slice(0, 2)
  const rest = digits.slice(2)

  if (digits.length <= 6) return `(${area}) ${rest}`

  if (digits.length <= 10) {
    const prefix = rest.slice(0, 4)
    const suffix = rest.slice(4)
    return `(${area}) ${prefix}${suffix ? `-${suffix}` : ''}`
  }

  const prefix = rest.slice(0, 5)
  const suffix = rest.slice(5)
  return `(${area}) ${prefix}${suffix ? `-${suffix}` : ''}`
}

const formatCepInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

const UF_OPTIONS = [
  { value: 'AC', label: 'AC' },
  { value: 'AL', label: 'AL' },
  { value: 'AP', label: 'AP' },
  { value: 'AM', label: 'AM' },
  { value: 'BA', label: 'BA' },
  { value: 'CE', label: 'CE' },
  { value: 'DF', label: 'DF' },
  { value: 'ES', label: 'ES' },
  { value: 'GO', label: 'GO' },
  { value: 'MA', label: 'MA' },
  { value: 'MT', label: 'MT' },
  { value: 'MS', label: 'MS' },
  { value: 'MG', label: 'MG' },
  { value: 'PA', label: 'PA' },
  { value: 'PB', label: 'PB' },
  { value: 'PR', label: 'PR' },
  { value: 'PE', label: 'PE' },
  { value: 'PI', label: 'PI' },
  { value: 'RJ', label: 'RJ' },
  { value: 'RN', label: 'RN' },
  { value: 'RS', label: 'RS' },
  { value: 'RO', label: 'RO' },
  { value: 'RR', label: 'RR' },
  { value: 'SC', label: 'SC' },
  { value: 'SP', label: 'SP' },
  { value: 'SE', label: 'SE' },
  { value: 'TO', label: 'TO' },
]

export default function SuppliersPage() {
  const { data: suppliers = [], isLoading } = useSuppliers()
  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier()
  const deleteSupplier = useDeleteSupplier()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [searchInput, setSearchInput] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SupplierFormData>()

  const stateValue = watch('state')
  const activeValue = watch('active')
  const { ref: activeRef, name: activeName, onBlur: activeOnBlur } = register('active')
  const [documentValue, setDocumentValue] = useState('')
  const [phoneValue, setPhoneValue] = useState('')
  const [contactPhoneValue, setContactPhoneValue] = useState('')
  const [zipCodeValue, setZipCodeValue] = useState('')

  const openCreateModal = () => {
    setSelectedSupplier(null)
    reset({
      code: '',
      name: '',
      trade_name: '',
      document: '',
      state_registration: '',
      municipal_registration: '',
      phone: '',
      email: '',
      website: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      contact_name: '',
      contact_phone: '',
      payment_terms: '',
      notes: '',
      active: true,
    })
    setDocumentValue('')
    setPhoneValue('')
    setContactPhoneValue('')
    setZipCodeValue('')
    setIsModalOpen(true)
  }

  const openEditModal = (supplier: Supplier) => {
    const formattedDocument = formatCnpjCpfInput(supplier.document || '')
    const formattedPhone = formatPhoneInput(supplier.phone || '')
    const formattedContactPhone = formatPhoneInput(supplier.contact_phone || '')
    const formattedZip = formatCepInput(supplier.zip_code || '')

    setSelectedSupplier(supplier)
    reset({
      code: supplier.code || '',
      name: supplier.name,
      trade_name: supplier.trade_name || '',
      document: formattedDocument,
      state_registration: supplier.state_registration || '',
      municipal_registration: supplier.municipal_registration || '',
      phone: formattedPhone,
      email: supplier.email || '',
      website: supplier.website || '',
      address: supplier.address || '',
      city: supplier.city || '',
      state: supplier.state || '',
      zip_code: formattedZip,
      contact_name: supplier.contact_name || '',
      contact_phone: formattedContactPhone,
      payment_terms: supplier.payment_terms || '',
      notes: supplier.notes || '',
      active: supplier.active ?? true,
    })
    setDocumentValue(formattedDocument)
    setPhoneValue(formattedPhone)
    setContactPhoneValue(formattedContactPhone)
    setZipCodeValue(formattedZip)
    setIsModalOpen(true)
  }

  const openDeleteModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setIsDeleteModalOpen(true)
  }

  const onSubmit = async (data: SupplierFormData) => {
    const payload = {
      ...data,
      code: data.code || null,
      trade_name: data.trade_name || null,
      document: data.document ? data.document.replace(/\D/g, '') : null,
      state_registration: data.state_registration || null,
      municipal_registration: data.municipal_registration || null,
      phone: data.phone || null,
      email: data.email || null,
      website: data.website || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zip_code: data.zip_code || null,
      contact_name: data.contact_name || null,
      contact_phone: data.contact_phone || null,
      payment_terms: data.payment_terms || null,
      notes: data.notes || null,
    }

    if (selectedSupplier) {
      await updateSupplier.mutateAsync({
        id: selectedSupplier.id,
        ...payload,
      })
    } else {
      await createSupplier.mutateAsync(payload)
    }
    setIsModalOpen(false)
  }

  const handleDelete = async () => {
    if (selectedSupplier) {
      await deleteSupplier.mutateAsync(selectedSupplier.id)
      setIsDeleteModalOpen(false)
    }
  }

  const filteredSuppliers = useMemo(() => {
    if (!searchInput.trim()) return suppliers
    const query = searchInput.toLowerCase()
    return suppliers.filter((supplier) => {
      const name = supplier.name?.toLowerCase() || ''
      const tradeName = supplier.trade_name?.toLowerCase() || ''
      const document = supplier.document?.toLowerCase() || ''
      return name.includes(query) || tradeName.includes(query) || document.includes(query)
    })
  }, [suppliers, searchInput])

  const hasActiveSearch = searchInput.trim().length > 0

  const handleClearSearch = () => {
    setSearchInput('')
  }

  const columns: ColumnDef<Supplier>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Fornecedor',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Truck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{row.original.name}</p>
              {row.original.trade_name && (
                <p className="text-sm text-gray-500">{row.original.trade_name}</p>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'document',
        header: 'CNPJ/CPF',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {formatCNPJCPF(row.original.document)}
          </span>
        ),
      },
      {
        accessorKey: 'location',
        header: 'Localização',
        cell: ({ row }) => {
          const { city, state } = row.original
          if (!city && !state) return '-'
          return (
            <span className="text-gray-700 dark:text-gray-300">
              {[city, state].filter(Boolean).join(' - ')}
            </span>
          )
        },
      },
      {
        accessorKey: 'contact',
        header: 'Contato',
        cell: ({ row }) => (
          <div>
            <p className="text-gray-700 dark:text-gray-300">{row.original.phone || '-'}</p>
            <p className="text-sm text-gray-500">{row.original.email || '-'}</p>
          </div>
        ),
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
                openEditModal(row.original)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Fornecedores
          </h1>
        </div>
        <ButtonNew onClick={openCreateModal} variant="solid" label="Novo Fornecedor" />
      </div>

      {/* Table */}
      <Card padding="none">
        <div className="space-y-4 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[30%]">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou CNPJ..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
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
            data={filteredSuppliers}
            columns={columns}
            isLoading={isLoading}
            onRowClick={openEditModal}
            emptyState={
              <EmptyState
                title="Nenhum fornecedor cadastrado"
                description="Comece cadastrando seu primeiro fornecedor"
                action={
                  <ButtonNew
                    onClick={openCreateModal}
                    size="sm"
                    variant="solid"
                    label="Cadastrar Fornecedor"
                  />
                }
              />
            }
          />
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Dados Básicos */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Dados Básicos</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[repeat(24,minmax(0,1fr))]">
              <div className="col-span-4">
                <Input label="Código" placeholder="Código" {...register('code')} />
              </div>
              <div className="col-span-12">
                <Input
                  label="Razão Social"
                  placeholder="Nome oficial da empresa"
                  {...register('name', { required: 'Razão social é obrigatória' })}
                  error={errors.name?.message}
                  required
                />
              </div>
              <div className="col-span-8">
                <Input
                  label="Nome Fantasia"
                  placeholder="Nome comercial"
                  {...register('trade_name')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input
                label="CNPJ/CPF"
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                {...register('document')}
                value={documentValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const formatted = formatCnpjCpfInput(e.target.value)
                  setDocumentValue(formatted)
                  setValue('document', formatted, { shouldDirty: true })
                }}
              />
              <Input
                label="Inscrição Estadual"
                placeholder="Número IE"
                {...register('state_registration')}
              />
              <Input
                label="Inscrição Municipal"
                placeholder="Número IM"
                {...register('municipal_registration')}
              />
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-4 border-t border-gray-200 pt-4 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Endereço</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[repeat(24,minmax(0,1fr))]">
              <div className="md:col-span-10">
                <Input
                  label="Endereço"
                  placeholder="Rua, número, complemento"
                  {...register('address')}
                />
              </div>
              <div className="md:col-span-6">
                <Input label="Cidade" placeholder="Cidade" {...register('city')} />
              </div>
              <div className="md:col-span-4">
                <Select label="UF" options={UF_OPTIONS} value={stateValue} {...register('state')} />
              </div>
              <div className="md:col-span-4">
                <Input
                  label="CEP"
                  placeholder="00000-000"
                  inputMode="numeric"
                  {...register('zip_code')}
                  value={zipCodeValue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const formatted = formatCepInput(e.target.value)
                    setZipCodeValue(formatted)
                    setValue('zip_code', formatted, { shouldDirty: true })
                  }}
                />
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="space-y-4 border-t border-gray-200 pt-4 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Contato</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[repeat(24,minmax(0,1fr))]">
              <div className="md:col-span-6">
                <Input
                  label="Telefone"
                  placeholder="(00) 0000-0000"
                  inputMode="numeric"
                  {...register('phone')}
                  value={phoneValue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const formatted = formatPhoneInput(e.target.value)
                    setPhoneValue(formatted)
                    setValue('phone', formatted, { shouldDirty: true })
                  }}
                />
              </div>
              <div className="md:col-span-10">
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="contato@fornecedor.com"
                  {...register('email')}
                />
              </div>
              <div className="md:col-span-8">
                <Input
                  label="Website"
                  placeholder="https://www.fornecedor.com.br"
                  {...register('website')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Nome do Contato"
                placeholder="Nome do representante"
                {...register('contact_name')}
              />
              <Input
                label="Telefone do Contato"
                placeholder="(00) 00000-0000"
                inputMode="numeric"
                {...register('contact_phone')}
                value={contactPhoneValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const formatted = formatPhoneInput(e.target.value)
                  setContactPhoneValue(formatted)
                  setValue('contact_phone', formatted, { shouldDirty: true })
                }}
              />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-4 border-t border-gray-200 pt-4 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Informações Adicionais
            </h3>
            <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-4">
              <div className="col-span-full md:col-span-12">
                <Textarea
                  label="Condições de Pagamento"
                  placeholder="Ex: 30/60/90 dias, boleto bancário"
                  rows={2}
                  {...register('payment_terms')}
                />
              </div>
              <div className="col-span-full md:col-span-12">
                <Textarea
                  label="Observações"
                  placeholder="Observações adicionais..."
                  rows={2}
                  {...register('notes')}
                />
              </div>
            </div>
          </div>

          <SwitchNew
            label="Status"
            showStatus
            name={activeName}
            ref={activeRef}
            onBlur={activeOnBlur}
            checked={!!activeValue}
            onChange={(e) => {
              setValue('active', e.target.checked, { shouldDirty: true })
            }}
          />

          <ModalFooter>
            <ButtonNew
              type="button"
              variant="outline"
              showIcon={false}
              onClick={() => setIsModalOpen(false)}
              label="Cancelar"
            />
            <ButtonNew
              type="submit"
              variant="solid"
              showIcon={false}
              disabled={createSupplier.isPending || updateSupplier.isPending}
              label={selectedSupplier ? 'Salvar Alterações' : 'Cadastrar'}
            />
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Excluir Fornecedor"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-400">
          Tem certeza que deseja excluir o fornecedor{' '}
          <strong className="text-gray-900 dark:text-white">{selectedSupplier?.name}</strong>? Esta
          ação não pode ser desfeita.
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
            isLoading={deleteSupplier.isPending}
          >
            Excluir
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
