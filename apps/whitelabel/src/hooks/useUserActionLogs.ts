import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { UserActionLog, LogActionParams } from '../types/userActionLog';

/**
 * Hook para buscar logs de ações de usuários
 */
export function useUserActionLogs(filters?: {
  entity?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: ['user-action-logs', company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('user_action_logs')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (filters?.entity) {
        query = query.eq('entity', filters.entity);
      }

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(100);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar logs:', error);
        throw error;
      }

      return data as unknown as UserActionLog[];
    },
    enabled: !!company?.id,
  });
}

/**
 * Hook para registrar ação do usuário
 */
export function useLogUserAction() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async (params: LogActionParams) => {
      if (!company?.id) {
        console.error('Erro ao registrar log: empresa não definida');
        return null;
      }

      const { data, error } = await supabase.rpc('log_user_action', {
        p_company_id: company.id,
        p_action: params.action,
        p_entity: params.entity,
        p_entity_id: (params.entityId || null) as any,
        p_entity_name: (params.entityName || null) as any,
        p_old_data: (params.oldData || null) as any,
        p_new_data: (params.newData || null) as any,
      });

      if (error) {
        console.error('Erro ao registrar log:', error);
        return null;
      }

      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-action-logs'] });
    },
  });
}

/**
 * Função utilitária para registrar log de forma simplificada
 * Requer companyId explícito para multi-tenant determinístico
 */
export async function logUserAction(
  params: LogActionParams & { companyId: string }
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('log_user_action', {
      p_company_id: params.companyId,
      p_action: params.action,
      p_entity: params.entity,
      p_entity_id: (params.entityId || null) as any,
      p_entity_name: (params.entityName || null) as any,
      p_old_data: (params.oldData || null) as any,
      p_new_data: (params.newData || null) as any,
    });

    if (error) {
      console.error('Erro ao registrar log:', error);
      return null;
    }

    return data as string;
  } catch (err) {
    console.error('Erro ao registrar log:', err);
    return null;
  }
}

/**
 * Hook para buscar logs de uma entidade específica
 */
export function useEntityLogs(entity: string, entityId: string) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: ['entity-logs', entity, entityId],
    queryFn: async () => {
      if (!company?.id || !entityId) return [];

      const { data, error } = await supabase
        .from('user_action_logs')
        .select('*')
        .eq('company_id', company.id)
        .eq('entity', entity)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar logs da entidade:', error);
        throw error;
      }

      return data as unknown as UserActionLog[];
    },
    enabled: !!company?.id && !!entityId,
  });
}
