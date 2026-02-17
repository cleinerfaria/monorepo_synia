import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  company_id: string;
  access_profile_id: string;
}

interface UpdateUserRequest {
  user_id: string;
  name?: string;
  access_profile_id?: string;
  active?: boolean;
}

interface ResetPasswordRequest {
  user_id: string;
  new_password: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract the JWT token from the header
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Invalid authorization header format' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Admin client for user management and verification
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the requesting user using the token directly
    const {
      data: { user: requestingUser },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);
    if (userError || !requestingUser) {
      console.error('Auth error:', userError?.message || 'No user returned');
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          details: userError?.message || 'Failed to verify user token',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if requesting user has admin permissions
    const { data: requestingAppUser, error: appUserError } = await supabaseAdmin
      .from('app_user')
      .select(
        `
        id,
        company_id,
        access_profile:access_profile_id (
          id,
          is_admin
        )
      `
      )
      .eq('auth_user_id', requestingUser.id)
      .eq('active', true)
      .single();

    if (appUserError || !requestingAppUser) {
      return new Response(JSON.stringify({ error: 'User not found or inactive' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isAdmin = requestingAppUser.access_profile?.is_admin === true;

    // Parse request body
    const body = await req.json();
    const action = body.action || 'create';

    switch (action) {
      case 'create': {
        const { email, password, name, company_id, access_profile_id } = body as CreateUserRequest;

        // Validate required fields
        if (!email || !password || !name || !company_id) {
          return new Response(
            JSON.stringify({
              error: 'Missing required fields: email, password, name, company_id',
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // Check permission to create users
        if (!isAdmin) {
          // Check specific permission
          const { data: hasPermission } = await supabaseAdmin.rpc('has_permission', {
            p_auth_user_id: requestingUser.id,
            p_module_code: 'admin',
            p_permission_code: 'manage_users',
          });

          if (!hasPermission) {
            return new Response(JSON.stringify({ error: 'Permission denied' }), {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        // Check if user already exists in this company
        const { data: existingAppUser } = await supabaseAdmin
          .from('app_user')
          .select('id')
          .eq('email', email)
          .eq('company_id', company_id)
          .maybeSingle();

        if (existingAppUser) {
          return new Response(JSON.stringify({ error: 'Usuário já existe nesta empresa' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if auth user already exists (same email in another company)
        const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingAuthUser = existingAuthUsers?.users?.find((u) => u.email === email);

        let authUserId: string;

        if (existingAuthUser) {
          // User already has an auth account - just link to new company
          authUserId = existingAuthUser.id;
        } else {
          // Create new user in Supabase Auth
          const { data: authData, error: createAuthError } =
            await supabaseAdmin.auth.admin.createUser({
              email,
              password,
              email_confirm: true,
              user_metadata: {
                name,
                company_id,
              },
            });

          if (createAuthError) {
            return new Response(JSON.stringify({ error: createAuthError.message }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          if (!authData.user) {
            return new Response(JSON.stringify({ error: 'Failed to create auth user' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          authUserId = authData.user.id;
        }

        // Create app_user record
        const { data: appUser, error: createAppUserError } = await supabaseAdmin
          .from('app_user')
          .insert({
            company_id,
            auth_user_id: authUserId,
            name,
            email,
            access_profile_id,
            active: true,
          })
          .select()
          .single();

        if (createAppUserError) {
          // Only delete the auth user if we just created it and it has no other app_user records
          if (!existingAuthUser) {
            const { data: otherAppUsers } = await supabaseAdmin
              .from('app_user')
              .select('id')
              .eq('auth_user_id', authUserId);

            if (!otherAppUsers || otherAppUsers.length === 0) {
              await supabaseAdmin.auth.admin.deleteUser(authUserId);
            }
          }

          return new Response(JSON.stringify({ error: createAppUserError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(
          JSON.stringify({
            success: true,
            user: appUser,
            auth_user_id: authUserId,
            linked_existing: !!existingAuthUser,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      case 'update': {
        const { user_id, name, access_profile_id, active } = body as UpdateUserRequest;

        if (!user_id) {
          return new Response(JSON.stringify({ error: 'Missing user_id' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check permission
        if (!isAdmin) {
          const { data: hasPermission } = await supabaseAdmin.rpc('has_permission', {
            p_auth_user_id: requestingUser.id,
            p_module_code: 'admin',
            p_permission_code: 'manage_users',
          });

          if (!hasPermission) {
            return new Response(JSON.stringify({ error: 'Permission denied' }), {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        const updates: Record<string, any> = {};
        if (name !== undefined) updates.name = name;
        if (access_profile_id !== undefined) updates.access_profile_id = access_profile_id;
        if (active !== undefined) updates.active = active;

        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from('app_user')
          .update(updates)
          .eq('id', user_id)
          .select()
          .single();

        if (updateError) {
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ success: true, user: updatedUser }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'reset-password': {
        const { user_id, new_password } = body as ResetPasswordRequest;

        if (!user_id || !new_password) {
          return new Response(JSON.stringify({ error: 'Missing user_id or new_password' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (new_password.length < 6) {
          return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check permission
        if (!isAdmin) {
          const { data: hasPermission } = await supabaseAdmin.rpc('has_permission', {
            p_auth_user_id: requestingUser.id,
            p_module_code: 'admin',
            p_permission_code: 'manage_users',
          });

          if (!hasPermission) {
            return new Response(JSON.stringify({ error: 'Permission denied' }), {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        // Get the auth_user_id from app_user
        const { data: appUser, error: appUserError } = await supabaseAdmin
          .from('app_user')
          .select('auth_user_id')
          .eq('id', user_id)
          .single();

        if (appUserError || !appUser) {
          return new Response(JSON.stringify({ error: 'User not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Update password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          appUser.auth_user_id,
          {
            password: new_password,
          }
        );

        if (updateError) {
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete': {
        const { user_id } = body;

        if (!user_id) {
          return new Response(JSON.stringify({ error: 'Missing user_id' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check permission
        if (!isAdmin) {
          const { data: hasPermission } = await supabaseAdmin.rpc('has_permission', {
            p_auth_user_id: requestingUser.id,
            p_module_code: 'admin',
            p_permission_code: 'manage_users',
          });

          if (!hasPermission) {
            return new Response(JSON.stringify({ error: 'Permission denied' }), {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        // Get the auth_user_id from app_user
        const { data: appUser, error: appUserError } = await supabaseAdmin
          .from('app_user')
          .select('auth_user_id')
          .eq('id', user_id)
          .single();

        if (appUserError || !appUser) {
          return new Response(JSON.stringify({ error: 'User not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Delete from app_user first
        const { error: deleteAppUserError } = await supabaseAdmin
          .from('app_user')
          .delete()
          .eq('id', user_id);

        if (deleteAppUserError) {
          return new Response(JSON.stringify({ error: deleteAppUserError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Delete from auth
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
          appUser.auth_user_id
        );

        if (deleteAuthError) {
          console.error('Error deleting auth user:', deleteAuthError);
          // Don't fail the request, app_user is already deleted
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
