import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Profession = Database['public']['Tables']['profession']['Row'];
type ProfessionInsert = Database['public']['Tables']['profession']['Insert'];
type ProfessionUpdate = Database['public']['Tables']['profession']['Update'];

const QUERY_KEY = 'professions';

export function useProfessions() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profession')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Profession[];
    },
  });
}

export function useCreateProfession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profession: Omit<ProfessionInsert, 'company_id'>) => {
      // Get current user's company_id
      const { data: userData } = await supabase.from('app_users').select('company_id').single();

      if (!userData?.company_id) {
        throw new Error('Usuário não encontrado');
      }

      const { data, error } = await supabase
        .from('profession')
        .insert({ ...profession, company_id: userData.company_id })
        .select()
        .single();

      if (error) throw error;
      return data as Profession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateProfession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ProfessionUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('profession')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Profession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useDeleteProfession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('profession').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export type { Profession };
