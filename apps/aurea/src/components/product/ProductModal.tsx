import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  Modal,
  ModalFooter,
  Button,
  Input,
  Select,
  SearchableSelect,
  Textarea,
} from '@/components/ui'
import { useCreateProduct, useUpdateProduct } from '@/hooks/useProducts'
import { useActiveIngredients, useCreateActiveIngredient } from '@/hooks/useActiveIngredients'
import { useUnitsOfMeasure } from '@/hooks/useUnitsOfMeasure'
import { useProductGroups, useCreateProductGroup } from '@/hooks/useProductGroups'
import type { Product } from '@/types/database'
import { Plus } from 'lucide-react'
export interface ProductFormData {
  name: string
  description: string
  unit_stock_id: string
  item_type: 'medication' | 'material' | 'diet'
  min_stock: number
  active_ingredient_id: string
  concentration: string
  group_id: string
  active: boolean
}

interface NewActiveIngredientFormData {
  name: string
  description: string
}

interface NewGroupFormData {
  name: string
  code: string
  color: string
}

export interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  item?: Product | null
  defaultItemType?: 'medication' | 'material' | 'diet'
  /** Pre-fill data when creating from NFe */
  prefillData?: {
    name?: string
    unit_stock_id?: string
    description?: string
  }
  /** Called after successful create/update with the created/updated item */
  onSuccess?: (item: Product) => void
  /** Title override */
  title?: string
}

