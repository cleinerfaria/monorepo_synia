import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { ProductPresentation, InsertTables, UpdateTables } from '@/types/database'
import toast from 'react-hot-toast'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'

const QUERY_KEY = 'product-presentations'

interface PaginatedResult<T> {
  data: T[]
  totalCount: number
  totalPages: number
  currentPage: number
}

export type PresentationWithRelations = ProductPresentation & {
  product?: { id: string; name: string; concentration: string | null; item_type: string } | null
  manufacturer?: { id: string; name: string; trade_name?: string | null } | null
}

export function usePresentationsPaginated(
  page: number = 1,
  pageSize: number = DEFAULT_LIST_PAGE_SIZE,
  searchTerm: string = '',
  filters: { productId?: string; status?: string } = {}
) {
  const { company } = useAuthStore()

  return useQuery({
    queryKey: [QUERY_KEY, 'paginated', company?.id, page, pageSize, searchTerm, filters],
    queryFn: async (): Promise<PaginatedResult<PresentationWithRelations>> => {
      if (!company?.id) return { data: [], totalCount: 0, totalPages: 0, currentPage: page }

      const trimmedSearchTerm = searchTerm.trim()
      let productIds: string[] = []

      // Se há termo de busca, buscar produtos que correspondem ao termo
      if (trimmedSearchTerm) {
        // 1. Buscar produtos que contêm o termo no nome ou concentração
        const { data: productsByName, error: productsByNameError } = await supabase
          .from('product')
          .select('id')
          .eq('company_id', company.id)
          .or(`name.ilike.%${trimmedSearchTerm}%,concentration.ilike.%${trimmedSearchTerm}%`)

        if (productsByNameError) throw productsByNameError

        if (productsByName) {
          productIds = productsByName.map((p) => p.id)
        }
      }

      // Build base query for count
      let countQuery = supabase
        .from('product_presentation')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id)

      // Build base query for data
      let dataQuery = supabase
        .from('product_presentation')
        .select(
          `*,
          product:product_id(id, name, concentration, item_type),
          manufacturer:manufacturer_id(id, name, trade_name)`
        )
        .eq('company_id', company.id)

      // Apply search filter
      if (trimmedSearchTerm) {
        // Search in presentation name, barcode, supplier_name OR product name/concentration
        let searchFilter = `name.ilike.%${trimmedSearchTerm}%,barcode.ilike.%${trimmedSearchTerm}%,supplier_name.ilike.%${trimmedSearchTerm}%`

        // Se encontramos produtos que correspondem ao termo, incluir também
        if (productIds.length > 0) {
          const quotedProductIds = productIds.map((id) => `"${id}"`).join(',')
          searchFilter += `,product_id.in.(${quotedProductIds})`
        }

        countQuery = countQuery.or(searchFilter)
        dataQuery = dataQuery.or(searchFilter)
      }

      // Apply product filter
      if (filters.productId) {
        countQuery = countQuery.eq('product_id', filters.productId)
        dataQuery = dataQuery.eq('product_id', filters.productId)
      }

      // Apply status filter
      if (filters.status === 'active') {
        countQuery = countQuery.eq('active', true)
        dataQuery = dataQuery.eq('active', true)
      } else if (filters.status === 'inactive') {
        countQuery = countQuery.eq('active', false)
        dataQuery = dataQuery.eq('active', false)
      }

      // Get total count
      const { count, error: countError } = await countQuery
      if (countError) throw countError

      const totalCount = count ?? 0
      const totalPages = Math.ceil(totalCount / pageSize)

      // Get paginated data
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data, error } = await dataQuery.order('name').range(from, to)

      if (error) throw error

      return {
        data: (data as PresentationWithRelations[]) ?? [],
        totalCount,
        totalPages,
        currentPage: page,
      }
    },
    enabled: !!company?.id,
  })
}

export function usePresentations(productId: string | undefined) {
  const { company } = useAuthStore()

  return useQuery({
    queryKey: [QUERY_KEY, productId],
    queryFn: async () => {
      if (!productId || !company?.id) return []

      const { data, error } = await supabase
        .from('product_presentation')
        .select('*, manufacturer:manufacturer_id(id, name, trade_name)')
        .eq('product_id', productId)
        .eq('company_id', company.id)
        .order('conversion_factor')

      if (error) throw error
      return data as (ProductPresentation & {
        manufacturer?: { id: string; name: string; trade_name?: string } | null
      })[]
    },
    enabled: !!productId && !!company?.id,
  })
}

