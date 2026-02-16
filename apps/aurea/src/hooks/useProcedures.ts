import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Procedure } from '@/types/database';
import toast from 'react-hot-toast';
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination';

const QUERY_KEY = 'procedures';

type ProcedureInsert = Omit<
  Procedure,
  'id' | 'company_id' | 'created_at' | 'updated_at' | 'unit_of_measure'
>;
type ProcedureUpdate = Partial<
  Omit<Procedure, 'company_id' | 'created_at' | 'updated_at' | 'unit_of_measure'>
>;

// Pagination interface
export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Hook with server-side pagination
export function useProceduresPaginated(
  page: number = 1,
  pageSize: number = DEFAULT_LIST_PAGE_SIZE,
  searchTerm: string = ''
) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, 'paginated', company?.id, page, pageSize, searchTerm],
    queryFn: async (): Promise<PaginatedResult<Procedure>> => {
      if (!company?.id) {
        return { data: [], totalCount: 0, page, pageSize, totalPages: 0 };
      }

      // Build query for count
      let countQuery = supabase
        .from('procedure')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id);

      // Build query for data
      let dataQuery = supabase
        .from('procedure')
        .select('*')
        .eq('company_id', company.id)
        .order('name');

      // Apply search filter
      if (searchTerm?.trim()) {
        const searchFilter = `%${searchTerm.trim()}%`;
        countQuery = countQuery.or(
          `name.ilike.${searchFilter},code.ilike.${searchFilter},category.ilike.${searchFilter}`
        );
        dataQuery = dataQuery.or(
          `name.ilike.${searchFilter},code.ilike.${searchFilter},category.ilike.${searchFilter}`
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
        data: data as Procedure[],
        totalCount,
        page,
        pageSize,
        totalPages,
      };
    },
    enabled: !!company?.id,
  });
}

// Legacy hook - fetches all (with 1000 limit) - use for backward compatibility
export function useProcedures() {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('procedure')
        .select('*')
        .eq('company_id', company.id)
        .order('name');

      if (error) throw error;
      return data as Procedure[];
    },
    enabled: !!company?.id,
  });
}

export function useSearchProcedures(searchTerm: string = '') {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, 'search', company?.id, searchTerm],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('procedure')
        .select('*')
        .eq('company_id', company.id)
        .eq('active', true)
        .order('name');

      if (searchTerm?.trim()) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      // Quando há busca, retorna até 200 resultados; sem busca, retorna 50 iniciais
      const limit = searchTerm?.trim() ? 200 : 50;
      const { data, error } = await query.limit(limit);

      if (error) throw error;
      return data as Procedure[];
    },
    enabled: !!company?.id,
  });
}

export function useProcedure(id: string | undefined) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id || !company?.id) return null;

      const { data, error } = await supabase
        .from('procedure')
        .select('*')
        .eq('id', id)
        .eq('company_id', company.id)
        .single();

      if (error) throw error;
      return data as Procedure;
    },
    enabled: !!id && !!company?.id,
  });
}

export function useCreateProcedure() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async (data: ProcedureInsert) => {
      if (!company?.id) throw new Error('No company');

      const { data: procedure, error } = await supabase
        .from('procedure')
        .insert({ ...data, company_id: company.id } as any)
        .select('*')
        .single();

      if (error) throw error;
      return procedure as Procedure;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Procedimento cadastrado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error creating procedure:', error);
      if (error?.code === '23505') {
        toast.error('Já existe um procedimento com este código');
      } else {
        toast.error('Erro ao cadastrar procedimento');
      }
    },
  });
}

export function useUpdateProcedure() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, ...data }: ProcedureUpdate & { id: string }) => {
      if (!company?.id) throw new Error('No company');

      const { data: procedure, error } = await supabase
        .from('procedure')
        .update(data as any)
        .eq('id', id)
        .eq('company_id', company.id)
        .select('*')
        .single();

      if (error) throw error;
      return procedure as Procedure;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Procedimento atualizado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error updating procedure:', error);
      if (error?.code === '23505') {
        toast.error('Já existe um procedimento com este código');
      } else {
        toast.error('Erro ao atualizar procedimento');
      }
    },
  });
}

export function useToggleProcedureStatus() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (!company?.id) throw new Error('No company');

      const { data: procedure, error } = await supabase
        .from('procedure')
        .update({ active })
        .eq('id', id)
        .eq('company_id', company.id)
        .select('*')
        .single();

      if (error) throw error;
      return procedure as Procedure;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(
        data.active ? 'Procedimento ativado com sucesso!' : 'Procedimento inativado com sucesso!'
      );
    },
    onError: (error) => {
      console.error('Error toggling procedure status:', error);
      toast.error('Erro ao alterar status do procedimento');
    },
  });
}