export default function ProductModal({
  isOpen,
  onClose,
  item,
  defaultItemType = 'medication',
  prefillData,
  onSuccess,
  title,
}: ProductModalProps) {
  const [isNewActiveIngredientModalOpen, setIsNewActiveIngredientModalOpen] = useState(false)
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false)
  const [selectedActiveIngredientId, setSelectedActiveIngredientId] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')

  const { data: activeIngredients = [] } = useActiveIngredients()
  const createActiveIngredient = useCreateActiveIngredient()
  const { data: unitsOfMeasure = [] } = useUnitsOfMeasure()
  const { data: productGroups = [] } = useProductGroups()
  const createProductGroup = useCreateProductGroup()

  const createItem = useCreateProduct()
  const updateItem = useUpdateProduct()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>()

  const {
    register: registerNewActiveIngredient,
    handleSubmit: handleSubmitNewActiveIngredient,
    reset: resetNewActiveIngredient,
    formState: { errors: newActiveIngredientErrors },
  } = useForm<NewActiveIngredientFormData>()

  const {
    register: registerNewGroup,
    handleSubmit: handleSubmitNewGroup,
    reset: resetNewGroup,
    formState: { errors: newGroupErrors },
  } = useForm<NewGroupFormData>()

  const watchItemType = watch('item_type')

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (item) {
        // Editing existing item
        reset({
          name: item.name,
          description: item.description || '',
          unit_stock_id: item.unit_stock_id || '',
          item_type: item.item_type as ProductFormData['item_type'],
          min_stock: item.min_stock || 0,
          active_ingredient_id: item.active_ingredient_id || '',
          concentration: item.concentration || '',
          group_id: item.group_id || '',
          active: item.active ?? true,
        })
        setSelectedActiveIngredientId(item.active_ingredient_id || '')
        setSelectedGroupId(item.group_id || '')
        setSelectedUnit(item.unit_stock_id || '')
      } else {
        // Creating new item
        reset({
          name: prefillData?.name || '',
          description: prefillData?.description || '',
          unit_stock_id: prefillData?.unit_stock_id || '',
          item_type: defaultItemType,
          min_stock: 0,
          active_ingredient_id: '',
          concentration: '',
          group_id: '',
          active: true,
        })
        setSelectedActiveIngredientId('')
        setSelectedGroupId('')
        setSelectedUnit(prefillData?.unit_stock_id || '')
      }
    }
  }, [isOpen, item, defaultItemType, prefillData, reset])

  const openNewActiveIngredientModal = () => {
    resetNewActiveIngredient({
      name: '',
      description: '',
    })
    setIsNewActiveIngredientModalOpen(true)
  }

  const openNewGroupModal = () => {
    resetNewGroup({
      name: '',
      code: '',
      color: '#6366f1',
    })
    setIsNewGroupModalOpen(true)
  }

  const handleCreateActiveIngredient = async (data: NewActiveIngredientFormData) => {
    const newActiveIngredient = await createActiveIngredient.mutateAsync({
      name: data.name,
      description: data.description || null,
      active: true,
    })
    setSelectedActiveIngredientId(newActiveIngredient.id)
    setIsNewActiveIngredientModalOpen(false)
  }

  const handleCreateGroup = async (data: NewGroupFormData) => {
    const newGroup = await createProductGroup.mutateAsync({
      name: data.name,
      code: data.code || null,
      color: data.color || null,
      description: null,
      parent_id: null,
      icon: null,
      sort_order: null,
      active: true,
    })
    setSelectedGroupId(newGroup.id)
    setIsNewGroupModalOpen(false)
  }

  const onSubmit = async (data: ProductFormData) => {
    // Validação manual da unidade já que estamos usando estado controlado
    if (!selectedUnit) {
      return
    }

    const payload = {
      name: data.name,
      description: data.description || null,
      unit_stock_id: selectedUnit || null,
      item_type: data.item_type,
      min_stock: data.min_stock || undefined,
      active_ingredient_id:
        data.item_type === 'medication' ? selectedActiveIngredientId || null : null,
      concentration: data.item_type === 'medication' ? data.concentration || null : null,
      group_id: selectedGroupId || null,
      active: data.active,
    }

    let result: Product
    if (item) {
      result = await updateItem.mutateAsync({ id: item.id, ...payload })
    } else {
      result = await createItem.mutateAsync(payload)
    }

    onSuccess?.(result)
    onClose()
  }

  const unitOptions = unitsOfMeasure.map((u) => ({
    value: u.id,
    label: `${u.name} (${u.code})`,
  }))

  const itemTypeOptions = [
    { value: '', label: 'Selecione o tipo...' },
    { value: 'medication', label: 'Medicamento' },
    { value: 'material', label: 'Material' },
    { value: 'diet', label: 'Dieta' },
  ]

  const modalTitle = title || (item ? 'Editar Produto' : 'Novo Produto')

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={modalTitle}
        size="screen"
        static={isNewActiveIngredientModalOpen || isNewGroupModalOpen}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Info banner when creating from NFe */}
          {prefillData && !item && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Cadastrando produto a partir da NFe. Após salvar, o produto será automaticamente
                vinculado.
              </p>
            </div>
          )}

          {/* Tipo de Produto + Switch Ativo na mesma linha */}
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Select
                label="Tipo de Produto"
                options={itemTypeOptions}
                value={watchItemType}
                {...register('item_type', { required: 'Tipo é obrigatório' })}
                required
              />
            </div>
            <div className="flex items-center gap-3 pb-3">
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" {...register('active')} className="peer sr-only" />
                <div className="peer-checked:bg-primary-600 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 dark:border-gray-600 dark:bg-gray-700"></div>
                <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ativo
                </span>
              </label>
            </div>
          </div>

          {/* Nome + Concentração na mesma linha */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Input
                label="Nome"
                placeholder="Nome do produto"
                {...register('name', { required: 'Nome é obrigatório' })}
                error={errors.name?.message}
                required
              />
            </div>
            {(watchItemType === 'medication' || defaultItemType === 'medication') && (
              <Input
                label="Concentração"
                placeholder="Ex: 25mg, 500mg/5ml"
                {...register('concentration')}
              />
            )}
          </div>

          {/* Unidade + Estoque Mínimo */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SearchableSelect
              label="Unidade de Estoque"
              options={unitOptions}
              placeholder="Selecione a unidade..."
              searchPlaceholder="Buscar unidade..."
              value={selectedUnit}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const newValue = e.target.value
                setSelectedUnit(newValue)
                setValue('unit_stock_id', newValue)
              }}
              error={errors.unit_stock_id?.message}
              required
            />
            <Input
              label="Estoque Mínimo"
              type="number"
              min={0}
              step={1}
              placeholder="0"
              {...register('min_stock', { valueAsNumber: true })}
            />
          </div>

          {/* Campos específicos para medicamentos - Princípio Ativo + Fabricante na mesma linha */}
          {(watchItemType === 'medication' || defaultItemType === 'medication') && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SearchableSelect
                label="Princípio Ativo"
                options={[
                  { value: '', label: 'Selecione...' },
                  ...activeIngredients
                    .filter((ai) => ai.active)
                    .map((ai) => ({
                      value: ai.id,
                      label: ai.name,
                    })),
                ]}
                placeholder="Selecione o princípio ativo..."
                searchPlaceholder="Buscar princípio ativo..."
                value={selectedActiveIngredientId}
                onChange={(e: string | React.ChangeEvent<HTMLInputElement>) =>
                  setSelectedActiveIngredientId(typeof e === 'string' ? e : e.target.value)
                }
                onCreateNew={openNewActiveIngredientModal}
                createNewLabel="Cadastrar novo princípio ativo"
              />
            </div>
          )}

          {/* Grupo do Produto */}
          <SearchableSelect
            label="Grupo"
            options={[
              { value: '', label: 'Sem grupo' },
              ...productGroups.map((g) => ({
                value: g.id,
                label: g.code ? `${g.code} - ${g.name}` : g.name,
              })),
            ]}
            placeholder="Selecione o grupo..."
            searchPlaceholder="Buscar grupo..."
            value={selectedGroupId}
            onChange={(e: string | React.ChangeEvent<HTMLInputElement>) =>
              setSelectedGroupId(typeof e === 'string' ? e : e.target.value)
            }
            onCreateNew={openNewGroupModal}
            createNewLabel="Cadastrar novo grupo"
          />

          {/* Descrição por último */}
          <Textarea
            label="Descrição"
            placeholder="Descrição detalhada, composição, indicações..."
            {...register('description')}
          />

          <ModalFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createItem.isPending || updateItem.isPending}>
              {item ? 'Salvar' : prefillData ? 'Cadastrar e Vincular' : 'Criar'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* New Active Ingredient Modal */}
      <Modal
        isOpen={isNewActiveIngredientModalOpen}
        onClose={() => setIsNewActiveIngredientModalOpen(false)}
        title="Cadastrar Princípio Ativo"
        size="md"
      >
        <form
          onSubmit={handleSubmitNewActiveIngredient(handleCreateActiveIngredient)}
          className="space-y-4"
        >
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Após salvar, o princípio ativo será selecionado automaticamente no formulário.
            </p>
          </div>

          <Input
            label="Nome do Princípio Ativo"
            placeholder="Ex: Dipirona, Paracetamol, Amoxicilina"
            {...registerNewActiveIngredient('name', { required: 'Nome é obrigatório' })}
            error={newActiveIngredientErrors.name?.message}
            required
          />

          <Textarea
            label="Descrição (opcional)"
            placeholder="Descrição, indicações, observações..."
            rows={3}
            {...registerNewActiveIngredient('description')}
          />

          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsNewActiveIngredientModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={createActiveIngredient.isPending}>
              <Plus className="h-5 w-5" />
              Cadastrar
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* New Group Modal */}
      <Modal
        isOpen={isNewGroupModalOpen}
        onClose={() => setIsNewGroupModalOpen(false)}
        title="Cadastrar Grupo"
        size="md"
      >
        <form onSubmit={handleSubmitNewGroup(handleCreateGroup)} className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Após salvar, o grupo será selecionado automaticamente no formulário.
            </p>
          </div>

          <Input
            label="Nome do Grupo"
            placeholder="Ex: Antibióticos, Analgésicos, Soros"
            {...registerNewGroup('name', { required: 'Nome é obrigatório' })}
            error={newGroupErrors.name?.message}
            required
          />

          <Input
            label="Código (opcional)"
            placeholder="Ex: ANT, ANA, SOR"
            {...registerNewGroup('code')}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Cor (opcional)
            </label>
            <input
              type="color"
              {...registerNewGroup('color')}
              className="h-10 w-full cursor-pointer rounded-lg border border-gray-300 dark:border-gray-600"
            />
          </div>

          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => setIsNewGroupModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createProductGroup.isPending}>
              <Plus className="h-5 w-5" />
              Cadastrar
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  )
}
