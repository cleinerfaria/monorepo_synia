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

function normalizePhoneFromJid(jid?: string | null) {
  if (!jid) return null;
  const value = jid.split('@')[0];
  return value || null;
}

function resolveContactName(contact: any) {
  return (
    contact.contact_name ||
    contact.contactName ||
    contact.contact_FirstName ||
    contact.firstName ||
    contact.name ||
    null
  );
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

    // Client for auth verification (Anon key)
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

    // 2. Client for Database Operations (Service Role - Bypass RLS)
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

    // 3. Parse Request
    const { instanceId, limit = 50, offset = 0, previewOnly = false } = await req.json();

    if (!instanceId) {
      return new Response(JSON.stringify({ error: 'instanceId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Get Instance Token & Info
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

    // 5. Fetch Contacts from Uazapi
    const uazapiUrl = Deno.env.get('UAZAPI_URL');
    if (!uazapiUrl) {
      return new Response(JSON.stringify({ error: 'UAZAPI_URL not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetContactsUrl = `${uazapiUrl.replace(/\/$/, '')}/contacts/list`;
    const uazapiContactsResponse = await fetch(targetContactsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        token: accessToken,
      },
      body: JSON.stringify({
        page: Math.floor(offset / Math.max(limit, 1)) + 1,
        pageSize: limit,
        limit,
        offset,
      }),
    });

    let contactsPayload: any[] = [];
    let pagination: Record<string, unknown> | null = null;

    if (uazapiContactsResponse.ok) {
      const responseData = await uazapiContactsResponse.json();
      contactsPayload = responseData.contacts || [];
      pagination = responseData.pagination || null;
    } else {
      // Fallback de compatibilidade: usa /chat/find quando /contacts/list não estiver disponível
      const targetChatUrl = `${uazapiUrl.replace(/\/$/, '')}/chat/find`;
      const uazapiChatResponse = await fetch(targetChatUrl, {
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

      if (!uazapiChatResponse.ok) {
        const errorText = await uazapiChatResponse.text();
        return new Response(JSON.stringify({ error: 'Uazapi Error', details: errorText }), {
          status: uazapiChatResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const responseData = await uazapiChatResponse.json();
      contactsPayload = responseData.chats || [];
      pagination = responseData.pagination || null;
    }

    if (contactsPayload.length === 0) {
      return new Response(
        JSON.stringify({
          contacts: 0,
          newContacts: 0,
          updatedContacts: 0,
          previewOnly: Boolean(previewOnly),
          pagination,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (previewOnly) {
      const previewContacts = contactsPayload.slice(0, 10).map((contact: any) => {
        const external =
          contact.jid ||
          contact.wa_chatid ||
          contact.chatId ||
          contact.id ||
          contact.remoteJid ||
          null;
        const externalValue = typeof external === 'string' ? external : null;
        const displayName = resolveContactName(contact);
        const phone = contact.phone || normalizePhoneFromJid(externalValue);

        return {
          jid: externalValue,
          displayName: displayName || phone || 'Contato sem nome',
          phone: phone || null,
          isGroup: Boolean(
            externalValue?.includes('@g.us') || contact.wa_isGroup || contact.isGroup
          ),
        };
      });

      return new Response(
        JSON.stringify({
          contacts: contactsPayload.length,
          newContacts: 0,
          updatedContacts: 0,
          previewOnly: true,
          previewContacts,
          pagination,
          message: 'Preview loaded',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 6. Transform Data
    const contactPayloads = contactsPayload
      .map((contact: any) => {
        const external =
          contact.jid ||
          contact.wa_chatid ||
          contact.chatId ||
          contact.id ||
          contact.remoteJid ||
          null;
        const externalValue = typeof external === 'string' ? external : null;
        if (!externalValue) return null;

        const isLid = externalValue.includes('@lid');
        const isGroup =
          externalValue.includes('@g.us') ||
          Boolean(contact.wa_isGroup) ||
          Boolean(contact.isGroup);
        const isArchived = Boolean(contact.wa_archived) || Boolean(contact.isArchived);

        return {
          company_id: instance.company_id,
          external_jid: isLid ? null : externalValue,
          external_lid: isLid ? externalValue : null,
          phone_number: contact.phone || normalizePhoneFromJid(externalValue),
          display_name: resolveContactName(contact),
          profile_pic_url: contact.image || contact.imagePreview || null,
          is_group: isGroup,
          is_archived: isArchived,
        };
      })
      .filter(Boolean) as any[];

    if (contactPayloads.length === 0) {
      return new Response(
        JSON.stringify({
          contacts: 0,
          newContacts: 0,
          updatedContacts: 0,
          pagination,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 7. Upsert Contacts (manual strategy)
    let insertedCount = 0;
    let updatedCount = 0;

    for (const payload of contactPayloads) {
      const conflictField = payload.external_jid ? 'external_jid' : 'external_lid';
      const conflictValue = payload.external_jid || payload.external_lid;

      const { data: existing, error: findError } = await supabaseAdmin
        .from('whatsapp_contact')
        .select('id')
        .eq('company_id', instance.company_id)
        .eq(conflictField, conflictValue)
        .maybeSingle();

      if (findError) {
        console.error('Contact find error:', findError);
        return new Response(JSON.stringify({ error: 'Database Error', details: findError }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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
          return new Response(JSON.stringify({ error: 'Database Error', details: updateError }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        updatedCount += 1;
      } else {
        const { error: insertError } = await supabaseAdmin.from('whatsapp_contact').insert(payload);

        if (insertError) {
          console.error('Contact insert error:', insertError);
          return new Response(JSON.stringify({ error: 'Database Error', details: insertError }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        insertedCount += 1;
      }
    }

    // Calculate stats (rough approximation as upsert doesn't always return diff)
    // For now returning total processed.

    return new Response(
      JSON.stringify({
        contacts: contactPayloads.length,
        newContacts: insertedCount,
        updatedContacts: updatedCount,
        previewOnly: false,
        pagination,
        message: 'Sync successful',
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
