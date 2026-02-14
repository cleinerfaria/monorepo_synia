// deno-lint-ignore-file
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Este arquivo usa APIs do Deno que não são reconhecidas pelo TypeScript do VS Code
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Pool } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tipos de banco suportados
type DbType = 'postgres' | 'mysql' | 'mssql' | 'oracle' | 'sqlite' | 'other';
type SslMode = 'disable' | 'allow' | 'prefer' | 'require' | 'verify-ca' | 'verify-full';

interface DatabaseConnection {
  id?: string;
  company_id: string;
  name: string;
  description?: string;
  db_type?: DbType;
  db_host: string;
  db_port: number;
  db_name: string;
  db_user: string;
  db_password?: string; // Apenas para create/update
  db_ssl_mode?: SslMode;
  connection_options?: Record<string, unknown>;
  is_active?: boolean;
  is_default?: boolean;
}

interface RequestBody {
  action: 'create' | 'update' | 'delete' | 'test' | 'query' | 'list' | 'get';
  database_id?: string;
  company_id?: string;
  connection?: DatabaseConnection;
  query?: string;
  params?: unknown[];
}

// Estrutura retornada pela função encrypt_db_password_v2
interface EncryptedPassword {
  ciphertext: string; // base64 encoded bytea
  nonce: string; // base64 encoded bytea
  key_id: string; // uuid
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Criar cliente Supabase com a autenticação do usuário
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Cliente admin para operações privilegiadas (service_role)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar usuário autenticado
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Verificar se é superadmin (usando cliente public para acessar system_user)
    // Verificar se é superadmin
    const { data: systemUser } = await supabaseAdmin
      .from('system_user')
      .select('is_superadmin')
      .eq('auth_user_id', user.id)
      .single();

    const isSuperadmin = systemUser?.is_superadmin === true;

    const body: RequestBody = await req.json();
    const { action } = body;

    let result: unknown;

