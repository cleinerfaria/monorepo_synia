import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination';

const QUERY_KEY = 'units-of-measure';

// Pagination interface
export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UnitOfMeasure {
  id: string;
  company_id: string | null;
  code: string;
  name: string;
  symbol: string;
  description: string | null;
  allowed_scopes: UnitScope[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type UnitScope =
  | 'medication_base'
  | 'medication_prescription'
  | 'material_base'
  | 'material_prescription'
  | 'diet_base'
  | 'diet_prescription'
  | 'prescription_frequency'
  | 'procedure'
  | 'equipment'
  | 'scale';

// Hook with server-side pagination
export function useUnitsOfMeasurePaginated(
  page: number = 1,
  pageSize: number = DEFAULT_LIST_PAGE_SIZE,
  searchTerm: string = ''
) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, 'paginated', company?.id, page, pageSize, searchTerm],
    queryFn: async (): Promise<PaginatedResult<UnitOfMeasure>> => {
      if (!company?.id) {
        return { data: [], totalCount: 0, page, pageSize, totalPages: 0 };
      }

      // Build query for count
      let countQuery = supabase
        .from('unit_of_measure')
        .select('*', { count: 'exact', head: true })
        .or(`company_id.is.null,company_id.eq.${company.id}`);

      // Build query for data
      let dataQuery = supabase
        .from('unit_of_measure')
        .select('*')
        .or(`company_id.is.null,company_id.eq.${company.id}`)
        .order('name');

      // Apply search filter
      if (searchTerm?.trim()) {
        const searchFilter = `%${searchTerm.trim()}%`;
        countQuery = countQuery.or(
          `name.ilike.${searchFilter},code.ilike.${searchFilter},symbol.ilike.${searchFilter}`
        );
        dataQuery = dataQuery.or(
          `name.ilike.${searchFilter},code.ilike.${searchFilter},symbol.ilike.${searchFilter}`
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
        data: data as UnitOfMeasure[],
        totalCount,
        page,
        pageSize,
        totalPages,
      };
    },
    enabled: !!company?.id,
  });
}

export function useUnitsOfMeasure() {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      // Busca unidades globais (company_id IS NULL) e da empresa
      const { data, error } = await supabase
        .from('unit_of_measure')
        .select('*')
        .or(`company_id.is.null,company_id.eq.${company.id}`)
        .eq('active', true)
        .order('code');

      if (error) throw error;
      return data as UnitOfMeasure[];
    },
    enabled: !!company?.id,
  });
}

export function useUnitOfMeasure(id: string | undefined) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id || !company?.id) return null;

      const { data, error } = await supabase
        .from('unit_of_measure')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as UnitOfMeasure;
    },
    enabled: !!id && !!company?.id,
  });
}

export function useCreateUnitOfMeasure() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async (
      data: Omit<
        UnitOfMeasure,
        'id' | 'company_id' | 'created_at' | 'updated_at' | 'allowed_scopes'
      > & { allowed_scopes?: UnitScope[] }
    ) => {
      if (!company?.id) throw new Error('No company');

      const { data: unit, error } = await supabase
        .from('unit_of_measure')
        .insert({
          ...data,
          allowed_scopes: data.allowed_scopes ?? [],
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return unit as UnitOfMeasure;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Unidade de medida cadastrada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error creating unit of measure:', error);
      if (error.code === '23505') {
        toast.error('Já existe uma unidade com este código');
      } else {
        toast.error('Erro ao cadastrar unidade de medida');
      }
    },
  });
}

export function useUpdateUnitOfMeasure() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<UnitOfMeasure> & { id: string }) => {
      if (!company?.id) throw new Error('No company');

      const { data: unit, error } = await supabase
        .from('unit_of_measure')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return unit as UnitOfMeasure;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Unidade de medida atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating unit of measure:', error);
      toast.error('Erro ao atualizar unidade de medida');
    },
  });
}

export function useDeleteUnitOfMeasure() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!company?.id) throw new Error('No company');

      const { error } = await supabase.from('unit_of_measure').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Unidade de medida excluída com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting unit of measure:', error);
      toast.error('Erro ao excluir unidade de medida');
    },
  });
}
