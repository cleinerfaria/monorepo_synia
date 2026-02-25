import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Professional, InsertTables, UpdateTables } from '@/types/database';
import toast from 'react-hot-toast';

const QUERY_KEY = 'professionals';

export type ProfessionalWithRelations = Professional & {
  profession: {
    name: string;
  } | null;
};

export function useProfessionals() {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);;

  return useQuery({
    queryKey: [QUERY_KEY, companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('professional')
        .select('*, active:is_active, profession(name)')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;
      return data as ProfessionalWithRelations[];
    },
    enabled: !!companyId,
  });
}

export function useProfessional(id: string | undefined) {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);;

  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id || !companyId) return null;

      const { data, error } = await supabase
        .from('professional')
        .select('*, active:is_active')
        .eq('company_id', companyId)
        .filter('id', 'eq', id)
        .single();

      if (error) throw error;
      return data as Professional;
    },
    enabled: !!id && !!companyId,
  });
}

export function useCreateProfessional() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async (data: Omit<InsertTables<'professional'>, 'company_id'>) => {
      if (!company?.id) throw new Error('No company');
      const payload: Record<string, any> = { ...data };
      if (payload.active !== undefined) {
        payload.is_active = payload.active;
        delete payload.active;
      }

      const { data: professional, error } = await supabase
        .from('professional')
        .insert({ ...payload, company_id: company.id } as any)
        .select('*, active:is_active')
        .single();

      if (error) throw error;
      return professional as Professional;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Profissional cadastrado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating professional:', error);
      toast.error('Erro ao cadastrar profissional');
    },
  });
}

export function useUpdateProfessional() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTables<'professional'> & { id: string }) => {
      if (!company?.id) throw new Error('No company');
      const payload: Record<string, any> = { ...data };
      if (payload.active !== undefined) {
        payload.is_active = payload.active;
        delete payload.active;
      }

      const { data: professional, error } = await supabase
        .from('professional')
        .update(payload as any)
        .eq('company_id', company.id)
        .filter('id', 'eq', id)
        .select('*, active:is_active')
        .single();

      if (error) throw error;
      return professional as Professional;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Profissional atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating professional:', error);
      toast.error('Erro ao atualizar profissional');
    },
  });
}

export function useDeleteProfessional() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!company?.id) throw new Error('No company');

      const { error } = await supabase
        .from('professional')
        .delete()
        .eq('company_id', company.id)
        .filter('id', 'eq', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Profissional excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting professional:', error);
      toast.error('Erro ao excluir profissional');
    },
  });
}

export function useProfessions() {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);;

  return useQuery({
    queryKey: ['professions', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('profession')
        .select('*, active:is_active')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}
