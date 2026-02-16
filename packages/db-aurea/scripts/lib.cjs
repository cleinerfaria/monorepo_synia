// Load environment variables from app .env.local
const { spawn, execFileSync } = require('node:child_process');
const path = require('node:path');

require('dotenv').config({ path: path.resolve(__dirname, '../../../apps/aurea/.env.local') });

const PROJECT = 'aurea';
const DB_URL_ENV = 'DB_URL';
const SUPABASE_URL_ENV = 'VITE_SUPABASE_URL';
const SERVICE_ROLE_ENV = 'SUPABASE_SERVICE_ROLE_KEY';
const APP_DIR = path.resolve(__dirname, '..');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function ensureDevEnv() {
  const appEnv = process.env.APP_ENV;
  if (!appEnv) {
    throw new Error('Missing required environment variable: APP_ENV');
  }

  if (appEnv !== 'dev') {
    throw new Error(`Seed blocked: APP_ENV must be dev, got ${appEnv}`);
  }
}

function run(command, args, options = {}) {
  process.stdout.write(`\n⚙️  Running: ${command} ${args.join(' ')}\n`)
  
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      stdio: ['inherit', 'inherit', 'inherit'],
      env: options.env || process.env,
      timeout: options.timeout || 60_000,
    })

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with exit code ${code}`))
      } else {
        resolve()
      }
    })

    child.on('error', (error) => {
      reject(error)
    })
  })
}

async function requestJson(url, { method = 'GET', headers = {}, body } = {}) {
  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`${method} ${url} failed: ${response.status} ${responseText}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function authHeaders(serviceRoleKey) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };
}

function postgrestHeaders(serviceRoleKey, prefer = 'return=representation') {
  return {
    ...authHeaders(serviceRoleKey),
    Prefer: prefer,
  };
}

function getDbUrl() {
  return requireEnv(DB_URL_ENV);
}

function getSupabaseConfig() {
  return {
    supabaseUrl: requireEnv(SUPABASE_URL_ENV),
    serviceRoleKey: requireEnv(SERVICE_ROLE_ENV),
  };
}

async function dbReset() {
  const dbUrl = getDbUrl();
  await run('supabase', ['db', 'reset', '--db-url', dbUrl, '--workdir', APP_DIR], {
    timeout: 180_000,
  });
}

async function dbMigrate() {
  const dbUrl = getDbUrl();
  await run('supabase', ['db', 'push', '--db-url', dbUrl, '--include-all', '--workdir', APP_DIR], {
    timeout: 180_000,
  });
}

async function ensureAuthUser({ supabaseUrl, serviceRoleKey, email, password, name }) {
  const usersResponse = await requestJson(
    `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`,
    {
      headers: authHeaders(serviceRoleKey),
    }
  );

  const existingUser = usersResponse?.users?.find(
    (user) => (user.email || '').toLowerCase() === email.toLowerCase()
  );

  if (existingUser) {
    const updated = await requestJson(`${supabaseUrl}/auth/v1/admin/users/${existingUser.id}`, {
      method: 'PUT',
      headers: authHeaders(serviceRoleKey),
      body: {
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
        },
      },
    });

    return updated?.id || existingUser.id;
  }

  const created = await requestJson(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: authHeaders(serviceRoleKey),
    body: {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
      },
    },
  });

  if (!created?.id) {
    throw new Error('Could not create auth user for dev seed');
  }

  return created.id;
}

async function getSingleRow({ supabaseUrl, serviceRoleKey, path }) {
  const rows = await requestJson(`${supabaseUrl}/rest/v1/${path}`, {
    headers: postgrestHeaders(serviceRoleKey, 'return=representation'),
  });

  return Array.isArray(rows) ? rows[0] || null : rows;
}

async function upsertRows({ supabaseUrl, serviceRoleKey, table, rows, onConflict }) {
  if (!rows.length) {
    return;
  }

  await requestJson(
    `${supabaseUrl}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`,
    {
      method: 'POST',
      headers: postgrestHeaders(
        serviceRoleKey,
        'resolution=merge-duplicates,return=representation'
      ),
      body: rows,
    }
  );
}

