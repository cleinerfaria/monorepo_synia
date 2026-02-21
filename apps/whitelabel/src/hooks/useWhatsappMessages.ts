// ... imports
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getValidAccessToken } from '@/lib/authToken';
import { downloadMessage, sendTextMessage } from '@/services/uazapi/messages';
import { WhatsappInstance } from '@/hooks/useWhatsappInstances';

// ... interfaces check if used
// Export interfaces are used in components probably. Keep them.

// ... Remove unused helpers
// resolveChatExternalId, etc. check if used in other exports? No, they are local.

// The hook file content:

export interface WhatsappContact {
  id: string;
  company_id: string;
  external_jid: string | null;
  external_lid: string | null;
  phone_number: string | null;
  display_name: string | null;
  profile_pic_url: string | null;
  is_group: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsappConversation {
  id: string;
  company_id: string;
  instance_id: string;
  contact_id: string;
  wa_chatid: string | null;
  external_id: string | null;
  last_message_at: string | null;
  last_message_preview?: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
  contact?: WhatsappContact;
  instance?: WhatsappInstance;
}

export interface WhatsappMessage {
  id: string;
  company_id: string;
  conversation_id: string;
  instance_id: string;
  contact_id: string | null;
  external_id: string;
  from_me: boolean;
  message_type: string | null;
  text_content: string | null;
  sent_at: string | null;
  status: string | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  media?: WhatsappMedia[];
}

export interface WhatsappMedia {
  id: string;
  company_id: string;
  message_id: string;
  media_type: string | null;
  mime_type: string | null;
  file_name: string | null;
  size_bytes: number | null;
  url: string | null;
  storage_path: string | null;
  checksum: string | null;
  created_at: string;
  updated_at: string;
}

export function useWhatsappConversations(companyId?: string, instanceId?: string) {
  return useQuery({
    queryKey: ['whatsapp_conversations', companyId, instanceId],
    queryFn: async () => {
      if (!companyId) return [];

      let query = supabase
        .from('whatsapp_conversation')
        .select(
          `
          *,
          contact:contact_id (*),
          instance:instance_id (*)
        `
        )
        .eq('company_id', companyId)
        .order('last_message_at', { ascending: false });

      if (instanceId) {
        query = query.eq('instance_id', instanceId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as WhatsappConversation[];
    },
    enabled: !!companyId,
  });
}

export function useWhatsappMessages(conversationId?: string) {
  return useQuery({
    queryKey: ['whatsapp_messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('whatsapp_message')
        .select('*, media:whatsapp_media(*)')
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: true });

      if (error) throw error;
      return data as unknown as WhatsappMessage[];
    },
    enabled: !!conversationId,
  });
}

export function useSyncWhatsappConversations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      instance,
      limit = 50,
      offset = 0,
    }: {
      instance: WhatsappInstance;
      limit?: number;
      offset?: number;
    }) => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        throw new Error('Sessao expirada. Faca login novamente.');
      }

      const { data, error } = await supabase.functions.invoke('sync-conversations', {
        body: {
          instanceId: instance.id,
          limit,
          offset,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        console.error('Sync Conversations Error:', error);
        const response = (error as any)?.context?.response;
        if (response) {
          let message = 'Erro ao sincronizar conversas';
          try {
            const detail = await response.clone().json();
            message = detail?.error || detail?.details || message;
          } catch {
            try {
              const text = await response.clone().text();
              if (text) message = text;
            } catch {
              // noop
            }
          }
          throw new Error(message);
        }
        throw error;
      }

      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['whatsapp_conversations', variables.instance.company_id],
      });
    },
  });
}

export function useSyncWhatsappMessages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      instance,
      conversation,
      limit = 50,
      offset = 0,
    }: {
      instance: WhatsappInstance;
      conversation: WhatsappConversation;
      limit?: number;
      offset?: number;
    }) => {
      const chatId = conversation.wa_chatid || conversation.external_id;
      if (!chatId) {
        throw new Error('Chat ID nao encontrado para a conversa');
      }

      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        throw new Error('Sessao expirada. Faca login novamente.');
      }

      const { data, error } = await supabase.functions.invoke('sync-messages', {
        body: {
          instanceId: instance.id,
          conversationId: conversation.id,
          chatId,
          limit,
          offset,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        console.error('Sync Messages Error:', error);
        const response = (error as any)?.context?.response;
        if (response) {
          let message = 'Erro ao sincronizar mensagens';
          try {
            const detail = await response.clone().json();
            message = detail?.error || detail?.details || message;
          } catch {
            try {
              const text = await response.clone().text();
              if (text) message = text;
            } catch {
              // noop
            }
          }
          throw new Error(message);
        }
        throw error;
      }

      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_messages', variables.conversation.id] });
      queryClient.invalidateQueries({
        queryKey: ['whatsapp_conversations', variables.instance.company_id],
      });
    },
  });
}

export function useDownloadWhatsappMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      instance,
      message,
    }: {
      instance: WhatsappInstance;
      message: WhatsappMessage;
    }) => {
      const response = await downloadMessage(instance.id, {
        id: message.external_id,
        return_link: true,
      });

      if (!response.fileURL) {
        throw new Error('URL de midia nao retornada');
      }

      const { error } = await supabase.from('whatsapp_media').upsert(
        {
          company_id: instance.company_id,
          message_id: message.id,
          media_type: message.message_type,
          mime_type: response.mimetype || null,
          url: response.fileURL,
        },
        { onConflict: 'company_id,message_id' }
      );

      if (error) throw error;
      return response;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['whatsapp_messages', variables.message.conversation_id],
      });
    },
  });
}

export function useSendWhatsappMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      instance,
      conversation,
      text,
    }: {
      instance: WhatsappInstance;
      conversation: WhatsappConversation;
      text: string;
    }) => {
      const number = conversation.wa_chatid || conversation.external_id;
      if (!number) {
        throw new Error('Chat ID nao encontrado para envio');
      }

      const trimmed = text.trim();
      if (!trimmed) {
        throw new Error('Mensagem vazia');
      }

      const response = await sendTextMessage(instance.id, {
        number,
        text: trimmed,
      });

      // Refresh latest messages after send.
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        throw new Error('Sessao expirada. Faca login novamente.');
      }

      await supabase.functions.invoke('sync-messages', {
        body: {
          instanceId: instance.id,
          conversationId: conversation.id,
          chatId: number,
          limit: 50,
          offset: 0,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['whatsapp_messages', variables.conversation.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['whatsapp_conversations', variables.instance.company_id],
      });
    },
  });
}
