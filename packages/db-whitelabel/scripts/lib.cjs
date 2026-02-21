// Load environment variables from app .env.local first, then from root .env.local
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

// Tentar carregar de apps/whitelabel/.env.local primeiro
const appEnvPath = path.resolve(__dirname, '../../../apps/whitelabel/.env.local');
if (fs.existsSync(appEnvPath)) {
  require('dotenv').config({ path: appEnvPath });
} else {
  // Fallback para raiz .env.local
  require('dotenv').config({ path: path.resolve(__dirname, '../../../.env.local') });
}

const PROJECT = 'whitelabel';
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
  process.stdout.write(`\n⚙️  Running: ${command} ${args.join(' ')}\n`);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      stdio: ['inherit', 'inherit', 'inherit'],
      env: options.env || process.env,
      timeout: options.timeout || 60_000,
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with exit code ${code}`));
      } else {
        resolve();
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
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
  await run('supabase', ['db', 'reset', '--db-url', dbUrl, '--no-seed', '--workdir', APP_DIR], {
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

async function getSingleRow({ supabaseUrl, serviceRoleKey, path: queryPath }) {
  const rows = await requestJson(`${supabaseUrl}/rest/v1/${queryPath}`, {
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

async function seedWhiteLabelDev() {
  ensureDevEnv();

  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();
  const companyDocument = '22.222.222/0001-22';

  // Ler credenciais do .env.local
  const adminEmail = requireEnv('E2E_ADMIN_EMAIL');
  const adminPassword = requireEnv('E2E_ADMIN_PASSWORD');
  const managerEmail = requireEnv('E2E_MANAGER_EMAIL');
  const managerPassword = requireEnv('E2E_MANAGER_PASSWORD');
  const userEmail = requireEnv('E2E_USER_EMAIL');
  const userPassword = requireEnv('E2E_USER_PASSWORD');

  // Criar os 3 usuários auth via API
  process.stdout.write('\n🔐 Criando auth users...\n');
  const [adminId, managerId, userId] = await Promise.all([
    ensureAuthUser({
      supabaseUrl,
      serviceRoleKey,
      email: adminEmail,
      password: adminPassword,
      name: 'E2E Admin White Label',
    }),
    ensureAuthUser({
      supabaseUrl,
      serviceRoleKey,
      email: managerEmail,
      password: managerPassword,
      name: 'E2E Manager White Label',
    }),
    ensureAuthUser({
      supabaseUrl,
      serviceRoleKey,
      email: userEmail,
      password: userPassword,
      name: 'E2E User White Label',
    }),
  ]);
  process.stdout.write('✅ Auth users criados\n');

  // Buscar company
  process.stdout.write('\n🔍 Buscando empresa...\n');
  const company = await getSingleRow({
    supabaseUrl,
    serviceRoleKey,
    path: `company?select=id,document&document=eq.${encodeURIComponent(companyDocument)}&limit=1`,
  });

  if (!company?.id) {
    throw new Error('Could not resolve White Label company for dev seed');
  }
  process.stdout.write('✅ Empresa encontrada\n');

  // Buscar access_profiles
  process.stdout.write('\n🔍 Buscando access_profiles...\n');
  const [adminProfile, managerProfile, userProfile] = await Promise.all([
    getSingleRow({
      supabaseUrl,
      serviceRoleKey,
      path: `access_profile?select=id&company_id=eq.${company.id}&code=eq.admin&limit=1`,
    }),
    getSingleRow({
      supabaseUrl,
      serviceRoleKey,
      path: `access_profile?select=id&company_id=eq.${company.id}&code=eq.manager&limit=1`,
    }),
    getSingleRow({
      supabaseUrl,
      serviceRoleKey,
      path: `access_profile?select=id&company_id=eq.${company.id}&code=eq.user&limit=1`,
    }),
  ]);

  if (!adminProfile?.id || !managerProfile?.id || !userProfile?.id) {
    throw new Error('Could not resolve White Label access profiles for dev seed');
  }
  process.stdout.write('✅ Access profiles encontrados\n');

  // Criar system_user (admin é superadmin)
  process.stdout.write('\n📝 Criando system_user...\n');
  await upsertRows({
    supabaseUrl,
    serviceRoleKey,
    table: 'system_user',
    rows: [
      {
        auth_user_id: adminId,
        is_superadmin: true,
        name: 'E2E Admin White Label',
        email: adminEmail,
      },
    ],
    onConflict: 'auth_user_id',
  });
  process.stdout.write('✅ system_user criado\n');

  // Criar app_users
  process.stdout.write('\n📝 Criando app_users...\n');
  await upsertRows({
    supabaseUrl,
    serviceRoleKey,
    table: 'app_user',
    rows: [
      {
        company_id: company.id,
        auth_user_id: adminId,
        name: 'E2E Admin White Label',
        email: adminEmail,
        active: true,
        access_profile_id: adminProfile.id,
      },
      {
        company_id: company.id,
        auth_user_id: managerId,
        name: 'E2E Manager White Label',
        email: managerEmail,
        active: true,
        access_profile_id: managerProfile.id,
      },
      {
        company_id: company.id,
        auth_user_id: userId,
        name: 'E2E User White Label',
        email: userEmail,
        active: true,
        access_profile_id: userProfile.id,
      },
    ],
    onConflict: 'auth_user_id,company_id',
  });
  process.stdout.write('✅ app_users criados\n');

  process.stdout.write('\n✨ White Label dev seed aplicado com sucesso!\n');
  process.stdout.write(`  - Admin: ${adminEmail}\n`);
  process.stdout.write(`  - Manager: ${managerEmail}\n`);
  process.stdout.write(`  - User: ${userEmail}\n`);
}

module.exports = {
  PROJECT,
  dbReset,
  dbMigrate,
  seedWhiteLabelDev,
  ensureDevEnv,
};
