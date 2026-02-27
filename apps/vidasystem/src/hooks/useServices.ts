import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination';
import toast from 'react-hot-toast';

const QUERY_KEY = 'services';

export interface Service {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceInput {
  code: string;
  name: string;
  description?: string | null;
  sort_order?: number;
  active?: boolean;
}

export interface UpdateServiceInput extends Partial<CreateServiceInput> {
  id: string;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const toNullable = (value: string | null | undefined) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

export function useServicesPaginated(
  page: number = 1,
  pageSize: number = DEFAULT_LIST_PAGE_SIZE,
  searchTerm: string = ''
) {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, 'paginated', companyId, page, pageSize, searchTerm],
    queryFn: async (): Promise<PaginatedResult<Service>> => {
      if (!companyId) {
        return { data: [], totalCount: 0, page, pageSize, totalPages: 0 };
      }

      let countQuery = supabase
        .from('service')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      let dataQuery = supabase
        .from('service')
        .select('*, active:is_active')
        .eq('company_id', companyId)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (searchTerm?.trim()) {
        const searchFilter = `%${searchTerm.trim()}%`;
        countQuery = countQuery.or(
          `name.ilike.${searchFilter},code.ilike.${searchFilter},description.ilike.${searchFilter}`
        );
        dataQuery = dataQuery.or(
          `name.ilike.${searchFilter},code.ilike.${searchFilter},description.ilike.${searchFilter}`
        );
      }

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);
      const offset = (page - 1) * pageSize;

      dataQuery = dataQuery.range(offset, offset + pageSize - 1);

      const { data, error } = await dataQuery;
      if (error) throw error;

      return {
        data: (data || []) as Service[],
        totalCount,
        page,
        pageSize,
        totalPages,
      };
    },
    enabled: !!companyId,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async (input: CreateServiceInput) => {
      if (!company?.id) throw new Error('No company');

      const { data, error } = await supabase
        .from('service')
        .insert({
          company_id: company.id,
          code: input.code.trim(),
          name: input.name.trim(),
          description: toNullable(input.description),
          sort_order: Number.isFinite(input.sort_order) ? input.sort_order : 0,
          is_active: input.active ?? true,
        })
        .select('*, active:is_active')
        .single();

      if (error) throw error;
      return data as Service;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Serviço cadastrado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error creating service:', error);
      if (error?.code === '23505') {
        toast.error('Já existe um serviço com este código ou nome');
      } else {
        toast.error('Erro ao cadastrar serviço');
      }
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateServiceInput) => {
      if (!company?.id) throw new Error('No company');

      const payload: Record<string, any> = {};

      if (updates.code !== undefined) payload.code = updates.code.trim();
      if (updates.name !== undefined) payload.name = updates.name.trim();
      if (updates.description !== undefined) payload.description = toNullable(updates.description);
      if (updates.sort_order !== undefined) payload.sort_order = updates.sort_order;
      if (updates.active !== undefined) payload.is_active = updates.active;

      const { data, error } = await supabase
        .from('service')
        .update(payload)
        .eq('id', id)
        .eq('company_id', company.id)
        .select('*, active:is_active')
        .single();

      if (error) throw error;
      return data as Service;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Serviço atualizado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error updating service:', error);
      if (error?.code === '23505') {
        toast.error('Já existe um serviço com este código ou nome');
      } else {
        toast.error('Erro ao atualizar serviço');
      }
    },
  });
}
