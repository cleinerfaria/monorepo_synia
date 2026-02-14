import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type RouteScope = 'admin' | 'instance';
type PermissionCode = 'manage_instances' | 'manage_messages';

type RoutePolicy = {
  path: string;
  methods: ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')[];
  scope: RouteScope;
  permission: PermissionCode;
};

const routePolicies: RoutePolicy[] = [
  { path: '/instance/init', methods: ['POST'], scope: 'admin', permission: 'manage_instances' },
  { path: '/instance/all', methods: ['GET'], scope: 'admin', permission: 'manage_instances' },
  {
    path: '/instance/connect',
    methods: ['POST'],
    scope: 'instance',
    permission: 'manage_instances',
  },
  {
    path: '/instance/disconnect',
    methods: ['POST'],
    scope: 'instance',
    permission: 'manage_instances',
  },
  { path: '/instance/status', methods: ['GET'], scope: 'instance', permission: 'manage_instances' },
  { path: '/instance', methods: ['DELETE'], scope: 'instance', permission: 'manage_instances' },
  {
    path: '/message/download',
    methods: ['POST'],
    scope: 'instance',
    permission: 'manage_messages',
  },
  { path: '/send/text', methods: ['POST'], scope: 'instance', permission: 'manage_messages' },
];

function resolveInstanceAccessToken(instance: any): string | null {
  const nested = instance?.whatsapp_instance_secret;
  if (Array.isArray(nested)) return nested[0]?.access_token || null;
  if (nested && typeof nested === 'object') return nested.access_token || null;
  if (typeof instance?.access_token === 'string' && instance.access_token)
    return instance.access_token;
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

  if (typeof secret?.access_token === 'string' && secret.access_token) return secret.access_token;
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

function normalizePath(path: string) {
  return `/${path.trim().replace(/^\/+/, '').replace(/\/+$/, '')}`;
}

function findRoutePolicy(path: string, method: string) {
  const normalized = normalizePath(path);
  return routePolicies.find(
    (policy) => policy.path === normalized && policy.methods.includes(method as any)
  );
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const allowInvalidJwtBypass = Deno.env.get('UAZAPI_PROXY_ALLOW_INVALID_JWT') === 'true';

    const authHeader = req.headers.get('Authorization');

    const { path, method = 'POST', body, instanceId, token: legacyToken, admin } = await req.json();

    if (!path) {
      return new Response(JSON.stringify({ error: 'Path is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const routePolicy = findRoutePolicy(path, method);
    if (!routePolicy) {
      return new Response(JSON.stringify({ error: 'Path/method not allowed' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (legacyToken) {
      return new Response(JSON.stringify({ error: 'Direct instance token is not allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    let user: { id: string } | null = null;
    let appUser: any = null;
    let isSuperadmin = false;
    let isAdminRole = false;
    let isManagerRole = false;
    let hasPermission = false;

    const token = authHeader?.replace('Bearer ', '') || '';

    if (token) {
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader as string } },
      });

      const {
        data: { user: verifiedUser },
        error: authError,
      } = await supabaseClient.auth.getUser(token);

      if (authError || !verifiedUser) {
        if (!allowInvalidJwtBypass) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized', details: authError?.message || 'Invalid JWT' }),
            {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      } else {
        user = { id: verifiedUser.id };

        const { data: resolvedAppUser } = await supabaseAdmin
          .from('app_user')
          .select(
            `
            company_id,
            access_profile:access_profile_id (
              code,
              is_admin
            )
          `
          )
          .eq('auth_user_id', user.id)
          .eq('active', true)
          .maybeSingle();

        appUser = resolvedAppUser;

        const { data: systemUser } = await supabaseAdmin
          .from('system_user')
          .select('is_superadmin')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        isSuperadmin = !!systemUser?.is_superadmin;
        const profileCode = appUser?.access_profile?.code || '';
        const isProfileAdmin = !!appUser?.access_profile?.is_admin;
        isAdminRole = isProfileAdmin || profileCode === 'admin';
        isManagerRole = profileCode === 'manager';

        if (!appUser && !isSuperadmin) {
          return new Response(JSON.stringify({ error: 'User not found or inactive' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: permissionData } = await supabaseAdmin.rpc('has_permission', {
          p_user_auth_id: user.id,
          p_module_code: 'whatsapp',
          p_permission_code: routePolicy.permission,
        });

        hasPermission = !!permissionData;
      }
    } else if (!allowInvalidJwtBypass) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (user) {
      const canAccessRoute = isSuperadmin || isAdminRole || isManagerRole || hasPermission;
      if (!canAccessRoute) {
        return new Response(JSON.stringify({ error: 'Permission denied' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const uazapiUrl = Deno.env.get('UAZAPI_URL');
    const adminToken = Deno.env.get('UAZAPI_ADMINTOKEN');

    if (!uazapiUrl || !adminToken) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetUrl = `${uazapiUrl.replace(/\/$/, '')}${normalizePath(path)}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (routePolicy.scope === 'admin') {
      if (!admin) {
        return new Response(JSON.stringify({ error: 'Admin flag required for this route' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      headers['admintoken'] = adminToken;
    }

    if (routePolicy.scope === 'instance') {
      if (!instanceId) {
        return new Response(JSON.stringify({ error: 'instanceId is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: instance, error: instanceError } = await supabaseAdmin
        .from('whatsapp_instance')
        .select('id, company_id, provider_instance_id, whatsapp_instance_secret(access_token)')
        .eq('id', instanceId)
        .single();

      if (instanceError || !instance) {
        return new Response(JSON.stringify({ error: 'Instance not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (user && !isSuperadmin && appUser?.company_id !== instance.company_id) {
        return new Response(JSON.stringify({ error: 'Instance does not belong to your company' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const instanceToken =
        (await resolveInstanceAccessTokenFromDb(supabaseAdmin, instance)) ||
        (await resolveInstanceAccessTokenFromProvider(supabaseAdmin, instance));
      if (!instanceToken) {
        return new Response(JSON.stringify({ error: 'Instance token not found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      headers['token'] = instanceToken;
    }

    const response = await fetch(targetUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseData = await response.text();

    let parsedData;
    try {
      parsedData = JSON.parse(responseData);
    } catch {
      parsedData = { response: responseData };
    }

    if (!response.ok) {
      return new Response(JSON.stringify(parsedData), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(parsedData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
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
