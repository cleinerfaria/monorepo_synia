import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

// =====================================================
// TIPOS
// =====================================================

export interface SystemModule {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  active: boolean;
}

export interface ModulePermission {
  id: string;
  module_id: string;
  code: string;
  name: string;
  description: string | null;
  module?: SystemModule;
}

export interface AccessProfile {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description: string | null;
  is_admin: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccessProfileWithPermissions extends AccessProfile {
  permissions: ModulePermission[];
}

export interface CreateAccessProfileInput {
  company_id: string;
  code: string;
  name: string;
  description?: string;
  is_admin?: boolean;
  permission_ids?: string[];
}

export interface UpdateAccessProfileInput {
  id: string;
  name?: string;
  description?: string;
  is_admin?: boolean;
  active?: boolean;
  permission_ids?: string[];
}

export interface UserPermission {
  module_code: string;
  module_name: string;
  permission_code: string;
  permission_name: string;
}

const PERMISSIONS_TIMEOUT_MS = 30000; // Increased from 10s to 30s to account for connection pool delays

async function withTimeout<T>(promiseLike: PromiseLike<T>, timeoutMs: number, context: string) {
  const promise = Promise.resolve(promiseLike);
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${context} timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

// =====================================================
// HOOKS DE MÓDULOS DO SISTEMA
// =====================================================

// Buscar todos os módulos
export function useSystemModules() {
  return useQuery({
    queryKey: ['system_modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_module')
        .select('*, active:is_active')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as SystemModule[];
    },
  });
}

// Buscar permissões de todos os módulos
export function useModulePermissions() {
  return useQuery({
    queryKey: ['module_permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_permission')
        .select(
          `
          *,
          module:module_id (*)
        `
        )
        .order('module_id')
        .order('code');

      if (error) throw error;
      return data as ModulePermission[];
    },
  });
}

// =====================================================
// HOOKS DE PERFIS DE ACESSO
// =====================================================

// Buscar todos os perfis (sistema + empresa)
export function useAccessProfiles(companyId?: string) {
  return useQuery({
    queryKey: ['access_profiles', companyId],
    queryFn: async () => {
      let query = supabase.from('access_profile').select('*, active:is_active').order('name');

      // Filtra por empresa
      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AccessProfile[];
    },
  });
}

// Buscar perfil por ID com permissões
export function useAccessProfile(id: string | undefined) {
  return useQuery({
    queryKey: ['access_profile', id],
    queryFn: async () => {
      if (!id) return null;

      // Buscar perfil
      const { data: profile, error: profileError } = await supabase
        .from('access_profile')
        .select('*, active:is_active')
        .eq('id', id)
        .single();

      if (profileError) throw profileError;

      // Buscar permissões do perfil
      const { data: profilePermissions, error: permError } = await supabase
        .from('access_profile_permission')
        .select(
          `
          permission_id,
          permission:permission_id (
            id,
            module_id,
            code,
            name,
            description,
            module:module_id (*)
          )
        `
        )
        .eq('profile_id', id);

      if (permError) throw permError;

      const result: AccessProfileWithPermissions = {
        ...profile,
        permissions: profilePermissions.map((pp: any) => pp.permission),
      };

      return result;
    },
    enabled: !!id,
  });
}

// Criar perfil de acesso
export function useCreateAccessProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAccessProfileInput) => {
      const { permission_ids, ...profileData } = input;

      // Criar o perfil
      const { data: profile, error: profileError } = await supabase
        .from('access_profile')
        .insert({
          ...profileData,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Adicionar permissões
      if (permission_ids && permission_ids.length > 0) {
        const permissionInserts = permission_ids.map((permId) => ({
          profile_id: profile.id,
          permission_id: permId,
        }));

        const { error: permError } = await supabase
          .from('access_profile_permission')
          .insert(permissionInserts);

        if (permError) {
          // Tentar deletar o perfil criado
          await supabase.from('access_profile').delete().eq('id', profile.id);
          throw permError;
        }
      }

      return profile as AccessProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access_profiles'] });
    },
  });
}

// Atualizar perfil de acesso
export function useUpdateAccessProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateAccessProfileInput) => {
      const { id, permission_ids, ...updates } = input;
      const payload: Record<string, any> = { ...updates };
      if (payload.active !== undefined) {
        payload.is_active = payload.active;
        delete payload.active;
      }

      // Atualizar o perfil
      if (Object.keys(payload).length > 0) {
        const { error: profileError } = await supabase
          .from('access_profile')
          .update(payload)
          .eq('id', id);

        if (profileError) throw profileError;
      }

      // Atualizar permissões se fornecidas
      if (permission_ids !== undefined) {
        // Remover todas as permissões atuais
        const { error: deleteError } = await supabase
          .from('access_profile_permission')
          .delete()
          .eq('profile_id', id);

        if (deleteError) throw deleteError;

        // Adicionar novas permissões
        if (permission_ids.length > 0) {
          const permissionInserts = permission_ids.map((permId) => ({
            profile_id: id,
            permission_id: permId,
          }));

          const { error: insertError } = await supabase
            .from('access_profile_permission')
            .insert(permissionInserts);

          if (insertError) throw insertError;
        }
      }

      // Buscar perfil atualizado
      const { data, error } = await supabase
        .from('access_profile')
        .select('*, active:is_active')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as AccessProfile;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['access_profiles'] });
      queryClient.invalidateQueries({ queryKey: ['access_profile', data.id] });
    },
  });
}

// Deletar perfil de acesso
export function useDeleteAccessProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('access_profile').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access_profiles'] });
    },
  });
}

// =====================================================
// HOOKS DE PERMISSÕES DO USUÁRIO
// =====================================================

// Buscar permissões do usuário atual
export function useCurrentUserPermissions() {
  const { user, session, isLoading: isAuthLoading, isInitialized } = useAuthStore();

  return useQuery({
    queryKey: ['user_permissions', user?.id],
    // Only enable after auth is fully initialized to avoid blocking initial render
    enabled: isInitialized && !isAuthLoading && !!session?.user?.id,
    queryFn: async () => {
      if (!user) return [];

      try {
        const { data, error } = await withTimeout(
          supabase.rpc('get_user_permissions', {
            p_auth_user_id: user.id,
          }),
          PERMISSIONS_TIMEOUT_MS,
          'get_user_permissions'
        );

        if (error) throw error;
        return (data ?? []) as UserPermission[];
      } catch (error) {
        console.error('[useCurrentUserPermissions] failed to fetch permissions:', error);
        return [];
      }
    },
    retry: 1,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
}

// Verificar se usuário tem uma permissão específica
export function useHasPermission(moduleCode: string, permissionCode: string) {
  const { data: permissions = [], isLoading } = useCurrentUserPermissions();

  const hasPermission = permissions.some(
    (p) => p.module_code === moduleCode && p.permission_code === permissionCode
  );

  return { hasPermission, isLoading };
}

// =====================================================
// UTILITÁRIOS
// =====================================================

// Agrupar permissões por módulo
export function groupPermissionsByModule(permissions: ModulePermission[]) {
  const grouped: Record<string, { module: SystemModule; permissions: ModulePermission[] }> = {};

  permissions.forEach((perm) => {
    const moduleCode = perm.module?.code || 'unknown';

    if (!grouped[moduleCode]) {
      grouped[moduleCode] = {
        module: perm.module!,
        permissions: [],
      };
    }

    grouped[moduleCode].permissions.push(perm);
  });

  return Object.values(grouped).sort(
    (a, b) => (a.module.display_order || 0) - (b.module.display_order || 0)
  );
}
