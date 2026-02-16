import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { UserActionLog, LogActionParams } from '@/types/logs';
import { format } from 'date-fns';

// Hook para registrar logs de ações
export function useLogAction() {
  const { user, company } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: LogActionParams) => {
      if (!user || !company) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await supabase.rpc('log_user_action', {
        p_company_id: company.id,
        p_action: params.action,
        p_entity: params.entity,
        p_entity_id: params.entityId || null,
        p_entity_name: params.entityName || null,
        p_old_data: params.oldData || null,
        p_new_data: params.newData || null,
      });

      if (error) {
        console.error('Erro ao registrar log:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidar queries de logs se existirem
      queryClient.invalidateQueries({ queryKey: ['user_action_logs'] });
    },
    // Não mostrar erro se falhar o log (não atrapalhar UX)
    onError: (error) => {
      console.error('Falha ao registrar log de ação:', error);
    },
  });
}

// Hook para buscar logs
export function useUserActionLogs(filters?: {
  entity?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: ['user_action_logs', filters],
    queryFn: async () => {
      if (!company) throw new Error('Empresa não encontrada');

      let query = supabase
        .from('user_action_logs')
        .select(
          `
          *,
          app_user(
            name,
            email
          )
        `
        )
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (filters?.entity) {
        query = query.eq('entity', filters.entity);
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
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as UserActionLog[];
    },
    enabled: !!company,
  });
}

// Hook para contar logs por período
export function useUserActionLogsStats(days: number = 30) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: ['user_action_logs_stats', days],
    queryFn: async () => {
      if (!company) throw new Error('Empresa não encontrada');

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('user_action_logs')
        .select('action, entity, created_at')
        .eq('company_id', company.id)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      // Agregar dados
      const stats = {
        total: data.length,
        byAction: {} as Record<string, number>,
        byEntity: {} as Record<string, number>,
        byDay: {} as Record<string, number>,
      };

      data.forEach((log) => {
        // Por ação
        stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;

        // Por entidade
        stats.byEntity[log.entity] = (stats.byEntity[log.entity] || 0) + 1;

        // Por dia
        const day = format(new Date(log.created_at), 'yyyy-MM-dd');
        stats.byDay[day] = (stats.byDay[day] || 0) + 1;
      });

      return stats;
    },
    enabled: !!company,
  });
}
