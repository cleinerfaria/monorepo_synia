import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useLogAction } from '@/hooks/useLogs';
import { buildLogDiff, buildLogSnapshot } from '@/lib/logging';
import { useAuthStore } from '@/stores/authStore';

export interface SystemUser {
  auth_user_id: string;
  is_superadmin: boolean;
  name: string;
  email: string;
  created_at: string;
}

export interface CreateSystemUserInput {
  email: string;
  password: string;
  name: string;
  is_superadmin: boolean;
}

export interface UpdateSystemUserInput {
  auth_user_id: string;
  name?: string;
  is_superadmin?: boolean;
}

const SYSTEM_USER_LOG_EXCLUDE_FIELDS = ['auth_user_id', 'created_at'];

/**
 * Hook para verificar se o usuário atual é um administrador multi-tenant
 * (system_user com is_superadmin = false)
 */
export function useIsMultitenantAdmin() {
  const { session } = useAuthStore();

  const query = useQuery({
    queryKey: ['is_multitenant_admin', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return false;

      const { data, error } = await supabase
        .from('system_user')
        .select('is_superadmin')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();

      const systemUser = data as any;

      if (error) {
        console.error('Error checking multi-tenant admin status:', error);
        return false;
      }

      // É um admin multi-tenant se existir em system_user e NÃO for superadmin
      return systemUser !== null && systemUser.is_superadmin === false;
    },
    enabled: !!session?.user?.id,
    staleTime: 1000 * 60 * 60, // 1 hora
    retry: 1,
  });

  return {
    ...query,
    isLoading: !!session?.user?.id && (query.isLoading || query.isFetching),
  };
}

/**
 * Hook para verificar se o usuário atual é um usuário do sistema (superadmin ou multi-tenant admin)
 */
export function useIsSystemUser() {
  const { session } = useAuthStore();

  const query = useQuery({
    queryKey: ['is_system_user', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return false;

      const { data, error } = await supabase
        .from('system_user')
        .select('auth_user_id')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking system user status:', error);
        return false;
      }

      return data !== null;
    },
    enabled: !!session?.user?.id,
    staleTime: 1000 * 60 * 60, // 1 hora
    retry: 1,
  });

  return {
    ...query,
    isLoading: !!session?.user?.id && (query.isLoading || query.isFetching),
  };
}

/**
 * Buscar todos os usuários do sistema
 * Apenas superadmins podem ver esta lista
 */
export function useSystemUsers() {
  return useQuery({
    queryKey: ['system_users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('system_user').select('*').order('name');

      if (error) throw error;
      return data as unknown as SystemUser[];
    },
  });
}

/**
 * Buscar um usuário do sistema por auth_user_id
 */
export function useSystemUser(authUserId: string | undefined) {
  return useQuery({
    queryKey: ['system_user', authUserId],
    queryFn: async () => {
      if (!authUserId) return null;

      const { data, error } = await supabase
        .from('system_user')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      if (error) throw error;
      return data as unknown as SystemUser;
    },
    enabled: !!authUserId,
  });
}

/**
 * Criar usuário do sistema via Edge Function
 */
export function useCreateSystemUser() {
  const queryClient = useQueryClient();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (input: CreateSystemUserInput) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Não autenticado');
      }

      const { data, error } = await supabase.functions.invoke('manage-system-user', {
        body: {
          action: 'create',
          email: input.email,
          password: input.password,
          name: input.name,
          is_superadmin: input.is_superadmin,
        },
      });

      if (error) {
        console.error('API Error:', error);
        throw new Error(error.message || 'Erro ao criar usuário do sistema');
      }

      if (!data?.user) {
        throw new Error(data?.details || data?.error || 'Erro ao criar usuário do sistema');
      }

      return { user: data.user as unknown as SystemUser, input };
    },
    onSuccess: ({ user }) => {
      queryClient.invalidateQueries({ queryKey: ['system_users'] });

      logAction.mutate({
        action: 'create',
        entity: 'system_user',
        entityId: user.auth_user_id,
        entityName: user.name,
        newData: buildLogSnapshot(user, {
          exclude: SYSTEM_USER_LOG_EXCLUDE_FIELDS,
        }),
      });
    },
  });
}

/**
 * Atualizar usuário do sistema via Edge Function
 */
export function useUpdateSystemUser() {
  const queryClient = useQueryClient();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (input: UpdateSystemUserInput) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Não autenticado');
      }

      // Buscar dados atuais para comparação no log
      const { data: currentData, error: fetchError } = await supabase
        .from('system_user')
        .select('*')
        .eq('auth_user_id', input.auth_user_id)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase.functions.invoke('manage-system-user', {
        body: {
          action: 'update',
          auth_user_id: input.auth_user_id,
          name: input.name,
          is_superadmin: input.is_superadmin,
        },
      });

      if (error) {
        console.error('API Error:', error);
        throw new Error(error.message || 'Erro ao atualizar usuário do sistema');
      }

      if (!data?.user) {
        throw new Error(data?.details || data?.error || 'Erro ao atualizar usuário do sistema');
      }

      return {
        user: data.user as unknown as SystemUser,
        previousData: currentData as unknown as SystemUser,
      };
    },
    onSuccess: ({ user, previousData }) => {
      queryClient.invalidateQueries({ queryKey: ['system_users'] });
      queryClient.invalidateQueries({ queryKey: ['system_user', user.auth_user_id] });

      const diff = buildLogDiff(previousData, user, {
        exclude: SYSTEM_USER_LOG_EXCLUDE_FIELDS,
      });

      if (diff.oldData || diff.newData) {
        logAction.mutate({
          action: 'update',
          entity: 'system_user',
          entityId: user.auth_user_id,
          entityName: user.name,
          oldData: diff.oldData,
          newData: diff.newData,
        });
      }
    },
  });
}

/**
 * Deletar usuário do sistema via Edge Function
 */
export function useDeleteSystemUser() {
  const queryClient = useQueryClient();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (authUserId: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Não autenticado');
      }

      // Buscar dados para log antes de deletar
      const { data: userData, error: fetchError } = await supabase
        .from('system_user')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase.functions.invoke('manage-system-user', {
        body: {
          action: 'delete',
          auth_user_id: authUserId,
        },
      });

      if (error) {
        console.error('API Error:', error);
        throw new Error(error.message || 'Erro ao remover usuário do sistema');
      }

      if (!data?.success) {
        throw new Error(data?.details || data?.error || 'Erro ao remover usuário do sistema');
      }

      return userData as unknown as SystemUser;
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['system_users'] });

      logAction.mutate({
        action: 'delete',
        entity: 'system_user',
        entityId: user.auth_user_id,
        entityName: user.name,
        oldData: buildLogSnapshot(user, {
          exclude: SYSTEM_USER_LOG_EXCLUDE_FIELDS,
        }),
      });
    },
  });
}
