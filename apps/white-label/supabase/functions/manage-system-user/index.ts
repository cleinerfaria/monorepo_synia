import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateSystemUserRequest {
  email: string;
  password: string;
  name: string;
  is_superadmin: boolean;
}

interface UpdateSystemUserRequest {
  auth_user_id: string;
  name?: string;
  is_superadmin?: boolean;
}

interface DeleteSystemUserRequest {
  auth_user_id: string;
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

    // Admin client for user management
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the requesting user using the token
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

    // Only superadmins can manage system users
    const { data: requestingSystemUser, error: systemUserError } = await supabaseAdmin
      .from('system_user')
      .select('is_superadmin')
      .eq('auth_user_id', requestingUser.id)
      .maybeSingle();

    if (systemUserError) {
      console.error('System user lookup error:', systemUserError);
      return new Response(JSON.stringify({ error: 'Failed to verify permissions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!requestingSystemUser?.is_superadmin) {
      return new Response(JSON.stringify({ error: 'Only superadmins can manage system users' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await req.json();
    const action = body.action || 'create';

    switch (action) {
      case 'create': {
        const { email, password, name, is_superadmin } = body as CreateSystemUserRequest;

        // Validate required fields
        if (!email || !password || !name) {
          return new Response(
            JSON.stringify({
              error: 'Missing required fields: email, password, name',
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // Check if email already exists in auth.users
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase()
        );

        let authUserId: string;

        if (existingUser) {
          // Check if user is already a system user
          const { data: existingSystemUser } = await supabaseAdmin
            .from('system_user')
            .select('auth_user_id')
            .eq('auth_user_id', existingUser.id)
            .maybeSingle();

          if (existingSystemUser) {
            return new Response(JSON.stringify({ error: 'This user is already a system user' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          authUserId = existingUser.id;
        } else {
          // Create auth user
          const { data: newAuthUser, error: createAuthError } =
            await supabaseAdmin.auth.admin.createUser({
              email,
              password,
              email_confirm: true,
            });

          if (createAuthError || !newAuthUser?.user) {
            console.error('Error creating auth user:', createAuthError);
            return new Response(
              JSON.stringify({
                error: 'Failed to create user account',
                details: createAuthError?.message,
              }),
              {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }

          authUserId = newAuthUser.user.id;
        }

        // Create system_user record
        const { data: systemUser, error: systemUserError } = await supabaseAdmin
          .from('system_user')
          .insert({
            auth_user_id: authUserId,
            is_superadmin: is_superadmin || false,
            name,
            email,
          })
          .select()
          .single();

        if (systemUserError) {
          console.error('Error creating system_user:', systemUserError);
          // If we just created the auth user, we might want to clean up
          // For now, just return the error
          return new Response(
            JSON.stringify({
              error: 'Failed to create system user record',
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
            success: true,
            user: systemUser,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      case 'update': {
        const { auth_user_id, name, is_superadmin } = body as UpdateSystemUserRequest;

        if (!auth_user_id) {
          return new Response(JSON.stringify({ error: 'Missing required field: auth_user_id' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Prevent user from removing their own superadmin status
        if (auth_user_id === requestingUser.id && is_superadmin === false) {
          return new Response(
            JSON.stringify({ error: 'You cannot remove your own superadmin status' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (is_superadmin !== undefined) updateData.is_superadmin = is_superadmin;

        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from('system_user')
          .update(updateData)
          .eq('auth_user_id', auth_user_id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating system_user:', updateError);
          return new Response(
            JSON.stringify({
              error: 'Failed to update system user',
              details: updateError.message,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            user: updatedUser,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      case 'delete': {
        const { auth_user_id } = body as DeleteSystemUserRequest;

        if (!auth_user_id) {
          return new Response(JSON.stringify({ error: 'Missing required field: auth_user_id' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Prevent user from deleting themselves
        if (auth_user_id === requestingUser.id) {
          return new Response(JSON.stringify({ error: 'You cannot delete your own account' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check how many superadmins exist
        const { data: superadmins, error: countError } = await supabaseAdmin
          .from('system_user')
          .select('auth_user_id')
          .eq('is_superadmin', true);

        if (countError) {
          console.error('Error counting superadmins:', countError);
          return new Response(JSON.stringify({ error: 'Failed to verify system users' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get the user being deleted
        const { data: userToDelete } = await supabaseAdmin
          .from('system_user')
          .select('is_superadmin')
          .eq('auth_user_id', auth_user_id)
          .single();

        // If deleting a superadmin and there's only one, prevent it
        if (userToDelete?.is_superadmin && superadmins?.length === 1) {
          return new Response(JSON.stringify({ error: 'Cannot delete the last superadmin' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Delete the system_user record
        const { error: deleteError } = await supabaseAdmin
          .from('system_user')
          .delete()
          .eq('auth_user_id', auth_user_id);

        if (deleteError) {
          console.error('Error deleting system_user:', deleteError);
          return new Response(
            JSON.stringify({
              error: 'Failed to delete system user',
              details: deleteError.message,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'System user deleted successfully',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in manage-system-user:', error);
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