    switch (action) {
      case 'create':
        result = await createDatabase(supabaseAdmin, user.id, body.connection!, isSuperadmin);
        break;

      case 'update':
        result = await updateDatabase(
          supabaseAdmin,
          user.id,
          body.database_id!,
          body.connection!,
          isSuperadmin
        );
        break;

      case 'delete':
        result = await deleteDatabase(supabaseAdmin, body.database_id!);
        break;

      case 'test':
        result = await testConnection(supabaseAdmin, body.database_id!);
        break;

      case 'query':
        result = await executeQuery(
          supabaseAdmin,
          user.id,
          body.database_id!,
          body.query!,
          body.params,
          isSuperadmin
        );
        break;

      case 'list':
        result = await listDatabases(supabaseClient, body.company_id);
        break;

      case 'get':
        result = await getDatabase(supabaseClient, body.database_id!);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

// ============================================
// CRUD Operations
// ============================================

async function createDatabase(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  connection: DatabaseConnection,
  _isSuperadmin: boolean
) {
  // Criptografar a senha usando a função v2 (retorna ciphertext, nonce, key_id)
  const { data: encryptedData, error: encryptError } = await supabase.rpc(
    'encrypt_db_password_v2',
    { p_plain_password: connection.db_password }
  );

  if (encryptError) {
    throw new Error(`Failed to encrypt password: ${encryptError.message}`);
  }

  const encrypted = encryptedData as EncryptedPassword;

  // Inserir na tabela public.company_databases
  const { data, error } = await supabase
    .from('company_databases')
    .insert({
      company_id: connection.company_id,
      name: connection.name,
      description: connection.description,
      db_type: connection.db_type || 'postgres',
      db_host: connection.db_host,
      db_port: connection.db_port || 5432,
      db_name: connection.db_name,
      db_user: connection.db_user,
      db_password_ciphertext: encrypted.ciphertext,
      db_password_nonce: encrypted.nonce,
      db_password_key_id: encrypted.key_id,
      db_ssl_mode: connection.db_ssl_mode || 'require',
      connection_options: connection.connection_options || {},
      is_active: connection.is_active ?? true,
      is_default: connection.is_default ?? false,
      created_by: userId,
      updated_by: userId,
    })
    .select('id, name, company_id')
    .single();

  if (error) {
    throw new Error(`Failed to create database connection: ${error.message}`);
  }

  return data;
}

async function updateDatabase(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  databaseId: string,
  connection: Partial<DatabaseConnection>,
  _isSuperadmin: boolean
) {
  const updateData: Record<string, unknown> = {
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  // Campos permitidos para atualização
  if (connection.name !== undefined) updateData.name = connection.name;
  if (connection.description !== undefined) updateData.description = connection.description;
  if (connection.db_type !== undefined) updateData.db_type = connection.db_type;
  if (connection.db_host !== undefined) updateData.db_host = connection.db_host;
  if (connection.db_port !== undefined) updateData.db_port = connection.db_port;
  if (connection.db_name !== undefined) updateData.db_name = connection.db_name;
  if (connection.db_user !== undefined) updateData.db_user = connection.db_user;
  if (connection.db_ssl_mode !== undefined) updateData.db_ssl_mode = connection.db_ssl_mode;
  if (connection.connection_options !== undefined)
    updateData.connection_options = connection.connection_options;
  if (connection.is_active !== undefined) updateData.is_active = connection.is_active;
  if (connection.is_default !== undefined) updateData.is_default = connection.is_default;

  // Se a senha foi fornecida, criptografar com v2
  if (connection.db_password) {
    const { data: encryptedData, error: encryptError } = await supabase.rpc(
      'encrypt_db_password_v2',
      { p_plain_password: connection.db_password }
    );

    if (encryptError) {
      throw new Error(`Failed to encrypt password: ${encryptError.message}`);
    }

    const encrypted = encryptedData as EncryptedPassword;
    updateData.db_password_ciphertext = encrypted.ciphertext;
    updateData.db_password_nonce = encrypted.nonce;
    updateData.db_password_key_id = encrypted.key_id;
  }

  // Atualizar na tabela public.company_databases
  const { data, error } = await supabase
    .from('company_databases')
    .update(updateData)
    .eq('id', databaseId)
    .select('id, name, company_id')
    .single();

  if (error) {
    throw new Error(`Failed to update database connection: ${error.message}`);
  }

  return data;
}

async function deleteDatabase(supabase: ReturnType<typeof createClient>, databaseId: string) {
  const { error } = await supabase.from('company_databases').delete().eq('id', databaseId);

  if (error) {
    throw new Error(`Failed to delete database connection: ${error.message}`);
  }

  return { deleted: true };
}

async function listDatabases(supabase: ReturnType<typeof createClient>, companyId?: string) {
  // Usa a view segura que não expõe segredos
  let query = supabase.from('company_databases_safe').select('*').order('name');

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list databases: ${error.message}`);
  }

  return data;
}

async function getDatabase(supabase: ReturnType<typeof createClient>, databaseId: string) {
  // Usa a view segura que não expõe segredos
  const { data, error } = await supabase
    .from('company_databases_safe')
    .select('*')
    .eq('id', databaseId)
    .single();

  if (error) {
    throw new Error(`Failed to get database: ${error.message}`);
  }

  return data;
}

// ============================================
// Connection Operations
// ============================================

async function testConnection(supabase: ReturnType<typeof createClient>, databaseId: string) {
  // Buscar dados da conexão
  const { data: dbConfig, error: fetchError } = await supabase
    .from('company_databases')
    .select('*')
    .eq('id', databaseId)
    .single();

  if (fetchError || !dbConfig) {
    throw new Error('Database connection not found');
  }

  // Descriptografar a senha usando v2 (3 parâmetros)
  const { data: decryptedPassword, error: decryptError } = await supabase.rpc(
    'decrypt_db_password_v2',
    {
      p_ciphertext: dbConfig.db_password_ciphertext,
      p_nonce: dbConfig.db_password_nonce,
      p_key_id: dbConfig.db_password_key_id,
    }
  );

  if (decryptError) {
    throw new Error(`Failed to decrypt password: ${decryptError.message}`);
  }

  // Atualmente só suportamos PostgreSQL para teste de conexão
  if (dbConfig.db_type !== 'postgres') {
    // Atualizar status como não testado
    await supabase.rpc('update_database_connection_status', {
      p_database_id: databaseId,
      p_status: 'error',
      p_error: `Connection test not supported for database type: ${dbConfig.db_type}`,
    });

    return {
      status: 'error',
      error: `Connection test not supported for database type: ${dbConfig.db_type}`,
      tested_at: new Date().toISOString(),
    };
  }

  let pool: Pool | null = null;
  let status = 'success';
  let errorMessage: string | null = null;

  try {
    // Tentar conectar
    pool = new Pool(
      {
        hostname: dbConfig.db_host,
        port: dbConfig.db_port,
        database: dbConfig.db_name,
        user: dbConfig.db_user,
        password: decryptedPassword,
        tls: { enabled: dbConfig.db_ssl_mode !== 'disable' },
      },
      1
    ); // Pool com 1 conexão para teste

    const connection = await pool.connect();

    // Testar query simples
    const result = await connection.queryObject('SELECT 1 as test');
    connection.release();

    if (!result.rows || result.rows.length === 0) {
      throw new Error('Connection test query failed');
    }
  } catch (error) {
    status = 'error';
    errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
  } finally {
    if (pool) {
      await pool.end();
    }
  }

  // Atualizar status no banco
  await supabase.rpc('update_database_connection_status', {
    p_database_id: databaseId,
    p_status: status,
    p_error: errorMessage,
  });

  return {
    status,
    error: errorMessage,
    tested_at: new Date().toISOString(),
  };
}

async function executeQuery(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  databaseId: string,
  query: string,
  params: unknown[] = [],
  isSuperadmin: boolean
) {
  // Validação de segurança: apenas SELECT permitido (a menos que seja superadmin)
  const normalizedQuery = query.trim().toUpperCase();
  const isReadOnly = normalizedQuery.startsWith('SELECT') || normalizedQuery.startsWith('WITH');

  if (!isReadOnly && !isSuperadmin) {
    throw new Error('Only SELECT queries are allowed for non-superadmin users');
  }

  // Buscar dados da conexão
  const { data: dbConfig, error: fetchError } = await supabase
    .from('company_databases')
    .select('*')
    .eq('id', databaseId)
    .single();

  if (fetchError || !dbConfig) {
    throw new Error('Database connection not found');
  }

  // Verificar se usuário tem acesso a esta empresa
  if (!isSuperadmin) {
    const { data: appUser, error: accessError } = await supabase
      .from('app_user')
      .select('id')
      .eq('auth_user_id', userId)
      .eq('company_id', dbConfig.company_id)
      .eq('active', true)
      .single();

    if (accessError || !appUser) {
      throw new Error('Access denied to this database');
    }
  }

  // Verificar tipo de banco (atualmente só PostgreSQL suportado)
  if (dbConfig.db_type !== 'postgres') {
    throw new Error(`Query execution not supported for database type: ${dbConfig.db_type}`);
  }

  // Descriptografar a senha usando v2
  const { data: decryptedPassword, error: decryptError } = await supabase.rpc(
    'decrypt_db_password_v2',
    {
      p_ciphertext: dbConfig.db_password_ciphertext,
      p_nonce: dbConfig.db_password_nonce,
      p_key_id: dbConfig.db_password_key_id,
    }
  );

  if (decryptError) {
    throw new Error(`Failed to decrypt password: ${decryptError.message}`);
  }

  let pool: Pool | null = null;

  try {
    pool = new Pool(
      {
        hostname: dbConfig.db_host,
        port: dbConfig.db_port,
        database: dbConfig.db_name,
        user: dbConfig.db_user,
        password: decryptedPassword,
        tls: { enabled: dbConfig.db_ssl_mode !== 'disable' },
      },
      3
    ); // Pool com 3 conexões

    const connection = await pool.connect();

    // Executar query
    const result = await connection.queryObject(query, params);
    connection.release();

    return {
      rows: result.rows,
      rowCount: result.rowCount,
      columns: result.rowDescription?.columns?.map((c: { name: string }) => c.name) || [],
    };
  } catch (error) {
    throw new Error(
      `Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}