async function seedAureaDev() {
  ensureDevEnv();

  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();
  const companyDocument = '00.000.000/0001-00';

  // Ler credenciais do .env.local
  const systemAdminEmail = process.env.E2E_SYSTEM_ADMIN_EMAIL || 'superadmin@aurea.local';
  const systemAdminPassword = process.env.E2E_SYSTEM_ADMIN_PASSWORD || 'Aurea123';
  const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin@aurea.local';
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'Aurea123';
  const managerEmail = process.env.E2E_MANAGER_EMAIL || 'manager@aurea.local';
  const managerPassword = process.env.E2E_MANAGER_PASSWORD || 'Aurea123';
  const userEmail = process.env.E2E_USER_EMAIL || 'user@aurea.local';
  const userPassword = process.env.E2E_USER_PASSWORD || 'Aurea123';

  process.stdout.write('\n📝 Creating auth users...\n');
  
  const [systemAdminId, adminId, managerId, userId] = await Promise.all([
    ensureAuthUser({
      supabaseUrl,
      serviceRoleKey,
      email: systemAdminEmail,
      password: systemAdminPassword,
      name: 'System Admin',
    }),
    ensureAuthUser({
      supabaseUrl,
      serviceRoleKey,
      email: adminEmail,
      password: adminPassword,
      name: 'Admin',
    }),
    ensureAuthUser({
      supabaseUrl,
      serviceRoleKey,
      email: managerEmail,
      password: managerPassword,
      name: 'Manager',
    }),
    ensureAuthUser({
      supabaseUrl,
      serviceRoleKey,
      email: userEmail,
      password: userPassword,
      name: 'User',
    }),
  ]);

  process.stdout.write('✅ Auth users created\n');

  // Buscar company
  process.stdout.write('\n🔍 Fetching company...\n');
  const company = await getSingleRow({
    supabaseUrl,
    serviceRoleKey,
    path: `company?select=id,document&document=eq.${encodeURIComponent(companyDocument)}&limit=1`,
  });

  if (!company?.id) {
    throw new Error('Could not resolve Aurea company for dev seed');
  }
  process.stdout.write('✅ Company found\n');

  // Criar system_user
  process.stdout.write('\n📝 Creating system_user...\n');
  await upsertRows({
    supabaseUrl,
    serviceRoleKey,
    table: 'system_user',
    rows: [
      {
        auth_user_id: systemAdminId,
        is_superadmin: true,
        name: 'System Admin',
        email: systemAdminEmail,
      },
    ],
    onConflict: 'auth_user_id',
  });
  process.stdout.write('✅ system_user created\n');

  // Criar app_users
  process.stdout.write('\n📝 Creating app_users...\n');
  await upsertRows({
    supabaseUrl,
    serviceRoleKey,
    table: 'app_user',
    rows: [
      {
        company_id: company.id,
        auth_user_id: systemAdminId,
        name: 'System Admin',
        email: systemAdminEmail,
        active: true,
        role: 'admin',
      },
      {
        company_id: company.id,
        auth_user_id: adminId,
        name: 'Admin',
        email: adminEmail,
        active: true,
        role: 'admin',
      },
      {
        company_id: company.id,
        auth_user_id: managerId,
        name: 'Manager',
        email: managerEmail,
        active: true,
        role: 'manager',
      },
      {
        company_id: company.id,
        auth_user_id: userId,
        name: 'User',
        email: userEmail,
        active: true,
        role: 'viewer',
      },
    ],
    onConflict: 'auth_user_id,company_id',
  });
  process.stdout.write('✅ app_users created\n');

  process.stdout.write('\n✨ Aurea dev seed applied successfully!\n');
  process.stdout.write(`  - System Admin: ${systemAdminEmail}\n`);
  process.stdout.write(`  - Admin: ${adminEmail}\n`);
  process.stdout.write(`  - Manager: ${managerEmail}\n`);
  process.stdout.write(`  - User: ${userEmail}\n`);
}

module.exports = {
  PROJECT,
  dbReset,
  dbMigrate,
  seedAureaDev,
  ensureDevEnv,
};

