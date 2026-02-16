// Load environment variables from root .env.local
const { spawn, execFileSync } = require('node:child_process');
const { createInterface } = require('node:readline');
const path = require('node:path');

require('dotenv').config({ path: path.resolve(__dirname, '../../../.env.local') });

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

async function askConfirmation(message) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    rl.question(`\n⚠️  ${message} (s/n): `, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 's' || answer.toLowerCase() === 'y')
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
  const companyDocument = '11.111.111/0001-11';
  const adminEmail = process.env.E2E_ADMIN_EMAIL || 'e2e.admin@aurea.local';
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'AureaE2E!123';
  const managerEmail = process.env.E2E_MANAGER_EMAIL || 'e2e.manager@aurea.local';
  const managerPassword = process.env.E2E_MANAGER_PASSWORD || 'AureaE2E!123';
  const userEmail = process.env.E2E_USER_EMAIL || 'e2e.user@aurea.local';
  const userPassword = process.env.E2E_USER_PASSWORD || 'AureaE2E!123';

  await upsertRows({
    supabaseUrl,
    serviceRoleKey,
    table: 'company',
    rows: [
      {
        name: 'Aurea E2E Tenant',
        trade_name: 'Aurea E2E',
        document: companyDocument,
      },
    ],
    onConflict: 'document',
  });

  const company = await getSingleRow({
    supabaseUrl,
    serviceRoleKey,
    path: `company?select=id,document&document=eq.${encodeURIComponent(companyDocument)}&limit=1`,
  });

  if (!company?.id) {
    throw new Error('Could not resolve Aurea company for dev seed');
  }

  const adminProfile = await getSingleRow({
    supabaseUrl,
    serviceRoleKey,
    path: 'access_profile?select=id&code=eq.admin&is_system=is.true&limit=1',
  });

  const viewerProfile = await getSingleRow({
    supabaseUrl,
    serviceRoleKey,
    path: 'access_profile?select=id&code=eq.viewer&is_system=is.true&limit=1',
  });

  const managerProfile = await getSingleRow({
    supabaseUrl,
    serviceRoleKey,
    path: 'access_profile?select=id&code=eq.manager&is_system=is.true&limit=1',
  });

  const [adminAuthId, managerAuthId, userAuthId] = await Promise.all([
    ensureAuthUser({
      supabaseUrl,
      serviceRoleKey,
      email: adminEmail,
      password: adminPassword,
      name: 'E2E Admin',
    }),
    ensureAuthUser({
      supabaseUrl,
      serviceRoleKey,
      email: managerEmail,
      password: managerPassword,
      name: 'E2E Manager',
    }),
    ensureAuthUser({
      supabaseUrl,
      serviceRoleKey,
      email: userEmail,
      password: userPassword,
      name: 'E2E User',
    }),
  ]);

  await upsertRows({
    supabaseUrl,
    serviceRoleKey,
    table: 'app_user',
    rows: [
      {
        company_id: company.id,
        auth_user_id: adminAuthId,
        name: 'E2E Admin',
        email: adminEmail,
        role: 'admin',
        active: true,
        access_profile_id: adminProfile?.id || null,
      },
      {
        company_id: company.id,
        auth_user_id: managerAuthId,
        name: 'E2E Manager',
        email: managerEmail,
        role: 'manager',
        active: true,
        access_profile_id: managerProfile?.id || null,
      },
      {
        company_id: company.id,
        auth_user_id: userAuthId,
        name: 'E2E User',
        email: userEmail,
        role: 'viewer',
        active: true,
        access_profile_id: viewerProfile?.id || null,
      },
    ],
    onConflict: 'auth_user_id',
  });

  // Criar System User (Superadmin Bootstrap)
  const systemAdminEmail = 'admin@aurea.local';
  const systemAdminPassword = process.env.E2E_SYSTEM_ADMIN_PASSWORD || 'AureaE2E!123';

  const systemAdminAuthId = await ensureAuthUser({
    supabaseUrl,
    serviceRoleKey,
    email: systemAdminEmail,
    password: systemAdminPassword,
    name: 'Admin Master',
  });

  await upsertRows({
    supabaseUrl,
    serviceRoleKey,
    table: 'system_user',
    rows: [
      {
        auth_user_id: systemAdminAuthId,
        is_superadmin: true,
        name: 'Admin Master',
        email: systemAdminEmail,
      },
    ],
    onConflict: 'auth_user_id',
  });

  // Vincular System User também em app_user para acesso via interface
  await upsertRows({
    supabaseUrl,
    serviceRoleKey,
    table: 'app_user',
    rows: [
      {
        company_id: company.id,
        auth_user_id: systemAdminAuthId,
        name: 'Admin Master',
        email: systemAdminEmail,
        role: 'superadmin',
        active: true,
        access_profile_id: adminProfile?.id || null,
      },
    ],
    onConflict: 'auth_user_id',
  });

  // Note: Professional, patient, and product seeding is now done via seed.sql
  // during migrations. This script now only ensures auth users exist.
  process.stdout.write(`Aurea dev seed: system admin user (1) + app users (3) have been ensured\n`);

  process.stdout.write(`Aurea dev seed applied for company ${company.id}\n`);
}

module.exports = {
  PROJECT,
  dbReset,
  dbMigrate,
  seedAureaDev,
  ensureDevEnv,
};
