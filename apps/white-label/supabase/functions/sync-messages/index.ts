import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function resolveInstanceAccessToken(instance: any): string | null {
  const nested = instance?.whatsapp_instance_secret;
  if (Array.isArray(nested)) {
    return nested[0]?.access_token || null;
  }
  if (nested && typeof nested === 'object') {
    return nested.access_token || null;
  }
  if (typeof instance?.access_token === 'string' && instance.access_token) {
    return instance.access_token;
  }
  return null;
}

async function resolveInstanceAccessTokenFromDb(
  supabaseAdmin: any,
  instance: any
): Promise<string | null> {
  const inlineToken = resolveInstanceAccessToken(instance);
  if (inlineToken) return inlineToken;

  const { data: secret } = await supabaseAdmin
    .from('whatsapp_instance_secret')
    .select('access_token')
    .eq('instance_id', instance.id)
    .maybeSingle();

  if (typeof secret?.access_token === 'string' && secret.access_token) {
    return secret.access_token;
  }

  if (typeof instance?.whatsapp_instance_secret === 'string' && instance.whatsapp_instance_secret) {
    return instance.whatsapp_instance_secret;
  }

  return null;
}

async function resolveInstanceAccessTokenFromProvider(
  supabaseAdmin: any,
  instance: any
): Promise<string | null> {
  const uazapiUrl = Deno.env.get('UAZAPI_URL');
  const adminToken = Deno.env.get('UAZAPI_ADMINTOKEN');
  if (!uazapiUrl || !adminToken || !instance?.provider_instance_id) return null;

  const response = await fetch(`${uazapiUrl.replace(/\/$/, '')}/instance/all`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      admintoken: adminToken,
    },
  });

  if (!response.ok) return null;

  const data = await response.json();
  const instances = Array.isArray(data) ? data : data?.instances;
  if (!Array.isArray(instances)) return null;

  const matched = instances.find((item: any) => item?.id === instance.provider_instance_id);
  const token = matched?.token;
  if (typeof token !== 'string' || !token) return null;

  await supabaseAdmin.from('whatsapp_instance_secret').upsert(
    {
      instance_id: instance.id,
      company_id: instance.company_id,
      provider: 'uazapi',
      access_token: token,
    },
    { onConflict: 'instance_id' }
  );

  return token;
}

function normalizeTimestampSeconds(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return value > 1_000_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
}

