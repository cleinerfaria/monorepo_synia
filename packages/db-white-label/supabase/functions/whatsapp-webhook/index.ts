import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type WebhookPayload = {
  type?: string;
  instance?: string;
  data?: Record<string, unknown>;
};

function normalizeTimestampSeconds(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return value > 1_000_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
}

function toIsoTimestampFromSeconds(seconds: number | null) {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

function resolveMessageArray(data?: Record<string, unknown>) {
  if (!data) return [];

  if (Array.isArray(data.messages)) {
    return data.messages as Record<string, unknown>[];
  }

  if (Array.isArray(data.message)) {
    return data.message as Record<string, unknown>[];
  }

  if (data.message && typeof data.message === 'object') {
    return [data.message as Record<string, unknown>];
  }

  if (data.id && data.messageid) {
    return [data as Record<string, unknown>];
  }

  return [];
}

function mapMessageType(message: Record<string, unknown>) {
  const rawType =
    (typeof message.messageType === 'string' && message.messageType) ||
    (typeof message.type === 'string' && message.type) ||
    (typeof message.msgtype === 'string' && message.msgtype) ||
    '';

  const type = rawType.toLowerCase();

  if (!type && (message.text || message.content)) return 'text';
  if (['ptt', 'voice', 'audiomessage'].includes(type)) return 'audio';
  if (['photo', 'imagemessage'].includes(type)) return 'image';
  if (['file', 'documentmessage'].includes(type)) return 'document';
  if (['extendedtextmessage', 'conversation'].includes(type)) return 'text';

  if (
    [
      'text',
      'image',
      'audio',
      'video',
      'document',
      'sticker',
      'location',
      'contact',
      'reaction',
    ].includes(type)
  ) {
    return type;
  }

  return 'unknown';
}

function mapMessageText(message: Record<string, unknown>) {
  if (typeof message.text === 'string') return message.text;
  if (typeof message.content === 'string') return message.content;
  return null;
}

function mapMessageStatus(status: unknown) {
  if (typeof status !== 'string') return null;
  const value = status.toLowerCase();
  if (['sent', 'delivered', 'read', 'failed'].includes(value)) return value;
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as WebhookPayload;
    const providerInstanceId = payload.instance;

    if (!providerInstanceId) {
      return new Response(JSON.stringify({ error: 'Missing instance' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instance')
      .select('id, company_id')
      .eq('provider_instance_id', providerInstanceId)
      .maybeSingle();

    if (instanceError || !instance) {
      return new Response(JSON.stringify({ error: 'Instance not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messages = resolveMessageArray(payload.data);

    for (const message of messages) {
      const chatId =
        (typeof message.chatid === 'string' && message.chatid) ||
        (typeof message.jid === 'string' && message.jid) ||
        null;

      if (!chatId) continue;

      const sentTs =
        normalizeTimestampSeconds(message.messageTimestamp) || Math.floor(Date.now() / 1000);
      const sentAt = toIsoTimestampFromSeconds(sentTs);
      const externalId =
        (typeof message.id === 'string' && message.id) ||
        (typeof message.messageid === 'string' && message.messageid) ||
        `${chatId}-${sentTs}`;

      const phone = chatId.includes('@') ? chatId.split('@')[0] : chatId;
      const displayName =
        (typeof message.senderName === 'string' && message.senderName) || phone || 'Contato';

      const contactPayload: Record<string, unknown> = {
        company_id: instance.company_id,
        phone_number: phone,
        display_name: displayName,
        profile_pic_url: null,
      };

      if (chatId.includes('@lid')) {
        contactPayload.external_lid = chatId;
      } else {
        contactPayload.external_jid = chatId;
      }

      const conflictKey = chatId.includes('@lid')
        ? 'company_id,external_lid'
        : 'company_id,external_jid';

      const { data: contact, error: contactError } = await supabase
        .from('whatsapp_contact')
        .upsert(contactPayload, { onConflict: conflictKey })
        .select('id')
        .single();

      if (contactError || !contact?.id) {
        console.error('Failed to upsert contact', contactError);
        continue;
      }

      const { data: conversation, error: conversationError } = await supabase
        .from('whatsapp_conversation')
        .upsert(
          {
            company_id: instance.company_id,
            instance_id: instance.id,
            contact_id: contact.id,
            wa_chatid: chatId,
            external_id: chatId,
            last_message_at: sentAt,
            last_message_preview: mapMessageText(message) || mapMessageType(message),
            unread_count: 0,
          },
          { onConflict: 'company_id,instance_id,contact_id' }
        )
        .select('id')
        .single();

      if (conversationError || !conversation?.id) {
        console.error('Failed to upsert conversation', conversationError);
        continue;
      }

      const { data: storedMessage, error: messageError } = await supabase
        .from('whatsapp_message')
        .upsert(
          {
            company_id: instance.company_id,
            conversation_id: conversation.id,
            instance_id: instance.id,
            contact_id: contact.id,
            external_id: externalId,
            from_me: !!message.fromMe,
            message_type: mapMessageType(message),
            text_content: mapMessageText(message),
            sent_ts: sentTs,
            sent_at: sentAt,
            status: mapMessageStatus(message.status),
            raw_payload: message,
          },
          { onConflict: 'company_id,instance_id,external_id' }
        )
        .select('id')
        .single();

      if (messageError) {
        console.error('Failed to upsert message', messageError);
        continue;
      }

      if (typeof message.fileURL === 'string' && message.fileURL && storedMessage?.id) {
        const { error: mediaError } = await supabase.from('whatsapp_media').upsert(
          {
            company_id: instance.company_id,
            message_id: storedMessage.id,
            media_type: mapMessageType(message),
            mime_type: null,
            url: message.fileURL,
          },
          { onConflict: 'company_id,message_id' }
        );

        if (mediaError) {
          console.error('Failed to upsert media', mediaError);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
