import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { ActiveIngredient, InsertTables, UpdateTables } from '@/types/database';
import toast from 'react-hot-toast';
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination';

const QUERY_KEY = 'active_ingredients';

// Pagination interface
export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Hook with server-side pagination
export function useActiveIngredientsPaginated(
  page: number = 1,
  pageSize: number = DEFAULT_LIST_PAGE_SIZE,
  searchTerm: string = ''
) {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, 'paginated', companyId, page, pageSize, searchTerm],
    queryFn: async (): Promise<PaginatedResult<ActiveIngredient>> => {
      if (!companyId) {
        return { data: [], totalCount: 0, page, pageSize, totalPages: 0 };
      }

      // Build query for count
      let countQuery = supabase
        .from('active_ingredient')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      // Build query for data
      let dataQuery = supabase
        .from('active_ingredient')
        .select('*, active:is_active')
        .eq('company_id', companyId)
        .order('name');

      // Apply search filter
      if (searchTerm?.trim()) {
        const searchFilter = `%${searchTerm.trim()}%`;
        countQuery = countQuery.or(
          `name.ilike.${searchFilter},therapeutic_class.ilike.${searchFilter},cas_number.ilike.${searchFilter}`
        );
        dataQuery = dataQuery.or(
          `name.ilike.${searchFilter},therapeutic_class.ilike.${searchFilter},cas_number.ilike.${searchFilter}`
        );
      }

      // Get total count
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      // Apply pagination
      const offset = (page - 1) * pageSize;
      dataQuery = dataQuery.range(offset, offset + pageSize - 1);

      const { data, error } = await dataQuery;
      if (error) throw error;

      return {
        data: data as ActiveIngredient[],
        totalCount,
        page,
        pageSize,
        totalPages,
      };
    },
    enabled: !!companyId,
  });
}

// Legacy hook - fetches all (with 1000 limit) - use for backward compatibility
export function useActiveIngredients() {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('active_ingredient')
        .select('*, active:is_active')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;
      return data as ActiveIngredient[];
    },
    enabled: !!companyId,
  });
}

export function useSearchActiveIngredients(searchTerm: string = '') {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, 'search', companyId, searchTerm],
    queryFn: async () => {
      if (!companyId) return [];

      let query = supabase
        .from('active_ingredient')
        .select('*, active:is_active')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

      if (searchTerm?.trim()) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      // Quando há busca, retorna até 200 resultados; sem busca, retorna 50 iniciais
      const limit = searchTerm?.trim() ? 200 : 50;
      const { data, error } = await query.limit(limit);

      if (error) throw error;
      return data as ActiveIngredient[];
    },
    enabled: !!companyId,
  });
}

export function useActiveIngredient(id: string | undefined) {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, id, companyId],
    queryFn: async () => {
      if (!id || !companyId) return null;

      const { data, error } = await supabase
        .from('active_ingredient')
        .select('*, active:is_active')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data as ActiveIngredient;
    },
    enabled: !!id && !!companyId,
  });
}

export function useCreateActiveIngredient() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async (data: Omit<InsertTables<'active_ingredient'>, 'company_id'>) => {
      if (!company?.id) throw new Error('No company');
      const payload: Record<string, any> = { ...data };
      if (payload.active !== undefined) {
        payload.is_active = payload.active;
        delete payload.active;
      }

      const { data: activeIngredient, error } = await supabase
        .from('active_ingredient')
        .insert({ ...payload, company_id: company.id } as any)
        .select('*, active:is_active')
        .single();

      if (error) throw error;
      return activeIngredient as ActiveIngredient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Princípio ativo cadastrado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error creating active ingredient:', error);
      if (error?.code === '23505') {
        toast.error('Já existe um princípio ativo com este nome');
      } else {
        toast.error('Erro ao cadastrar princípio ativo');
      }
    },
  });
}

export function useUpdateActiveIngredient() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTables<'active_ingredient'> & { id: string }) => {
      if (!company?.id) throw new Error('No company');
      const payload: Record<string, any> = { ...data };
      if (payload.active !== undefined) {
        payload.is_active = payload.active;
        delete payload.active;
      }

      const { data: activeIngredient, error } = await supabase
        .from('active_ingredient')
        .update(payload as any)
        .eq('id', id)
        .eq('company_id', company.id)
        .select('*, active:is_active')
        .single();

      if (error) throw error;
      return activeIngredient as ActiveIngredient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Princípio ativo atualizado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error updating active ingredient:', error);
      if (error?.code === '23505') {
        toast.error('Já existe um princípio ativo com este nome');
      } else {
        toast.error('Erro ao atualizar princípio ativo');
      }
    },
  });
}

export function useToggleActiveIngredientStatus() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (!company?.id) throw new Error('No company');

      const { data: activeIngredient, error } = await supabase
        .from('active_ingredient')
        .update({ is_active: active })
        .eq('id', id)
        .eq('company_id', company.id)
        .select('*, active:is_active')
        .single();

      if (error) throw error;
      return activeIngredient as ActiveIngredient;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(
        data.active
          ? 'Princípio ativo ativado com sucesso!'
          : 'Princípio ativo inativado com sucesso!'
      );
    },
    onError: (error) => {
      console.error('Error toggling active ingredient status:', error);
      toast.error('Erro ao alterar status do princípio ativo');
    },
  });
}
