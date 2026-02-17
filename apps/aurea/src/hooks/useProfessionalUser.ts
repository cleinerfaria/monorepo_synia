import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

export interface ProfessionalUserLink {
  id: string;
  company_id: string;
  professional_id: string;
  user_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  app_user: {
    id: string;
    name: string;
    email: string;
    email: string;
    active: boolean;
    access_profile: {
      name: string;
    } | null;
  } | null;
}

export interface AvailableAppUser {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  email: string;
  active: boolean;
  access_profile: {
    name: string;
  } | null;
}

const QUERY_KEY = 'professional_user';

/**
 * Busca o vínculo professional_user para um profissional específico
 */
export function useProfessionalUser(professionalId: string | undefined) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, professionalId],
    queryFn: async () => {
      if (!professionalId || !company?.id) return null;

      // Primeiro, busca o vínculo professional_user
      const { data: linkData, error: linkError } = await supabase
        .from('professional_user')
        .select('*')
        .eq('company_id', company.id)
        .eq('professional_id', professionalId)
        .maybeSingle();

      if (linkError) throw linkError;
      if (!linkData) return null;

      // Em seguida, busca o app_user pelo auth_user_id (que é o user_id do link)
      const { data: appUser, error: userError } = await supabase
        .from('app_user')
        .select('id, name, email, active, access_profile(name)')
        .eq('auth_user_id', linkData.user_id)
        .maybeSingle();

      if (userError) throw userError;

      // Combina os dados
      return {
        ...linkData,
        app_user: appUser,
      } as ProfessionalUserLink;
    },
    enabled: !!professionalId && !!company?.id,
  });
}

/**
 * Lista app_users da empresa que NÃO estão vinculados a nenhum profissional
 */
export function useAvailableAppUsers() {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: ['available_app_users', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      // Buscar todos os user_ids já vinculados
      const { data: linkedUsers, error: linkedError } = await supabase
        .from('professional_user')
        .select('user_id')
        .eq('company_id', company.id);

      if (linkedError) throw linkedError;

      const linkedUserIds = (linkedUsers || []).map((lu) => lu.user_id);

      // Buscar app_users ativos que não estão vinculados
      let query = supabase
        .from('app_user')
        .select('id, auth_user_id, name, email, active, access_profile(name)')
        .eq('company_id', company.id)
        .eq('active', true)
        .order('name');

      if (linkedUserIds.length > 0) {
        query = query.not('auth_user_id', 'in', `(${linkedUserIds.join(',')})`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AvailableAppUser[];
    },
    enabled: !!company?.id,
  });
}

/**
 * Vincular um profissional a um app_user existente
 */
export function useLinkProfessionalUser() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async ({ professionalId, userId }: { professionalId: string; userId: string }) => {
      if (!company?.id) throw new Error('Empresa nao identificada');

      const { data, error } = await supabase
        .from('professional_user')
        .insert({
          company_id: company.id,
          professional_id: professionalId,
          user_id: userId,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.professionalId] });
      queryClient.invalidateQueries({ queryKey: ['available_app_users'] });
      toast.success('Profissional vinculado ao usuário com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao vincular profissional ao usuário:', error);
      toast.error('Erro ao vincular profissional ao usuário');
    },
  });
}

/**
 * Desvincular um profissional de um app_user
 */
export function useUnlinkProfessionalUser() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async ({ professionalId }: { professionalId: string }) => {
      if (!company?.id) throw new Error('Empresa nao identificada');

      const { error } = await supabase
        .from('professional_user')
        .delete()
        .eq('company_id', company.id)
        .eq('professional_id', professionalId);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.professionalId] });
      queryClient.invalidateQueries({ queryKey: ['available_app_users'] });
      toast.success('Vinculo removido com sucesso!');
    },
    onError: (error) => {
      console.error('Error unlinking professional from user:', error);
      toast.error('Erro ao remover vinculo');
    },
  });
}

/**
 * Criar novo usuário (via Edge Function) e vincular ao profissional
 */
export function useCreateAndLinkProfessionalUser() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      professionalId,
      email,
      password,
      name,
    }: {
      professionalId: string;
      email: string;
      password: string;
      name: string;
    }) => {
      if (!company?.id) throw new Error('Empresa nao identificada');

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error('Nao autenticado');

      // Buscar perfil shift_only da empresa
      const { data: shiftProfile } = await supabase
        .from('access_profile')
        .select('id')
        .eq('company_id', company.id)
        .eq('code', 'shift_only')
        .single();

      if (!shiftProfile) throw new Error('Perfil de plantão não encontrado para esta empresa');

      // 1. Criar app_user via Edge Function
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
            email,
            password,
            name,
            company_id: company.id,
            access_profile_id: shiftProfile.id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.details || result.error || 'Erro ao criar usuário');
      }

      const authUserId = result.auth_user_id as string;

      // 2. Vincular na tabela professional_user
      const { data: link, error: linkError } = await supabase
        .from('professional_user')
        .insert({
          company_id: company.id,
          professional_id: professionalId,
          user_id: authUserId,
          is_active: true,
        })
        .select()
        .single();

      if (linkError) throw linkError;

      return link;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.professionalId] });
      queryClient.invalidateQueries({ queryKey: ['available_app_users'] });
      queryClient.invalidateQueries({ queryKey: ['app_users'] });
      toast.success('Usuário criado e vinculado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating and linking user:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar e vincular usuário');
    },
  });
}