export function useCreatePresentation() {
  const queryClient = useQueryClient()
  const { company } = useAuthStore()

  return useMutation({
    mutationFn: async (data: Omit<InsertTables<'product_presentation'>, 'company_id'>) => {
      if (!company?.id) throw new Error('No company')

      const { data: presentation, error } = await supabase
        .from('product_presentation')
        .insert({ ...data, company_id: company.id })
        .select()
        .single()

      if (error) throw error
      return presentation as ProductPresentation
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, data.product_id],
      })
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, 'paginated'],
      })
      toast.success('Apresentação cadastrada com sucesso!')
    },
    onError: (error) => {
      console.error('Error creating presentation:', error)
      toast.error('Erro ao cadastrar apresentação')
    },
  })
}

export function useUpdatePresentation() {
  const queryClient = useQueryClient()
  const { company } = useAuthStore()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTables<'product_presentation'> & { id: string }) => {
      if (!company?.id) throw new Error('No company')

      const { data: presentation, error } = await supabase
        .from('product_presentation')
        .update(data)
        .eq('id', id)
        .eq('company_id', company.id)
        .select()
        .single()

      if (error) throw error
      return presentation as ProductPresentation
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, data.product_id],
      })
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, 'paginated'],
      })
      toast.success('Apresentação atualizada com sucesso!')
    },
    onError: (error) => {
      console.error('Error updating presentation:', error)
      toast.error('Erro ao atualizar apresentação')
    },
  })
}

// Buscar apresentação por barcode/EAN
export function usePresentationByBarcode(barcode: string | null | undefined) {
  const { company } = useAuthStore()

  return useQuery({
    queryKey: [QUERY_KEY, 'by-barcode', barcode],
    queryFn: async () => {
      if (!barcode || !company?.id) return null

      const { data, error } = await supabase
        .from('product_presentation')
        .select(
          `
          *,
          product:product_id (
            id,
            name,
            unit_stock:unit_stock_id(id, code, name),
            item_type
          )
        `
        )
        .eq('company_id', company.id)
        .eq('barcode', barcode)
        .eq('active', true)
        .maybeSingle()

      if (error) throw error
      return data as
        | (ProductPresentation & {
            product: {
              id: string
              name: string
              unit_stock: { id: string; code: string; name: string } | null
              item_type: string
            } | null
          })
        | null
    },
    enabled: !!barcode && !!company?.id,
  })
}

// Buscar múltiplas apresentações por lista de barcodes
export async function findPresentationsByBarcodes(
  companyId: string,
  barcodes: string[]
): Promise<Map<string, { presentationId: string; productId: string }>> {
  const result = new Map<string, { presentationId: string; productId: string }>()

  if (!barcodes.length) return result

  // Filtrar barcodes válidos (não vazios e não nulos)
  const validBarcodes = barcodes.filter((b) => b && b.trim() !== '')
  if (!validBarcodes.length) return result

  const { data, error } = await supabase
    .from('product_presentation')
    .select('id, barcode, product_id')
    .eq('company_id', companyId)
    .eq('active', true)
    .in('barcode', validBarcodes)

  if (error) {
    console.error('Error finding presentations by barcodes:', error)
    return result
  }

  if (data) {
    for (const presentation of data) {
      if (presentation.barcode) {
        result.set(presentation.barcode, {
          presentationId: presentation.id,
          productId: presentation.product_id,
        })
      }
    }
  }

  return result
}

export function useDeletePresentation() {
  const queryClient = useQueryClient()
  const { company } = useAuthStore()

  return useMutation({
    mutationFn: async ({ id, productId }: { id: string; productId: string }) => {
      if (!company?.id) throw new Error('No company')

      const { error } = await supabase
        .from('product_presentation')
        .delete()
        .eq('id', id)
        .eq('company_id', company.id)

      if (error) throw error
      return { productId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, data.productId],
      })
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, 'paginated'],
      })
      toast.success('Apresentação excluída com sucesso!')
    },
    onError: (error) => {
      console.error('Error deleting presentation:', error)
      toast.error('Erro ao excluir apresentação')
    },
  })
}
