// Load environment variables from app .env.local
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

require('dotenv').config({ path: path.resolve(__dirname, '../../../apps/vidasystem/.env.local') });

const PROJECT = 'vidasystem';
const DB_URL_ENV = 'DB_URL';
const SUPABASE_URL_ENV = 'VITE_SUPABASE_URL';
const SERVICE_ROLE_ENV = 'SUPABASE_SERVICE_ROLE_KEY';
const SUPABASE_ACCESS_TOKEN_ENV = 'SUPABASE_ACCESS_TOKEN';
const PROJECT_REF_ENV = 'VIDASYSTEM_SUPABASE_PROJECT_REF';
const APP_DIR = path.resolve(__dirname, '..');
const FUNCTIONS_DIR = path.resolve(APP_DIR, 'supabase/functions');

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

function extractProjectRefFromSupabaseUrl(supabaseUrl) {
  try {
    const hostname = new URL(supabaseUrl).hostname.toLowerCase();
    const match = hostname.match(/^([a-z0-9]{20})\.supabase\.co$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function extractProjectRefFromDbUrl(dbUrl) {
  try {
    const parsed = new URL(dbUrl);
    const username = decodeURIComponent(parsed.username || '').toLowerCase();
    const usernameMatch = username.match(/^postgres\.([a-z0-9]{20})$/);
    if (usernameMatch) {
      return usernameMatch[1];
    }

    const hostname = parsed.hostname.toLowerCase();
    const hostMatch = hostname.match(/^db\.([a-z0-9]{20})\.supabase\.co$/);
    return hostMatch ? hostMatch[1] : null;
  } catch {
    return null;
  }
}

function resolveProjectRef() {
  const explicitProjectRef = (process.env[PROJECT_REF_ENV] || '').trim().toLowerCase();
  if (explicitProjectRef) {
    return explicitProjectRef;
  }

  const dbUrl = process.env[DB_URL_ENV];
  const fromDbUrl = dbUrl ? extractProjectRefFromDbUrl(dbUrl) : null;
  if (fromDbUrl) {
    return fromDbUrl;
  }

  const supabaseUrl = process.env[SUPABASE_URL_ENV];
  const fromSupabaseUrl = supabaseUrl ? extractProjectRefFromSupabaseUrl(supabaseUrl) : null;
  if (fromSupabaseUrl) {
    return fromSupabaseUrl;
  }

  throw new Error(
    `Missing project ref for functions deploy. Set ${PROJECT_REF_ENV} or provide ${DB_URL_ENV}/${SUPABASE_URL_ENV} with a valid Supabase project ref.`
  );
}

function hasSupabaseAccessToken() {
  return Boolean((process.env[SUPABASE_ACCESS_TOKEN_ENV] || '').trim());
}

async function runSqlSeed() {
  const dbUrl = getDbUrl();
  await run(
    'supabase',
    ['db', 'push', '--db-url', dbUrl, '--include-seed', '--workdir', APP_DIR, '--yes'],
    {
      timeout: 180_000,
    }
  );
}

function listFunctions() {
  if (!fs.existsSync(FUNCTIONS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function deployVidaSystemFunctions() {
  if (!hasSupabaseAccessToken()) {
    process.stdout.write(
      `\n⚠️  Skipping VidaSystem edge functions deploy: missing ${SUPABASE_ACCESS_TOKEN_ENV}. Add it to apps/vidasystem/.env.local to enable deploy.\n`
    );
    return;
  }

  const functions = listFunctions();
  if (!functions.length) {
    process.stdout.write('\n⚠️  No VidaSystem edge functions found to deploy.\n');
    return;
  }

  const projectRef = resolveProjectRef();
  process.stdout.write(`\n🚀 Deploying VidaSystem edge functions (${functions.join(', ')})...\n`);
  for (const fnName of functions) {
    const args = ['functions', 'deploy', fnName, '--project-ref', projectRef, '--workdir', APP_DIR];

    // manage-user validates JWT manually and must keep gateway verification disabled
    if (fnName === 'manage-user') {
      args.push('--no-verify-jwt');
    }

    await run('supabase', args, {
      timeout: 180_000,
    });
  }
  process.stdout.write('✅ VidaSystem edge functions deployed\n');
}

async function dbReset() {
  ensureDevEnv();
  const dbUrl = getDbUrl();
  await run(
    'supabase',
    ['db', 'reset', '--db-url', dbUrl, '--workdir', APP_DIR, '--yes', '--no-seed'],
    {
      timeout: 180_000,
    }
  );
  await seedVidaSystemDev();
  await runSqlSeed();
  await deployVidaSystemFunctions();
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

async function seedVidaSystemDev() {
  ensureDevEnv();

  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();
  const companyDocument = '00.000.000/0001-00';

  // Ler credenciais do .env.local
  const systemAdminEmail = process.env.E2E_SYSTEM_ADMIN_EMAIL || 'superadmin@vidasystem.com';
  const systemAdminPassword = process.env.E2E_SYSTEM_ADMIN_PASSWORD || 'Vida123';
  const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin@vidasystem.com';
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'Vida123';
  const managerEmail = process.env.E2E_MANAGER_EMAIL || 'manager@vidasystem.com';
  const managerPassword = process.env.E2E_MANAGER_PASSWORD || 'Vida123';
  const userEmail = process.env.E2E_USER_EMAIL || 'user@vidasystem.com';
  const userPassword = process.env.E2E_USER_PASSWORD || 'Vida123';

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
    throw new Error('Could not resolve VidaSystem company for dev seed');
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

  // Buscar access profiles da empresa
  process.stdout.write('\n🔍 Fetching access profiles...\n');
  const adminProfile = await getSingleRow({
    supabaseUrl,
    serviceRoleKey,
    path: `access_profile?select=id&company_id=eq.${company.id}&code=eq.admin&limit=1`,
  });
  const managerProfile = await getSingleRow({
    supabaseUrl,
    serviceRoleKey,
    path: `access_profile?select=id&company_id=eq.${company.id}&code=eq.manager&limit=1`,
  });
  const viewerProfile = await getSingleRow({
    supabaseUrl,
    serviceRoleKey,
    path: `access_profile?select=id&company_id=eq.${company.id}&code=eq.viewer&limit=1`,
  });

  if (!adminProfile?.id || !managerProfile?.id || !viewerProfile?.id) {
    process.stderr.write(`  DEBUG: adminProfile=${JSON.stringify(adminProfile)}\n`);
    process.stderr.write(`  DEBUG: managerProfile=${JSON.stringify(managerProfile)}\n`);
    process.stderr.write(`  DEBUG: viewerProfile=${JSON.stringify(viewerProfile)}\n`);

    // Tentar listar todos os perfis da empresa para diagnostico
    const allProfiles = await requestJson(
      `${supabaseUrl}/rest/v1/access_profile?select=id,code,company_id&company_id=eq.${company.id}`,
      { headers: postgrestHeaders(serviceRoleKey, 'return=representation') }
    );
    process.stderr.write(`  DEBUG: all profiles for company=${JSON.stringify(allProfiles)}\n`);

    throw new Error('Could not find access profiles (admin/manager/viewer) for the company');
  }
  process.stdout.write('✅ Access profiles found\n');

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
        is_active: true,
        access_profile_id: adminProfile.id,
      },
      {
        company_id: company.id,
        auth_user_id: adminId,
        name: 'Admin',
        email: adminEmail,
        is_active: true,
        access_profile_id: adminProfile.id,
      },
      {
        company_id: company.id,
        auth_user_id: managerId,
        name: 'Manager',
        email: managerEmail,
        is_active: true,
        access_profile_id: managerProfile.id,
      },
      {
        company_id: company.id,
        auth_user_id: userId,
        name: 'User',
        email: userEmail,
        is_active: true,
        access_profile_id: viewerProfile.id,
      },
    ],
    onConflict: 'auth_user_id,company_id',
  });
  process.stdout.write('✅ app_users created\n');

  process.stdout.write('\n✨ VidaSystem dev seed applied successfully!\n');
  process.stdout.write(`  - System Admin: ${systemAdminEmail}\n`);
  process.stdout.write(`  - Admin: ${adminEmail}\n`);
  process.stdout.write(`  - Manager: ${managerEmail}\n`);
  process.stdout.write(`  - User: ${userEmail}\n`);
}

module.exports = {
  PROJECT,
  dbReset,
  dbMigrate,
  seedVidaSystemDev,
  ensureDevEnv,
};
