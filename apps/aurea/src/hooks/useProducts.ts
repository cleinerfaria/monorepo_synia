import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Product, ProductPresentation, InsertTables, UpdateTables } from '@/types/database'
import { logUserAction } from './useUserActionLogs'
import toast from 'react-hot-toast'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'

const QUERY_KEY = 'products'

// Extended type with presentations and relations
export type ProductWithPresentations = Product & {
  presentations?: ProductPresentation[]
  active_ingredient_rel?: { id: string; name: string } | null
  unit_stock?: { id: string; code: string; name: string; symbol?: string | null } | null
  unit_prescription?: { id: string; code: string; name: string; symbol?: string | null } | null
  group?: { id: string; code: string | null; name: string; color: string | null } | null
}

interface PaginatedResult<T> {
  data: T[]
  totalCount: number
  totalPages: number
  currentPage: number
}

export function useProducts(itemType?: 'medication' | 'material' | 'diet') {
  const { company } = useAuthStore()

  return useQuery({
    queryKey: [QUERY_KEY, company?.id, itemType],
    queryFn: async () => {
      if (!company?.id) return []

      // Buscar todos os produtos usando paginação para evitar limite de 1000
      const pageSize = 1000
      let allProducts: ProductWithPresentations[] = []
      let page = 0
      let hasMore = true

      while (hasMore) {
        let query = supabase
          .from('product')
          .select(
            `
            *,
            presentations:product_presentation(id),
            active_ingredient_rel:active_ingredient(id, name),
            unit_stock:unit_stock_id(id, code, name, symbol),
            unit_prescription:unit_prescription_id(id, code, name, symbol),
            group:group_id(id, code, name, color)
          `
          )
          .eq('company_id', company.id)
          .order('name')
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (itemType) {
          query = query.eq('item_type', itemType)
        }

        const { data, error } = await query

        if (error) throw error

        if (data && data.length > 0) {
          allProducts = [...allProducts, ...(data as ProductWithPresentations[])]
          // Se retornou menos que pageSize, não há mais dados
          if (data.length < pageSize) {
            hasMore = false
          } else {
            page++
          }
        } else {
          hasMore = false
        }
      }

      return allProducts
    },
    staleTime: 0,
    enabled: !!company?.id,
  })
}

export function useProductsPaginated(
  page: number = 1,
  pageSize: number = DEFAULT_LIST_PAGE_SIZE,
  searchTerm: string = '',
  filters?: {
    itemType?: string
    activeIngredientId?: string
    groupId?: string
    unitId?: string
    status?: string
  },
  sortColumn: string = 'name',
  sortDirection: 'asc' | 'desc' = 'asc'
) {
  const { company } = useAuthStore()

  return useQuery({
    queryKey: [
      QUERY_KEY,
      'paginated',
      company?.id,
      page,
      pageSize,
      searchTerm,
      filters,
      sortColumn,
      sortDirection,
    ],
    queryFn: async (): Promise<PaginatedResult<ProductWithPresentations>> => {
      if (!company?.id) return { data: [], totalCount: 0, totalPages: 0, currentPage: page }

      let productIds: string[] = []

      if (searchTerm) {
        // Buscar IDs de produtos que atendem aos critérios de busca
        // 1. Produtos que têm o termo no nome
        const { data: productsByName } = await supabase
          .from('product')
          .select('id')
          .eq('company_id', company.id)
          .ilike('name', `%${searchTerm}%`)

        // 2. Produtos que têm apresentações com o termo no nome
        const { data: presentationsData } = await supabase
          .from('product_presentation')
          .select('product_id')
          .eq('company_id', company.id)
          .ilike('name', `%${searchTerm}%`)

        const productsByPresentations = presentationsData?.map((p) => ({ id: p.product_id })) || []

        // Combinar e remover duplicatas
        const allProducts = [...(productsByName || []), ...productsByPresentations]
        productIds = [...new Set(allProducts.map((p) => p.id))]
      }

      // Build base query for count
      let countQuery = supabase
        .from('product')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id)

      // Build base query for data
      let dataQuery = supabase
        .from('product')
        .select(
          `
          *,
          presentations:product_presentation(id),
          active_ingredient_rel:active_ingredient(id, name),
          unit_stock:unit_stock_id(id, code, name, symbol),
          unit_prescription:unit_prescription_id(id, code, name),
          group:group_id(id, code, name, color)
        `
        )
        .eq('company_id', company.id)

      // Apply search filter
      if (searchTerm && productIds.length > 0) {
        countQuery = countQuery.in('id', productIds)
        dataQuery = dataQuery.in('id', productIds)
      } else if (searchTerm && productIds.length === 0) {
        // Se há termo de busca mas nenhum produto encontrado, retornar vazio
        return { data: [], totalCount: 0, totalPages: 0, currentPage: page }
      }

      // Apply filters
      if (filters?.itemType) {
        countQuery = countQuery.eq('item_type', filters.itemType)
        dataQuery = dataQuery.eq('item_type', filters.itemType)
      }
      if (filters?.activeIngredientId) {
        countQuery = countQuery.eq('active_ingredient_id', filters.activeIngredientId)
        dataQuery = dataQuery.eq('active_ingredient_id', filters.activeIngredientId)
      }
      if (filters?.groupId) {
        countQuery = countQuery.eq('group_id', filters.groupId)
        dataQuery = dataQuery.eq('group_id', filters.groupId)
      }
      if (filters?.unitId) {
        countQuery = countQuery.eq('unit_stock_id', filters.unitId)
        dataQuery = dataQuery.eq('unit_stock_id', filters.unitId)
      }
      if (filters?.status) {
        const isActive = filters.status === 'active'
        countQuery = countQuery.eq('active', isActive)
        dataQuery = dataQuery.eq('active', isActive)
      }

      // Get total count
      const { count, error: countError } = await countQuery
      if (countError) throw countError

      const totalCount = count ?? 0
      const totalPages = Math.ceil(totalCount / pageSize)

      // Get paginated data with sorting
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data, error } = await dataQuery
        .order(sortColumn, { ascending: sortDirection === 'asc' })
        .range(from, to)

      if (error) throw error

      return {
        data: data as ProductWithPresentations[],
        totalCount,
        totalPages,
        currentPage: page,
      }
    },
    enabled: !!company?.id,
  })
}

