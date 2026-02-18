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
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('professional')
        .select('*, active:is_active, profession(name)')
        .eq('company_id', company.id)
        .order('name');

      if (error) throw error;
      return data as ProfessionalWithRelations[];
    },
    enabled: !!company?.id,
  });
}

export function useProfessional(id: string | undefined) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id || !company?.id) return null;

      const { data, error } = await supabase
        .from('professional')
        .select('*, active:is_active')
        .eq('company_id', company.id)
        .filter('id', 'eq', id)
        .single();

      if (error) throw error;
      return data as Professional;
    },
    enabled: !!id && !!company?.id,
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
  const { company } = useAuthStore();

  return useQuery({
    queryKey: ['professions', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('profession')
        .select('*, active:is_active')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });
}
