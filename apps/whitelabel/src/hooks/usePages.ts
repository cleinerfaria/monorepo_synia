import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { Page, PageInsert, PageUpdate } from '@/types/database';

export const usePages = () => {
  const { appUser } = useAuthStore();
  const queryClient = useQueryClient();

  // Query para buscar todas as páginas da empresa
  const {
    data: pages = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['pages', appUser?.company_id],
    queryFn: async () => {
      if (!appUser?.company_id) throw new Error('Company ID not found');

      const { data, error } = await supabase
        .from('page')
        .select('*')
        .eq('company_id', appUser.company_id)
        .order('name');

      if (error) throw error;
      return data as Page[];
    },
    enabled: !!appUser?.company_id,
  });

  // Mutation para criar uma nova página
  const createPageMutation = useMutation({
    mutationFn: async (pageData: Omit<PageInsert, 'company_id'>) => {
      if (!appUser?.company_id) throw new Error('Company ID not found');

      const { data, error } = await supabase
        .from('page')
        .insert({
          ...pageData,
          company_id: appUser.company_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Page;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
    },
  });

  // Mutation para atualizar uma página
  const updatePageMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: PageUpdate }) => {
      const { data, error } = await supabase
        .from('page')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Page;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
    },
  });

  // Mutation para deletar uma página
  const deletePageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('page').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      queryClient.invalidateQueries({ queryKey: ['pageFilters'] });
    },
  });

  // Query para buscar uma página específica
  const usePage = (id?: string) => {
    return useQuery({
      queryKey: ['page', id],
      queryFn: async () => {
        if (!id) throw new Error('Page ID is required');

        const { data, error } = await supabase.from('page').select('*').eq('id', id).single();

        if (error) throw error;
        return data as Page;
      },
      enabled: !!id,
    });
  };

  return {
    pages,
    isLoading,
    error,
    createPage: createPageMutation.mutateAsync,
    updatePage: updatePageMutation.mutateAsync,
    deletePage: deletePageMutation.mutateAsync,
    isCreating: createPageMutation.isPending,
    isUpdating: updatePageMutation.isPending,
    isDeleting: deletePageMutation.isPending,
    usePage,
  };
};

export default usePages;