// Fetch items with presentations (for NFe import and stock)
export function useProductsWithPresentations() {
  const { company } = useAuthStore()

  return useQuery({
    queryKey: [QUERY_KEY, company?.id, 'with-presentations'],
    queryFn: async () => {
      if (!company?.id) return []

      const { data, error } = await supabase
        .from('product')
        .select(
          `
          *,
          presentations:product_presentation(*),
          active_ingredient_rel:active_ingredient(id, name),
          unit_stock:unit_stock_id(id, code, name, symbol),
          unit_prescription:unit_prescription_id(id, code, name),
          group:group_id(id, code, name, color)
        `
        )
        .eq('company_id', company.id)
        .eq('active', true)
        .order('name')

      if (error) throw error
      return data as ProductWithPresentations[]
    },
    enabled: !!company?.id,
  })
}

export function useProduct(id: string | undefined) {
  const { company } = useAuthStore()

  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id || !company?.id) return null

      const { data, error } = await supabase
        .from('product')
        .select(
          `
          *,
          active_ingredient_rel:active_ingredient(id, name),
          unit_stock:unit_of_measure!product_unit_stock_id_fkey(id, code, name, symbol),
          unit_prescription:unit_of_measure!product_unit_prescription_id_fkey(id, code, name),
          presentations:product_presentation(id, name, barcode, conversion_factor, unit, manufacturer_id),
          group:product_group(id, code, name, color)
        `
        )
        .eq('company_id', company.id)
        .filter('id', 'eq', id)
        .single()

      if (error) throw error
      return data as Product
    },
    enabled: !!id && !!company?.id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  const { company } = useAuthStore()

  return useMutation({
    mutationFn: async (data: Omit<InsertTables<'product'>, 'company_id'>) => {
      if (!company?.id) throw new Error('No company')

      const { data: item, error } = await supabase
        .from('product')
        .insert({ ...data, company_id: company.id } as any)
        .select()
        .single()

      if (error) throw error

      // Registrar log de criação
      await logUserAction({
        companyId: company.id,
        action: 'create',
        entity: 'product',
        entityId: item.id,
        entityName: item.name,
        newData: item,
      })

      return item as Product
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast.success('Produto cadastrado com sucesso!')
    },
    onError: (error) => {
      console.error('Error creating product:', error)
      toast.error('Erro ao cadastrar produto')
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  const { company } = useAuthStore()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTables<'product'> & { id: string }) => {
      if (!company?.id) throw new Error('No company')

      // Buscar dados anteriores para o log
      const { data: oldItem } = await supabase
        .from('product')
        .select('*')
        .eq('company_id', company.id)
        .filter('id', 'eq', id)
        .single()

      const { data: item, error } = await supabase
        .from('product')
        .update(data as any)
        .eq('company_id', company.id)
        .filter('id', 'eq', id)
        .select()
        .single()

      if (error) throw error

      // Registrar log de atualização
      await logUserAction({
        companyId: company.id,
        action: 'update',
        entity: 'product',
        entityId: item.id,
        entityName: item.name,
        oldData: oldItem,
        newData: item,
      })

      return item as Product
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast.success('Produto atualizado com sucesso!')
    },
    onError: (error) => {
      console.error('Error updating product:', error)
      toast.error('Erro ao atualizar produto')
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  const { company } = useAuthStore()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!company?.id) throw new Error('No company')

      // Buscar dados do produto antes de deletar para o log
      const { data: oldItem } = await supabase
        .from('product')
        .select('*')
        .eq('company_id', company.id)
        .filter('id', 'eq', id)
        .single()

      const { error } = await supabase
        .from('product')
        .delete()
        .eq('company_id', company.id)
        .filter('id', 'eq', id)

      if (error) throw error

      // Registrar log de exclusão
      if (oldItem) {
        await logUserAction({
          companyId: company.id,
          action: 'delete',
          entity: 'product',
          entityId: id,
          entityName: oldItem.name,
          oldData: oldItem,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast.success('Produto excluído com sucesso!')
    },
    onError: (error) => {
      console.error('Error deleting product:', error)
      toast.error('Erro ao excluir produto')
    },
  })
}

// Hook para buscar produtos com filtro que inclui apresentações
export function useProductsSearchWithPresentations(
  searchTerm: string = '',
  itemType?: 'medication' | 'material' | 'diet'
) {
  const { company } = useAuthStore()

  const {
    data = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: [QUERY_KEY, company?.id, 'search-with-presentations', searchTerm, itemType],
    queryFn: async () => {
      if (!company?.id) return []

      let productIds: string[] = []
      let shouldFilterBySearch = false
      const pageSize = 1000

      if (searchTerm.trim()) {
        shouldFilterBySearch = true

        // Função para normalizar texto (remover acentos e converter para minúscula)
        const normalizeText = (value: string) =>
          value
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')

        const normalizedSearchTerm = normalizeText(searchTerm.trim())

        // Buscar IDs de produtos que atendem aos critérios de busca
        // 1. Produtos que têm o termo no nome (busca normalizada)
        // Primeiro, buscar todos os produtos e filtrar no lado cliente para garantir busca normalizada
        let allProductsData: Array<{ id: string; name: string; concentration: string | null }> = []
        let productsPage = 0
        let hasMoreProducts = true

        while (hasMoreProducts) {
          let productQuery = supabase
            .from('product')
            .select('id, name, concentration')
            .eq('company_id', company.id)
            .range(productsPage * pageSize, (productsPage + 1) * pageSize - 1)

          if (itemType) {
            productQuery = productQuery.eq('item_type', itemType)
          }

          const { data: productsPageData, error: productsPageError } = await productQuery
          if (productsPageError) throw productsPageError

          if (!productsPageData || productsPageData.length === 0) {
            hasMoreProducts = false
            break
          }

          allProductsData = [
            ...allProductsData,
            ...(productsPageData as Array<{
              id: string
              name: string
              concentration: string | null
            }>),
          ]

          if (productsPageData.length < pageSize) {
            hasMoreProducts = false
          } else {
            productsPage++
          }
        }

        // Filtrar produtos no lado cliente usando busca normalizada
        const productsByName =
          allProductsData?.filter((product) => {
            const normalizedName = normalizeText(product.name || '')
            const normalizedConcentration = normalizeText(product.concentration || '')
            return (
              normalizedName.includes(normalizedSearchTerm) ||
              normalizedConcentration.includes(normalizedSearchTerm)
            )
          }) || []

        // 2. Produtos que têm apresentações com o termo no nome
        // Primeiro buscar todas as apresentações e filtrar no lado cliente
        const { data: allPresentationsData, error: presentationsError } = await supabase
          .from('product_presentation')
          .select('product_id, name, product:product_id(id, item_type)')
          .eq('company_id', company.id)
          .eq('active', true)
          .range(0, pageSize * 10 - 1)

        if (presentationsError) {
          console.warn('Erro ao buscar apresentações:', presentationsError)
        }

        // Filtrar apresentações no lado cliente usando busca normalizada
        const productsByPresentations =
          allPresentationsData
            ?.filter((p) => {
              // Filtrar por nome da apresentação normalizado
              const normalizedPresentationName = normalizeText(p.name || '')
              const matchesSearch = normalizedPresentationName.includes(normalizedSearchTerm)

              if (!matchesSearch) return false

              // Filtrar por tipo de item se necessário
              if (!itemType) return true
              const product = p.product as any
              return product?.item_type === itemType
            })
            .map((p) => ({ id: p.product_id })) || []

        // Combinar e remover duplicatas
        const combinedProducts = [...(productsByName || []), ...productsByPresentations]
        productIds = [...new Set(combinedProducts.map((p) => p.id))]
      }

      // Query principal para buscar produtos
      let query = supabase
        .from('product')
        .select(
          `
          *,
          presentations:product_presentation(id),
          active_ingredient_rel:active_ingredient(id, name),
          unit_stock:unit_stock_id(id, code, name, symbol),
          unit_prescription:unit_prescription_id(id, code, name, symbol),
          group:group_id(id, code, name, color)
        `
        )
        .eq('company_id', company.id)
        .eq('active', true)
        .order('name')

      // Filtrar por tipo se especificado
      if (itemType) {
        query = query.eq('item_type', itemType)
      }

      // Filtrar por busca se houver termo
      if (shouldFilterBySearch) {
        if (productIds.length > 0) {
          query = query.in('id', productIds)
        } else {
          // Se há termo de busca mas nenhum produto encontrado, retornar vazio
          return []
        }
      }

      const { data, error } = await query

      if (error) throw error
      return data as ProductWithPresentations[]
    },
    enabled: !!company?.id,
  })

  return { data, isLoading, isFetching }
}
