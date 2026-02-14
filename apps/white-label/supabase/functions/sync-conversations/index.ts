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

function toIsoTimestamp(value: unknown) {
  const seconds = normalizeTimestampSeconds(value);
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
    const { instanceId, limit = 50, offset = 0 } = await req.json();

    if (!instanceId) {
      return new Response(JSON.stringify({ error: 'instanceId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Get Instance Token
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

    // 4. Fetch Chats from Uazapi
    const uazapiUrl = Deno.env.get('UAZAPI_URL');
    if (!uazapiUrl) {
      return new Response(JSON.stringify({ error: 'UAZAPI_URL not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetUrl = `${uazapiUrl.replace(/\/$/, '')}/chat/find`;
    const uazapiResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        token: accessToken,
      },
      body: JSON.stringify({
        sort: '-wa_lastMsgTimestamp',
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
    const chats = responseData.chats || [];

    if (chats.length === 0) {
      return new Response(
        JSON.stringify({
          chats: 0,
          pagination: responseData.pagination,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 5. Helper Functions
    const resolveChatExternalId = (c: any) =>
      c.wa_chatid || c.jid || c.chatId || c.id || c.remoteJid || null;
    const resolveChatDisplayName = (c: any) =>
      c.wa_contactName ||
      c.wa_name ||
      c.name ||
      c.pushname ||
      c.formattedName ||
      c.notify ||
      c.displayName ||
      null;

    // 6. Sync Contacts First
    const contactPayloads = chats
      .map((chat: any) => {
        return {
          company_id: instance.company_id,
          external_jid: resolveChatExternalId(chat),
          phone_number: chat.phone || null,
          display_name: resolveChatDisplayName(chat),
          profile_pic_url: chat.image || chat.imagePreview || null,
          is_group: chat.wa_isGroup || false,
          is_archived: chat.wa_archived || false,
        };
      })
      .filter((c: any) => c.external_jid);

    // Upsert Contacts and build map (manual strategy)
    const contactMap = new Map<string, string>();

    for (const payload of contactPayloads) {
      const externalJid = payload.external_jid;
      if (!externalJid) continue;

      const { data: existing, error: findError } = await supabaseAdmin
        .from('whatsapp_contact')
        .select('id')
        .eq('company_id', instance.company_id)
        .eq('external_jid', externalJid)
        .maybeSingle();

      if (findError) {
        console.error('Contact find error:', findError);
        return new Response(
          JSON.stringify({ error: 'Database Error (Contacts)', details: findError }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (existing?.id) {
        const { error: updateError } = await supabaseAdmin
          .from('whatsapp_contact')
          .update({
            phone_number: payload.phone_number,
            display_name: payload.display_name,
            profile_pic_url: payload.profile_pic_url,
            is_group: payload.is_group,
            is_archived: payload.is_archived,
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('Contact update error:', updateError);
          return new Response(
            JSON.stringify({ error: 'Database Error (Contacts)', details: updateError }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        contactMap.set(externalJid, existing.id);
      } else {
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from('whatsapp_contact')
          .insert(payload)
          .select('id')
          .single();

        if (insertError || !inserted?.id) {
          console.error('Contact insert error:', insertError);
          return new Response(
            JSON.stringify({ error: 'Database Error (Contacts)', details: insertError }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        contactMap.set(externalJid, inserted.id);
      }
    }

    // 7. Sync Conversations
    const conversationPayloads = chats
      .map((chat: any) => {
        const externalId = resolveChatExternalId(chat);
        const contactId = contactMap.get(externalId);

        if (!contactId) return null;

        return {
          company_id: instance.company_id,
          instance_id: instance.id,
          contact_id: contactId,
          wa_chatid: externalId,
          last_message_at: toIsoTimestamp(chat.wa_lastMsgTimestamp),
          last_message_preview: chat.wa_lastMessageTextVote || chat.wa_lastMessageType || null,
          unread_count: chat.wa_unreadCount || 0,
        };
      })
      .filter(Boolean);

    if (conversationPayloads.length > 0) {
      const { error: convError } = await supabaseAdmin
        .from('whatsapp_conversation')
        .upsert(conversationPayloads, {
          onConflict: 'company_id,instance_id,contact_id',
        });

      if (convError) {
        console.error('Conversations Upsert Error:', convError);
        return new Response(
          JSON.stringify({ error: 'Database Error (Conversations)', details: convError }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        chats: chats.length,
        pagination: responseData.pagination,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
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
