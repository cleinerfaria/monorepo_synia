import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

const QUERY_KEY = 'product-groups';

export interface ProductGroup {
  id: string;
  company_id: string | null;
  code: string | null;
  name: string;
  description: string | null;
  parent_id: string | null;
  color: string | null;
  icon: string | null;
  sort_order: number | null;
  active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductGroupWithParent = ProductGroup & {
  parent?: ProductGroup | null;
};

export function useProductGroups() {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      // Busca grupos globais (company_id IS NULL) e da empresa
      const { data, error } = await supabase
        .from('product_group')
        .select(
          `
          *,
          parent:parent_id(id, name, code, color)
        `
        )
        .or(`company_id.is.null,company_id.eq.${company.id}`)
        .eq('active', true)
        .order('sort_order')
        .order('name');

      if (error) throw error;
      return data as ProductGroupWithParent[];
    },
    enabled: !!company?.id,
  });
}

export function useProductGroup(id: string | undefined) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id || !company?.id) return null;

      const { data, error } = await supabase
        .from('product_group')
        .select(
          `
          *,
          parent:parent_id(id, name, code, color)
        `
        )
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as ProductGroupWithParent;
    },
    enabled: !!id && !!company?.id,
  });
}

export function useCreateProductGroup() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async (
      data: Omit<ProductGroup, 'id' | 'company_id' | 'is_system' | 'created_at' | 'updated_at'>
    ) => {
      if (!company?.id) throw new Error('No company');

      const { data: group, error } = await supabase
        .from('product_group')
        .insert({ ...data, company_id: company.id, is_system: false })
        .select()
        .single();

      if (error) throw error;
      return group as ProductGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Grupo criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating product group:', error);
      toast.error('Erro ao criar grupo');
    },
  });
}

export function useUpdateProductGroup() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ProductGroup> & { id: string }) => {
      if (!company?.id) throw new Error('No company');

      const { data: group, error } = await supabase
        .from('product_group')
        .update(data)
        .eq('id', id)
        .eq('company_id', company.id)
        .select()
        .single();

      if (error) throw error;
      return group as ProductGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Grupo atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating product group:', error);
      toast.error('Erro ao atualizar grupo');
    },
  });
}

export function useDeleteProductGroup() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!company?.id) throw new Error('No company');

      const { error } = await supabase
        .from('product_group')
        .delete()
        .eq('id', id)
        .eq('company_id', company.id)
        .eq('is_system', false); // Não permite excluir grupos de sistema

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Grupo excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting product group:', error);
      toast.error('Erro ao excluir grupo');
    },
  });
}
