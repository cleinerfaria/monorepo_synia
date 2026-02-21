import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { WhatsappConversation, WhatsappMessage } from '@/hooks/useWhatsappMessages';
import { WhatsappInstance } from '@/hooks/useWhatsappInstances';

export type WhatsappSessionStatus = 'pending' | 'evaluated' | 'ignored';
export type WhatsappSessionMode = 'automatic' | 'manual';

export interface WhatsappSession {
  id: string;
  company_id: string;
  conversation_id: string;
  instance_id: string;
  operator_user_id: string | null;
  start_message_id: string | null;
  end_message_id: string | null;
  start_at: string | null;
  end_at: string | null;
  status: WhatsappSessionStatus;
  created_by: string | null;
  created_mode: WhatsappSessionMode;
  created_at: string;
  updated_at: string;
  conversation?: WhatsappConversation;
  instance?: WhatsappInstance;
}

export interface UpdateWhatsappSessionInput {
  id: string;
  start_message_id?: string | null;
  end_message_id?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  status?: WhatsappSessionStatus;
}

export interface CreateSessionEvaluationInput {
  company_id: string;
  session_id: string;
  evaluation_id: string;
}

export function useWhatsappSessions(companyId?: string) {
  return useQuery({
    queryKey: ['whatsapp_sessions', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('whatsapp_session')
        .select(
          `
          *,
          conversation:conversation_id (
            *,
            contact:contact_id (*)
          ),
          instance:instance_id (*)
        `
        )
        .eq('company_id', companyId)
        .order('start_at', { ascending: false });

      if (error) throw error;
      return data as unknown as WhatsappSession[];
    },
    enabled: !!companyId,
  });
}

export function useUpdateWhatsappSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateWhatsappSessionInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from('whatsapp_session')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as WhatsappSession;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_sessions', data.company_id] });
    },
  });
}

export function useCreateSessionEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSessionEvaluationInput) => {
      const { data, error } = await supabase
        .from('whatsapp_session_evaluation')
        .insert({
          company_id: input.company_id,
          session_id: input.session_id,
          evaluation_id: input.evaluation_id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_sessions', data.company_id] });
    },
  });
}

export function resolveSessionWindow(messages: WhatsappMessage[], session: WhatsappSession) {
  const startIndex = messages.findIndex((m) => m.id === session.start_message_id);
  const endIndex = messages.findIndex((m) => m.id === session.end_message_id);

  if (startIndex === -1 || endIndex === -1) return messages;

  const from = Math.min(startIndex, endIndex);
  const to = Math.max(startIndex, endIndex);

  return messages.slice(from, to + 1);
}
