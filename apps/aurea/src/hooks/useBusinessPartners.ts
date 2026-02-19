import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { BusinessPartner, InsertTables, UpdateTables } from '@/types/database';
import toast from 'react-hot-toast';
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination';

const QUERY_KEY = 'business-partners';

export function useBusinessPartners() {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('business_partner')
        .select('*, active:is_active')
        .eq('company_id', company.id)
        .order('name');

      if (error) throw error;
      return data as BusinessPartner[];
    },
    enabled: !!company?.id,
  });
}

interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export function useBusinessPartnersPaginated(
  page: number = 1,
  pageSize: number = DEFAULT_LIST_PAGE_SIZE,
  searchTerm: string = ''
) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, 'paginated', company?.id, page, pageSize, searchTerm],
    queryFn: async (): Promise<PaginatedResult<BusinessPartner>> => {
      if (!company?.id) return { data: [], totalCount: 0, totalPages: 0, currentPage: page };

      // Build base query for count
      let countQuery = supabase
        .from('business_partner')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id);

      // Build base query for data
      let dataQuery = supabase
        .from('business_partner')
        .select('*, active:is_active')
        .eq('company_id', company.id);

      // Apply search filter if provided
      if (searchTerm) {
        const searchFilter = `name.ilike.%${searchTerm}%,legal_name.ilike.%${searchTerm}%,document.ilike.%${searchTerm}%`;
        countQuery = countQuery.or(searchFilter);
        dataQuery = dataQuery.or(searchFilter);
      }

      // Get total count
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      const totalCount = count ?? 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      // Get paginated data
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await dataQuery.order('name').range(from, to);

      if (error) throw error;

      return {
        data: data as BusinessPartner[],
        totalCount,
        totalPages,
        currentPage: page,
      };
    },
    enabled: !!company?.id,
  });
}

export function useBusinessPartner(id: string | undefined) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id || !company?.id) return null;

      const { data, error } = await supabase
        .from('business_partner')
        .select('*, active:is_active')
        .eq('id', id)
        .eq('company_id', company.id)
        .single();

      if (error) throw error;
      return data as BusinessPartner;
    },
    enabled: !!id && !!company?.id,
  });
}

export function useCreateBusinessPartner() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async (data: Omit<InsertTables<'business_partner'>, 'company_id'>) => {
      if (!company?.id) throw new Error('No company');
      const payload: Record<string, any> = { ...data };
      if (payload.active !== undefined) {
        payload.is_active = payload.active;
        delete payload.active;
      }

      const { data: businessPartner, error } = await supabase
        .from('business_partner')
        .insert({ ...payload, company_id: company.id } as any)
        .select('*, active:is_active')
        .single();

      if (error) throw error;
      return businessPartner as BusinessPartner;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Parceiro de negócio cadastrado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating business partner:', error);
      toast.error('Erro ao cadastrar parceiro de negócio');
    },
  });
}

export function useUpdateBusinessPartner() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTables<'business_partner'> & { id: string }) => {
      if (!company?.id) throw new Error('No company');
      const payload: Record<string, any> = { ...data };
      if (payload.active !== undefined) {
        payload.is_active = payload.active;
        delete payload.active;
      }

      const { data: businessPartner, error } = await supabase
        .from('business_partner')
        .update(payload as any)
        .eq('id', id)
        .eq('company_id', company.id)
        .select('*, active:is_active')
        .single();

      if (error) throw error;
      return businessPartner as BusinessPartner;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Parceiro de negócio atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating business partner:', error);
      toast.error('Erro ao atualizar parceiro de negócio');
    },
  });
}

export function useDeleteBusinessPartner() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!company?.id) throw new Error('No company');

      const { error } = await supabase
        .from('business_partner')
        .delete()
        .eq('id', id)
        .eq('company_id', company.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Parceiro de negócio excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting business partner:', error);
      toast.error('Erro ao excluir parceiro de negócio');
    },
  });
}
