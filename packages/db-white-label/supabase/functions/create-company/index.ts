/// <reference lib="deno.window" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateCompanyRequest {
  name: string;
  trade_name?: string;
  document?: string;
  primary_color?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Received token (first 20 chars):', token.substring(0, 20) + '...');

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

    console.log('Auth verification result:', {
      hasUser: !!authUser,
      userId: authUser?.id,
      error: authVerifyError?.message,
    });

    if (authVerifyError || !authUser) {
      console.error('Token validation failed:', authVerifyError);
      return new Response(
        JSON.stringify({
          error: 'Invalid JWT',
          details: authVerifyError?.message || 'Token validation failed',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user is system_user (superadmin or multi-tenant admin)
    const { data: systemUser, error: systemUserError } = await supabaseAdmin
      .from('system_user')
      .select('is_superadmin, name, email')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    if (systemUserError) {
      console.error('Error checking system user:', systemUserError);
      return new Response(
        JSON.stringify({
          error: 'Error checking user permissions',
          details: systemUserError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!systemUser) {
      return new Response(
        JSON.stringify({
          error: 'User is not a system administrator',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body = await req.json();
    const { name, trade_name, document, primary_color } = body as CreateCompanyRequest;

    // Validate required fields
    if (!name) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field: name',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create company
    const { data: company, error: companyError } = await supabaseAdmin
      .from('company')
      .insert([
        {
          name,
          trade_name: trade_name || null,
          document: document || null,
          primary_color: primary_color || '#D4AF37',
        },
      ])
      .select()
      .single();

    if (companyError) {
      console.error('Company creation error:', companyError);

      return new Response(
        JSON.stringify({
          error: 'Failed to create company',
          details: companyError.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        company,
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
