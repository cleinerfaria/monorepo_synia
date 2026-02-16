import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useLogAction } from '@/hooks/useLogs';
import { buildLogDiff, buildLogSnapshot } from '@/lib/logging';
import type { BadgeVariant } from '@/components/ui';

export type UserRole = 'admin' | 'manager' | 'clinician' | 'stock' | 'finance' | 'viewer';

export interface AccessProfile {
  id: string;
  company_id: string | null;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_admin: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppUser {
  id: string;
  company_id: string;
  auth_user_id: string;
  name: string;
  email: string;
  role: UserRole;
  access_profile_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  company?: {
    id: string;
    name: string;
  };
  access_profile?: {
    id: string;
    code: string;
    name: string;
    is_admin: boolean;
  };
}

export interface CreateAppUserInput {
  company_id: string;
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  access_profile_id?: string;
}

export interface UpdateAppUserInput {
  id: string;
  name?: string;
  role?: UserRole;
  access_profile_id?: string;
  active?: boolean;
}

const APP_USER_LOG_EXCLUDE_FIELDS = [
  'id',
  'company_id',
  'auth_user_id',
  'created_at',
  'updated_at',
];

// Buscar todos os usuários (com empresa e perfil)
export function useAppUsers(companyId?: string) {
  return useQuery({
    queryKey: ['app_users', companyId],
    queryFn: async () => {
      let query = supabase
        .from('app_user')
        .select(
          `
          *,
          company:company_id (id, name),
          access_profile:access_profile_id (id, code, name, is_admin)
        `
        )
        .order('name');

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AppUser[];
    },
  });
}

// Buscar usuário por ID
export function useAppUser(id: string | undefined) {
  return useQuery({
    queryKey: ['app_user', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('app_user')
        .select(
          `
          *,
          company:company_id (id, name),
          access_profile:access_profile_id (id, code, name, is_admin)
        `
        )
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as AppUser;
    },
    enabled: !!id,
  });
}

// Criar usuário via Edge Function
export function useCreateAppUser() {
  const queryClient = useQueryClient();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (input: CreateAppUserInput) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Não autenticado');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'create',
            email: input.email,
            password: input.password,
            name: input.name,
            company_id: input.company_id,
            role: input.role || 'viewer',
            access_profile_id: input.access_profile_id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error('API Error:', result);
        throw new Error(result.details || result.error || 'Erro ao criar usuário');
      }

      return { user: result.user as AppUser, input };
    },
    onSuccess: ({ user }) => {
      queryClient.invalidateQueries({ queryKey: ['app_users'] });

      // Registrar log
      logAction.mutate({
        action: 'create',
        entity: 'user',
        entityId: user.id,
        entityName: user.name,
        newData: buildLogSnapshot(user, {
          exclude: APP_USER_LOG_EXCLUDE_FIELDS,
        }),
      });
    },
  });
}

// Atualizar usuário via Edge Function
export function useUpdateAppUser() {
  const queryClient = useQueryClient();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (input: UpdateAppUserInput) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Não autenticado');
      }

      // Buscar dados antigos para o log
      const { data: oldUser } = await supabase
        .from('app_user')
        .select('name, email, role, access_profile_id, active')
        .eq('id', input.id)
        .single();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'update',
            user_id: input.id,
            name: input.name,
            role: input.role,
            access_profile_id: input.access_profile_id,
            active: input.active,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao atualizar usuário');
      }

      return { user: result.user as AppUser, oldUser };
    },
    onSuccess: ({ user, oldUser }) => {
      queryClient.invalidateQueries({ queryKey: ['app_users'] });
      queryClient.invalidateQueries({ queryKey: ['app_user', user.id] });

      const { oldData, newData } = buildLogDiff(oldUser, user, {
        exclude: APP_USER_LOG_EXCLUDE_FIELDS,
      });

      // Registrar log
      logAction.mutate({
        action: 'update',
        entity: 'user',
        entityId: user.id,
        entityName: user.name,
        oldData,
        newData,
      });
    },
  });
}

// Desativar usuário
export function useDeactivateAppUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Não autenticado');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'update',
            user_id: id,
            active: false,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao desativar usuário');
      }

      return result.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app_users'] });
    },
  });
}

// Reativar usuário
export function useReactivateAppUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Não autenticado');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'update',
            user_id: id,
            active: true,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao reativar usuário');
      }

      return result.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app_users'] });
    },
  });
}

// Resetar senha do usuário
export function useResetUserPassword() {
  return useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Não autenticado');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'reset-password',
            user_id: userId,
            new_password: newPassword,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao resetar senha');
      }

      return result;
    },
  });
}

// Deletar usuário
export function useDeleteAppUser() {
  const queryClient = useQueryClient();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (id: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Não autenticado');
      }

      // Buscar dados do usuário antes de excluir para o log
      const { data: userToDelete } = await supabase
        .from('app_user')
        .select('id, name, email, role')
        .eq('id', id)
        .single();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'delete',
            user_id: id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao excluir usuário');
      }

      return { result, userToDelete };
    },
    onSuccess: ({ userToDelete }) => {
      queryClient.invalidateQueries({ queryKey: ['app_users'] });

      // Registrar log
      if (userToDelete) {
        logAction.mutate({
          action: 'delete',
          entity: 'user',
          entityId: userToDelete.id,
          entityName: userToDelete.name,
          oldData: buildLogSnapshot(userToDelete, {
            exclude: APP_USER_LOG_EXCLUDE_FIELDS,
          }),
        });
      }
    },
  });
}

// Labels para roles (legado, mantido para compatibilidade)
export const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  clinician: 'Clínico',
  stock: 'Estoque',
  finance: 'Financeiro',
  viewer: 'Visualizador',
};

export const roleBadgeVariants: Record<UserRole, BadgeVariant> = {
  admin: 'gold',
  manager: 'purple',
  clinician: 'teal',
  stock: 'warning',
  finance: 'info',
  viewer: 'neutral',
};

export const roleColors: Record<UserRole, { bg: string; text: string }> = {
  admin: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
  manager: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
  },
  clinician: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  stock: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  finance: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-300',
  },
  viewer: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' },
};

// Vincular usuário autenticado atual a uma empresa
export interface LinkCurrentUserInput {
  company_id: string;
  name: string;
  role?: UserRole;
  access_profile_id?: string;
}

export function useLinkCurrentUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LinkCurrentUserInput) => {
      // Pega o usuário autenticado atual
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error('Usuário não autenticado');

      // Verifica se já existe um app_user para esse auth_user_id
      const { data: existing } = await supabase
        .from('app_user')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (existing) {
        // Atualiza o existente para a nova empresa
        const { data, error } = await supabase
          .from('app_user')
          .update({
            company_id: input.company_id,
            name: input.name,
            role: input.role || 'viewer',
            access_profile_id: input.access_profile_id,
            active: true,
          })
          .eq('auth_user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return data as AppUser;
      }

      // Cria novo registro em app_user
      const { data, error } = await supabase
        .from('app_user')
        .insert({
          company_id: input.company_id,
          auth_user_id: user.id,
          name: input.name,
          email: user.email!,
          role: input.role || 'viewer',
          access_profile_id: input.access_profile_id,
          active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AppUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app_users'] });
    },
  });
}