function toIsoTimestampFromSeconds(seconds: number | null) {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verify Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: appUser } = await supabaseAdmin
      .from('app_user')
      .select('company_id')
      .eq('auth_user_id', user.id)
      .eq('active', true)
      .maybeSingle();

    const { data: systemUser } = await supabaseAdmin
      .from('system_user')
      .select('is_superadmin')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    const isSuperadmin = !!systemUser?.is_superadmin;
    const requesterCompanyId = appUser?.company_id || null;

    if (!requesterCompanyId && !isSuperadmin) {
      return new Response(JSON.stringify({ error: 'User not found or inactive' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse Request
    const { instanceId, conversationId, chatId, limit = 50, offset = 0 } = await req.json();

    if (!instanceId || !conversationId || !chatId) {
      return new Response(
        JSON.stringify({ error: 'instanceId, conversationId, and chatId are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Get Instance Token AND Company ID (Important for RLS/Tenancy)
    // Use instanceId to get company_id
    const { data: instance, error: instanceError } = await supabaseAdmin
      .from('whatsapp_instance')
      .select('*, whatsapp_instance_secret(access_token)')
      .eq('id', instanceId)
      .single();

    if (instanceError || !instance) {
      return new Response(JSON.stringify({ error: 'Instance not found', details: instanceError }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isSuperadmin && requesterCompanyId !== instance.company_id) {
      return new Response(JSON.stringify({ error: 'Instance does not belong to your company' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken =
      (await resolveInstanceAccessTokenFromDb(supabaseAdmin, instance)) ||
      (await resolveInstanceAccessTokenFromProvider(supabaseAdmin, instance));
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Instance token not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Fetch Messages from Uazapi
    const uazapiUrl = Deno.env.get('UAZAPI_URL');
    if (!uazapiUrl) {
      return new Response(JSON.stringify({ error: 'UAZAPI_URL not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetUrl = `${uazapiUrl.replace(/\/$/, '')}/message/find`;
    const uazapiResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        token: accessToken,
      },
      body: JSON.stringify({
        chatid: chatId,
        limit,
        offset,
      }),
    });

    if (!uazapiResponse.ok) {
      const errorText = await uazapiResponse.text();
      return new Response(JSON.stringify({ error: 'Uazapi Error', details: errorText }), {
        status: uazapiResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const responseData = await uazapiResponse.json();
    const messages = responseData.messages || [];

    if (messages.length === 0) {
      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Helpers
    const resolveMessageExternalId = (m: any) =>
      m.id || m.messageid || `${m.chatid || 'chat'}-${m.messageTimestamp || Date.now()}`;

    // Simplistic Mapping (Should match existing logic roughly)
    const mapMessageType = (m: any) => {
      const rawType = m.messageType || m.type || m.msgtype || '';
      const type = rawType.toLowerCase();
      if (!type && (m.text || m.content)) return 'text';
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
    };

    const mapMessageText = (m: any) => {
      if (typeof m.text === 'string') return m.text;
      if (typeof m.content === 'string') return m.content;
      return null;
    };

    const mapMessageStatus = (status?: string) => {
      if (!status) return null;
      const value = status.toLowerCase();
      if (['sent', 'delivered', 'read', 'failed'].includes(value)) return value;
      return null;
    };

    // Conversation info needed for contact_id?
    // We received conversationId.
    // We need contact_id to fill whatsapp_message.contact_id.
    const { data: conversation } = await supabaseAdmin
      .from('whatsapp_conversation')
      .select('contact_id')
      .eq('id', conversationId)
      .single();

    const contactId = conversation?.contact_id;

    // 6. Sync Messages
    const messagePayloads = messages.map((message: any) => {
      const sentTs =
        normalizeTimestampSeconds(message.messageTimestamp) || Math.floor(Date.now() / 1000);
      return {
        company_id: instance.company_id,
        conversation_id: conversationId,
        instance_id: instance.id,
        contact_id: contactId, // Important
        external_id: resolveMessageExternalId(message),
        from_me: message.fromMe || false,
        message_type: mapMessageType(message),
        text_content: mapMessageText(message),
        sent_ts: sentTs,
        sent_at: toIsoTimestampFromSeconds(sentTs),
        status: mapMessageStatus(message.status),
        raw_payload: message,
      };
    });

    const { data: storedMessages, error: msgError } = await supabaseAdmin
      .from('whatsapp_message')
      .upsert(messagePayloads, {
        onConflict: 'company_id,instance_id,external_id',
        ignoreDuplicates: false,
      })
      .select('id, external_id');

    if (msgError) {
      console.error('Message Upsert Error:', msgError);
      return new Response(
        JSON.stringify({ error: 'Database Error (Messages)', details: msgError }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 7. Sync Media
    // Need to map external_id back to internal id
    const messageMap = new Map(storedMessages?.map((m: any) => [m.external_id, m.id]));

    const mediaPayloads = messages
      .map((message: any) => {
        const externalId = resolveMessageExternalId(message);
        const messageId = messageMap.get(externalId);

        // Only if it has fileURL
        if (!messageId || !message.fileURL) return null;

        return {
          company_id: instance.company_id,
          message_id: messageId,
          media_type: message.messageType || null,
          mime_type: null, // Uazapi find doesn't always return mimetype here
          url: message.fileURL,
        };
      })
      .filter(Boolean);

    if (mediaPayloads.length > 0) {
      const { error: mediaError } = await supabaseAdmin
        .from('whatsapp_media')
        .upsert(mediaPayloads, {
          onConflict: 'company_id,message_id',
        });

      if (mediaError) {
        console.error('Media Upsert Error:', mediaError);
        // Non-critical, continue
      }
    }

    // 8. Update Last Message in Conversation
    if (messagePayloads.length > 0) {
      const latest = messagePayloads
        .map((m: any) => m.sent_at)
        .filter(Boolean)
        .sort()
        .pop();

      const latestText = messagePayloads
        .filter((m: any) => m.sent_at)
        .sort((a: any, b: any) => (a.sent_at || '').localeCompare(b.sent_at || ''))
        .pop();

      if (latest) {
        await supabaseAdmin
          .from('whatsapp_conversation')
          .update({
            last_message_at: latest,
            last_message_preview: latestText?.text_content || latestText?.message_type || null,
          })
          .eq('id', conversationId);
      }
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
