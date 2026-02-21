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
const SUPABASE_ACCESS_TOKEN_ENV = 'SUPABASE_ACCESS_TOKEN';
const PROJECT_REF_ENV = 'WHITELABEL_SUPABASE_PROJECT_REF';
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

async function deployWhiteLabelFunctions() {
  if (!hasSupabaseAccessToken()) {
    process.stdout.write(
      `\n⚠️  Skipping white label edge functions deploy: missing ${SUPABASE_ACCESS_TOKEN_ENV}. Add it to apps/whitelabel/.env.local to enable deploy.\n`
    );
    return;
  }

  const functions = listFunctions();
  if (!functions.length) {
    process.stdout.write('\n⚠️  No white label edge functions found to deploy.\n');
    return;
  }

  const projectRef = resolveProjectRef();
  process.stdout.write(`\n🚀 Deploying white label edge functions (${functions.join(', ')})...\n`);
  for (const fnName of functions) {
    const args = ['functions', 'deploy', fnName, '--project-ref', projectRef, '--workdir', APP_DIR];

    if (fnName === 'manage-user') {
      args.push('--no-verify-jwt');
    }

    await run('supabase', args, {
      timeout: 180_000,
    });
  }
  process.stdout.write('✅ white label edge functions deployed\n');
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
  await seedWhiteLabelDev();
  await runSqlSeed();
  await deployWhiteLabelFunctions();
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

async function ensureDefaultAccessProfiles({ supabaseUrl, serviceRoleKey, companyId }) {
  await requestJson(`${supabaseUrl}/rest/v1/rpc/create_default_access_profiles_for_company`, {
    method: 'POST',
    headers: postgrestHeaders(serviceRoleKey, 'return=representation'),
    body: { company_uuid: companyId },
  });
}

async function getAccessProfilesByCompany({ supabaseUrl, serviceRoleKey, companyId }) {
  const [adminProfile, managerProfile, userProfile] = await Promise.all([
    getSingleRow({
      supabaseUrl,
      serviceRoleKey,
      path: `access_profile?select=id&company_id=eq.${companyId}&code=eq.admin&limit=1`,
    }),
    getSingleRow({
      supabaseUrl,
      serviceRoleKey,
      path: `access_profile?select=id&company_id=eq.${companyId}&code=eq.manager&limit=1`,
    }),
    getSingleRow({
      supabaseUrl,
      serviceRoleKey,
      path: `access_profile?select=id&company_id=eq.${companyId}&code=eq.user&limit=1`,
    }),
  ]);

  return { adminProfile, managerProfile, userProfile };
}

async function ensureWhiteLabelCompany({ supabaseUrl, serviceRoleKey, document }) {
  const existingCompany = await getSingleRow({
    supabaseUrl,
    serviceRoleKey,
    path: `company?select=id,document&document=eq.${encodeURIComponent(document)}&limit=1`,
  });

  if (existingCompany?.id) {
    return existingCompany;
  }

  const createdRows = await requestJson(`${supabaseUrl}/rest/v1/company`, {
    method: 'POST',
    headers: postgrestHeaders(serviceRoleKey, 'return=representation'),
    body: [
      {
        name: 'White Label Dev',
        trade_name: 'White Label Dev',
        document,
      },
    ],
  });

  const createdCompany = Array.isArray(createdRows) ? createdRows[0] || null : createdRows;
  if (!createdCompany?.id) {
    throw new Error('Could not create whitelabel company for dev seed');
  }

  return createdCompany;
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
      name: 'E2E Admin whitelabel',
    }),
    ensureAuthUser({
      supabaseUrl,
      serviceRoleKey,
      email: managerEmail,
      password: managerPassword,
      name: 'E2E Manager whitelabel',
    }),
    ensureAuthUser({
      supabaseUrl,
      serviceRoleKey,
      email: userEmail,
      password: userPassword,
      name: 'E2E User whitelabel',
    }),
  ]);
  process.stdout.write('✅ Auth users criados\n');

  // Garantir company base para criar os app users
  process.stdout.write('\n🔍 Buscando/criando empresa...\n');
  const company = await ensureWhiteLabelCompany({
    supabaseUrl,
    serviceRoleKey,
    document: companyDocument,
  });

  if (!company?.id) {
    throw new Error('Could not resolve whitelabel company for dev seed');
  }
  process.stdout.write('✅ Empresa encontrada\n');

  // Buscar access_profiles
  process.stdout.write('\n🔍 Buscando access_profiles...\n');
  let { adminProfile, managerProfile, userProfile } = await getAccessProfilesByCompany({
    supabaseUrl,
    serviceRoleKey,
    companyId: company.id,
  });

  if (!adminProfile?.id || !managerProfile?.id || !userProfile?.id) {
    await ensureDefaultAccessProfiles({
      supabaseUrl,
      serviceRoleKey,
      companyId: company.id,
    });

    ({ adminProfile, managerProfile, userProfile } = await getAccessProfilesByCompany({
      supabaseUrl,
      serviceRoleKey,
      companyId: company.id,
    }));

    if (!adminProfile?.id || !managerProfile?.id || !userProfile?.id) {
      throw new Error('Could not resolve whitelabel access profiles for dev seed');
    }
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
        name: 'E2E Admin whitelabel',
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
        name: 'E2E Admin whitelabel',
        email: adminEmail,
        active: true,
        access_profile_id: adminProfile.id,
      },
      {
        company_id: company.id,
        auth_user_id: managerId,
        name: 'E2E Manager whitelabel',
        email: managerEmail,
        active: true,
        access_profile_id: managerProfile.id,
      },
      {
        company_id: company.id,
        auth_user_id: userId,
        name: 'E2E User whitelabel',
        email: userEmail,
        active: true,
        access_profile_id: userProfile.id,
      },
    ],
    onConflict: 'auth_user_id,company_id',
  });
  process.stdout.write('✅ app_users criados\n');

  process.stdout.write('\n✨ whitelabel dev seed aplicado com sucesso!\n');
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
