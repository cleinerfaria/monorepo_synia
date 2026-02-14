import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface CompanyParent {
  id: string
  name: string
  trade_name: string | null
  document: string | null
  postal_code: string | null
  address: string | null
  neiborhood: string | null
  number: string | null
  city: string | null
  state: string | null
  complement: string | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

export interface CreateCompanyParentInput {
  name: string
  trade_name?: string | null
  document?: string | null
  postal_code?: string | null
  address?: string | null
  neiborhood?: string | null
  number?: string | null
  city?: string | null
  state?: string | null
  complement?: string | null
  is_active?: boolean | null
}

export interface UpdateCompanyParentInput extends Partial<CreateCompanyParentInput> {
  id: string
}

export function useCompanyParents() {
  return useQuery({
    queryKey: ['company-parents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('company_parent').select('*').order('name')

      if (error) throw error
      return data as CompanyParent[]
    },
  })
}

export function useCompanyParent(id: string | undefined) {
  return useQuery({
    queryKey: ['company-parent', id],
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('company_parent')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as CompanyParent
    },
    enabled: !!id,
  })
}

export function useCreateCompanyParent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateCompanyParentInput) => {
      const { data, error } = await supabase
        .from('company_parent')
        .insert({
          name: input.name,
          trade_name: input.trade_name || null,
          document: input.document || null,
          postal_code: input.postal_code || null,
          address: input.address || null,
          neiborhood: input.neiborhood || null,
          number: input.number || null,
          city: input.city || null,
          state: input.state || null,
          complement: input.complement || null,
          is_active: input.is_active ?? true,
        })
        .select()
        .single()

      if (error) throw error
      return data as CompanyParent
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-parents'] })
    },
  })
}

export function useUpdateCompanyParent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateCompanyParentInput) => {
      const { id, ...updates } = input

      const { data, error } = await supabase
        .from('company_parent')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as CompanyParent
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company-parents'] })
      queryClient.invalidateQueries({ queryKey: ['company-parent', data.id] })
    },
  })
}
