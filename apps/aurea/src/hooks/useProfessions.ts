import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

type Profession = {
  id: string;
  company_id: string;
  code: string | null;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type ProfessionInsert = {
  code?: string | null;
  name: string;
  description?: string | null;
  active?: boolean;
};

type ProfessionUpdate = Partial<ProfessionInsert>;

const QUERY_KEY = 'professions';

export function useProfessions() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profession')
        .select('*, active:is_active')
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
      const { data: userData } = await supabase.from('app_user').select('company_id').single();

      if (!userData?.company_id) {
        throw new Error('Usuário não encontrado');
      }

      const payload: Record<string, any> = { ...profession };
      if (payload.active !== undefined) {
        payload.is_active = payload.active;
        delete payload.active;
      }

      const { data, error } = await supabase
        .from('profession')
        .insert({ ...payload, company_id: userData.company_id } as any)
        .select('*, active:is_active')
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
      const payload: Record<string, any> = { ...updates };
      if (payload.active !== undefined) {
        payload.is_active = payload.active;
        delete payload.active;
      }
      const { data, error } = await supabase
        .from('profession')
        .update(payload)
        .eq('id', id)
        .select('*, active:is_active')
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
