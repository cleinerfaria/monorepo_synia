/// <reference lib="deno.window" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (
      // @ts-expect-error - not used
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _e
    ) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { name } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return new Response(
        JSON.stringify({
          error: 'Name is required and must be a non-empty string',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the token is valid (user is authenticated via Supabase Auth)
    const {
      data: { user: authUser },
      error: authVerifyError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authVerifyError || !authUser) {
      return new Response(
        JSON.stringify({
          error: 'Invalid token',
          details: authVerifyError?.message,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if there are any existing system_users - if so, block this endpoint
    const { data: existingSystemUsers, error: checkError } = await supabaseAdmin
      .from('system_user')
      .select('auth_user_id')
      .limit(1);

    if (checkError) {
      console.error('Error checking existing system users:', checkError);
    }

    if (existingSystemUsers && existingSystemUsers.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'System already has a superadmin.',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create system_user record to mark this user as superadmin
    const { data: systemUserData, error: systemUserError } = await supabaseAdmin
      .from('system_user')
      .insert([
        {
          auth_user_id: authUser.id,
          is_superadmin: true,
          name: name.trim(),
          email: authUser.email || '',
        },
      ])
      .select()
      .single();

    if (systemUserError) {
      console.error('System user creation error:', systemUserError);

      return new Response(
        JSON.stringify({
          error: 'Failed to create system user',
          details: systemUserError.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        system_user: systemUserData,
        auth_user: {
          id: authUser.id,
          email: authUser.email,
        },
        message: 'Superadmin created successfully. Now create a company.',
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
