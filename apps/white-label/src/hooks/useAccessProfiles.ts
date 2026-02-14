import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

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

export interface UpdateSystemModuleStatusInput {
  id: string;
  active: boolean;
}

function normalizeAccessProfile(profile: any): AccessProfile {
  return {
    id: profile.id,
    company_id: profile.company_id ?? null,
    code: profile.code,
    name: profile.name,
    description: profile.description ?? null,
    is_system: !!profile.is_system,
    is_admin: !!profile.is_admin,
    active: profile.active ?? true,
    created_at: profile.created_at ?? '',
    updated_at: profile.updated_at ?? '',
  };
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
        .select('*')
        .order('display_order');

      if (error) throw error;
      return data as SystemModule[];
    },
  });
}

// Atualizar status de um mÃ³dulo do sistema
export function useUpdateSystemModuleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateSystemModuleStatusInput) => {
      const { data, error } = await supabase
        .from('system_module')
        .update({ active: input.active })
        .eq('id', input.id)
        .select('*')
        .single();

      if (error) throw error;
      return data as SystemModule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system_modules'] });
      queryClient.invalidateQueries({ queryKey: ['module_permissions'] });
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
// HOOK DE TESTE - TEMPORÁRIO
// =====================================================

// Hook de teste para verificar se os dados existem sem RLS
export function useAccessProfilesTest() {
  return useQuery({
    queryKey: ['access_profiles_test'],
    queryFn: async () => {
      console.log('🧪 TESTE: Verificando se existem access_profiles na tabela...');

      // Usar service_role temporariamente para bypass RLS
      const { data, error, count } = await supabase
        .from('access_profile')
        .select('*', { count: 'exact' })
        .limit(10);

      if (error) {
        console.error('❌ TESTE: Erro ao buscar access_profiles:', error);
      } else {
        console.log('🧪 TESTE: Total de registros na tabela:', count);
        console.log('🧪 TESTE: Primeiros 10 registros:', data);
      }

      return { data, error, count };
    },
    staleTime: Infinity, // Só executa uma vez
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
      console.log('🔄 Buscando access_profiles para company_id:', companyId);

      try {
        if (companyId) {
          // Usar dois SELECTs separados e combinar os resultados
          console.log('🔍 Buscando perfis do sistema...');
          const systemResult = await supabase
            .from('access_profile')
            .select(
              'id, company_id, code, name, description, is_system, is_admin, active, created_at, updated_at'
            )
            .is('company_id', null);

          console.log('🔍 Resultado system profiles:', systemResult);

          console.log('🔍 Buscando perfis da empresa...');
          const companyResult = await supabase
            .from('access_profile')
            .select(
              'id, company_id, code, name, description, is_system, is_admin, active, created_at, updated_at'
            )
            .eq('company_id', companyId);

          console.log('🔍 Resultado company profiles:', companyResult);

          if (systemResult.error) {
            console.error('❌ Erro ao buscar system profiles:', systemResult.error);
            throw systemResult.error;
          }
          if (companyResult.error) {
            console.error('❌ Erro ao buscar company profiles:', companyResult.error);
            throw companyResult.error;
          }

          const allProfiles = [...(systemResult.data || []), ...(companyResult.data || [])].sort(
            (a, b) => {
              if (a.is_system !== b.is_system) return (b.is_system ? 1 : 0) - (a.is_system ? 1 : 0);
              return (a.name || '').localeCompare(b.name || '');
            }
          );

          console.log('✅ Access profiles retornados:', allProfiles.length, 'registros');
          console.log(
            '   System profiles:',
            systemResult.data?.length,
            'Company profiles:',
            companyResult.data?.length
          );
          console.log('   Perfis encontrados:', allProfiles);
          return allProfiles as AccessProfile[];
        } else {
          // Busca apenas perfis do sistema
          console.log('🔍 Buscando apenas perfis do sistema...');
          const result = await supabase
            .from('access_profile')
            .select(
              'id, company_id, code, name, description, is_system, is_admin, active, created_at, updated_at'
            )
            .is('company_id', null)
            .order('name');

          console.log('🔍 Resultado system only:', result);

          if (result.error) {
            console.error('❌ Erro ao buscar system profiles:', result.error);
            throw result.error;
          }

          console.log('✅ System profiles retornados:', result.data?.length || 0, 'registros');
          console.log('   Perfis encontrados:', result.data);
          return result.data as AccessProfile[];
        }
      } catch (error) {
        console.error('❌ Erro geral no useAccessProfiles:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hora
    refetchOnWindowFocus: false,
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
        .select('*')
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
        ...normalizeAccessProfile(profile),
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
          is_system: false,
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

      // Atualizar o perfil
      if (Object.keys(updates).length > 0) {
        const { error: profileError } = await supabase
          .from('access_profile')
          .update(updates)
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
        .select('*')
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
      const { error } = await supabase
        .from('access_profile')
        .delete()
        .eq('id', id)
        .eq('is_system', false); // Proteção extra

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
  return useQuery({
    queryKey: ['user_permissions'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return [];

      const { data, error } = await supabase.rpc('get_user_permissions', {
        p_user_auth_id: user.id,
      });

      if (error) throw error;
      return data as UserPermission[];
    },
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
