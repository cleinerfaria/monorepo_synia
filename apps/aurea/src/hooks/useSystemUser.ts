import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { SystemUser } from '@/types/database';

const QUERY_KEY = 'system-users';

/** Lista todos os system_users (superadmins veem todos; demais veem apenas o próprio) */
export function useSystemUsers() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_user')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as SystemUser[];
    },
  });
}

/** Conta quantos system_users existem */
export function useSystemUserCount() {
  return useQuery({
    queryKey: [QUERY_KEY, 'count'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('count_system_users');
      if (error) throw error;
      return data as number;
    },
  });
}

interface CreateSystemUserInput {
  auth_user_id: string;
  is_superadmin: boolean;
  name: string;
  email: string;
}

/** Cria um novo system_user (usado no bootstrap do primeiro superadmin) */
export function useCreateSystemUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSystemUserInput) => {
      const { data, error } = await supabase.from('system_user').insert(input).select().single();

      if (error) throw error;
      return data as SystemUser;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });

      // Atualizar o authStore com o novo system_user
      const store = useAuthStore.getState();
      if (data.auth_user_id === store.user?.id) {
        store.setSystemUser(data);
        useAuthStore.setState({ hasAnySystemUser: true });
      }
    },
  });
}

interface UpdateSystemUserInput {
  auth_user_id: string;
  name?: string;
  email?: string;
  is_superadmin?: boolean;
}

/** Atualiza um system_user */
export function useUpdateSystemUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ auth_user_id, ...updates }: UpdateSystemUserInput) => {
      const { data, error } = await supabase
        .from('system_user')
        .update(updates)
        .eq('auth_user_id', auth_user_id)
        .select()
        .single();

      if (error) throw error;
      return data as SystemUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

/** Deleta um system_user */
export function useDeleteSystemUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (authUserId: string) => {
      const { error } = await supabase.from('system_user').delete().eq('auth_user_id', authUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
