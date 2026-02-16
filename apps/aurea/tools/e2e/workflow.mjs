import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_BASE_URL = 'http://127.0.0.1:4173';
const DEFAULT_ADMIN_EMAIL = 'e2e.admin@aurea.local';
const DEFAULT_ADMIN_PASSWORD = 'AureaE2E!123';
const DEFAULT_ADMIN_NAME = 'E2E Admin';
const DEFAULT_MANAGER_EMAIL = 'e2e.manager@aurea.local';
const DEFAULT_MANAGER_PASSWORD = 'AureaE2E!123';
const DEFAULT_MANAGER_NAME = 'E2E Manager';
const DEFAULT_USER_EMAIL = 'e2e.user@aurea.local';
const DEFAULT_USER_PASSWORD = 'AureaE2E!123';
const DEFAULT_USER_NAME = 'E2E User';

function run(command, args, { capture = false, env = process.env } = {}) {
  return execFileSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    env,
  });
}

function readRemoteConfig() {
  const supabaseUrl = process.env.SUPABASE_DEV_URL;
  const anonKey = process.env.SUPABASE_DEV_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_DEV_SERVICE_ROLE_KEY;
  const dbUrl = process.env.SUPABASE_DEV_DB_URL;
  const skipMigrations = process.env.E2E_SKIP_MIGRATIONS === 'true';
  const skipSeed = process.env.E2E_SKIP_SEED === 'true';

  if (!supabaseUrl) {
    throw new Error('Variavel obrigatoria ausente: SUPABASE_DEV_URL');
  }

  if (!anonKey) {
    throw new Error('Variavel obrigatoria ausente: SUPABASE_DEV_ANON_KEY');
  }

  if (!serviceRoleKey) {
    throw new Error('Variavel obrigatoria ausente: SUPABASE_DEV_SERVICE_ROLE_KEY');
  }

  if (!skipMigrations && !dbUrl) {
    throw new Error(
      'Variavel obrigatoria ausente: SUPABASE_DEV_DB_URL (necessaria para aplicar migrations).'
    );
  }

  return {
    supabaseUrl,
    anonKey,
    serviceRoleKey,
    dbUrl,
    skipMigrations,
    skipSeed,
    companyId: process.env.E2E_COMPANY_ID || null,
  };
}

async function requestJson(url, { method = 'GET', headers = {}, body } = {}) {
  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`${method} ${url} falhou: ${response.status} ${responseText}`);
  }

  if (response.status === 204) return null;

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
    const updatedUser = await requestJson(`${supabaseUrl}/auth/v1/admin/users/${existingUser.id}`, {
      method: 'PUT',
      headers: authHeaders(serviceRoleKey),
      body: {
        password,
        email_confirm: true,
        user_metadata: {
          name,
        },
      },
    });

    return updatedUser?.id || existingUser.id;
  }

  const createdUser = await requestJson(`${supabaseUrl}/auth/v1/admin/users`, {
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

  if (!createdUser?.id) {
    throw new Error('Nao foi possivel criar usuario de teste no Supabase Auth.');
  }

  return createdUser.id;
}

async function ensureAppUser({
  supabaseUrl,
  serviceRoleKey,
  authUserId,
  email,
  name,
  companyId,
  role = 'admin',
}) {
  let resolvedCompanyId = companyId;

  if (resolvedCompanyId) {
    const companyRows = await requestJson(
      `${supabaseUrl}/rest/v1/company?select=id&id=eq.${encodeURIComponent(resolvedCompanyId)}&limit=1`,
      {
        headers: postgrestHeaders(serviceRoleKey),
      }
    );

    if (!Array.isArray(companyRows) || companyRows.length === 0) {
      throw new Error(`E2E_COMPANY_ID nao encontrado: ${resolvedCompanyId}`);
    }
  } else {
    const companyRows = await requestJson(
      `${supabaseUrl}/rest/v1/company?select=id&order=created_at.asc&limit=1`,
      {
        headers: postgrestHeaders(serviceRoleKey),
      }
    );

    if (!Array.isArray(companyRows) || companyRows.length === 0) {
      throw new Error('Nenhuma company encontrada no banco remoto de desenvolvimento.');
    }

    resolvedCompanyId = companyRows[0].id;
  }

  const profileRows = await requestJson(
    `${supabaseUrl}/rest/v1/access_profile?select=id&code=eq.${encodeURIComponent(role)}&is_system=is.true&limit=1`,
    {
      headers: postgrestHeaders(serviceRoleKey),
    }
  );

  const payload = {
    company_id: resolvedCompanyId,
    auth_user_id: authUserId,
    name,
    email,
    role,
    access_profile_id: profileRows?.[0]?.id || null,
    active: true,
  };

  await requestJson(`${supabaseUrl}/rest/v1/app_user?on_conflict=auth_user_id`, {
    method: 'POST',
    headers: postgrestHeaders(serviceRoleKey, 'resolution=merge-duplicates,return=representation'),
    body: [payload],
  });

  return resolvedCompanyId;
}

function applyRemoteMigrations(dbUrl) {
  run('supabase', ['db', 'push', '--db-url', dbUrl, '--include-all', '--yes', '--workdir', '.']);
}

function writeRuntimeEnvFile({ baseUrl, supabaseUrl, anonKey, accounts }) {
  const targetDir = path.resolve(process.cwd(), 'e2e');
  mkdirSync(targetDir, { recursive: true });

  const contents = [
    `PLAYWRIGHT_BASE_URL=${baseUrl}`,
    `VITE_SUPABASE_URL=${supabaseUrl}`,
    `VITE_SUPABASE_ANON_KEY=${anonKey}`,
    `E2E_ADMIN_EMAIL=${accounts.admin.email}`,
    `E2E_ADMIN_PASSWORD=${accounts.admin.password}`,
    `E2E_MANAGER_EMAIL=${accounts.manager.email}`,
    `E2E_MANAGER_PASSWORD=${accounts.manager.password}`,
    `E2E_USER_EMAIL=${accounts.user.email}`,
    `E2E_USER_PASSWORD=${accounts.user.password}`,
    '',
  ].join('\n');

  writeFileSync(path.join(targetDir, '.env.runtime'), contents, { encoding: 'utf8' });
}

async function prepareAccount({ account, remoteConfig }) {
  const authUserId = await ensureAuthUser({
    supabaseUrl: remoteConfig.supabaseUrl,
    serviceRoleKey: remoteConfig.serviceRoleKey,
    email: account.email,
    password: account.password,
    name: account.name,
  });

  const resolvedCompanyId = await ensureAppUser({
    supabaseUrl: remoteConfig.supabaseUrl,
    serviceRoleKey: remoteConfig.serviceRoleKey,
    authUserId,
    email: account.email,
    name: account.name,
    companyId: remoteConfig.companyId,
    role: account.role,
  });

  return resolvedCompanyId;
}

async function upsertRows({ supabaseUrl, serviceRoleKey, table, rows, onConflict }) {
  if (!rows.length) return;

  await requestJson(
    `${supabaseUrl}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`,
    {
      method: 'POST',
      headers: postgrestHeaders(serviceRoleKey, 'resolution=merge-duplicates,return=minimal'),
      body: rows,
    }
  );
}

async function seedE2eData({ supabaseUrl, serviceRoleKey, companyId }) {
  const clients = [
    {
      company_id: companyId,
      code: 'E2E-CLI-001',
      type: 'company',
      name: 'E2E Cliente Alpha',
      active: true,
    },
    {
      company_id: companyId,
      code: 'E2E-CLI-002',
      type: 'insurer',
      name: 'E2E Cliente Beta',
      active: true,
    },
    {
      company_id: companyId,
      code: 'E2E-CLI-003',
      type: 'individual',
      name: 'E2E Cliente Gama',
      active: true,
    },
  ];

  const professionals = [
    {
      company_id: companyId,
      code: 'E2E-PRO-001',
      name: 'E2E Profissional Ana',
      role: 'Enfermeira',
      active: true,
    },
    {
      company_id: companyId,
      code: 'E2E-PRO-002',
      name: 'E2E Profissional Bruno',
      role: 'Fisioterapeuta',
      active: true,
    },
  ];

  const patients = [
    {
      company_id: companyId,
      code: 'E2E-PAT-001',
      name: 'E2E Paciente Carlos',
      active: true,
    },
    {
      company_id: companyId,
      code: 'E2E-PAT-002',
      name: 'E2E Paciente Daniela',
      active: true,
    },
  ];

  const products = [
    {
      company_id: companyId,
      item_type: 'material',
      code: 'E2E-PRD-001',
      name: 'E2E Produto Luva',
      active: true,
    },
    {
      company_id: companyId,
      item_type: 'medication',
      code: 'E2E-PRD-002',
      name: 'E2E Produto Dipirona',
      active: true,
    },
  ];

  await Promise.all([
    upsertRows({
      supabaseUrl,
      serviceRoleKey,
      table: 'client',
      rows: clients,
      onConflict: 'company_id,code',
    }),
    upsertRows({
      supabaseUrl,
      serviceRoleKey,
      table: 'professional',
      rows: professionals,
      onConflict: 'company_id,code',
    }),
    upsertRows({
      supabaseUrl,
      serviceRoleKey,
      table: 'patient',
      rows: patients,
      onConflict: 'company_id,code',
    }),
    upsertRows({
      supabaseUrl,
      serviceRoleKey,
      table: 'product',
      rows: products,
      onConflict: 'company_id,code',
    }),
  ]);
}

export async function prepareE2eRuntime({ writeEnvFile = true } = {}) {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || DEFAULT_BASE_URL;
  const remoteConfig = readRemoteConfig();
  const accounts = {
    admin: {
      email: process.env.E2E_ADMIN_EMAIL || process.env.E2E_USER_EMAIL || DEFAULT_ADMIN_EMAIL,
      password:
        process.env.E2E_ADMIN_PASSWORD || process.env.E2E_USER_PASSWORD || DEFAULT_ADMIN_PASSWORD,
      name: process.env.E2E_ADMIN_NAME || DEFAULT_ADMIN_NAME,
      role: 'admin',
    },
    manager: {
      email: process.env.E2E_MANAGER_EMAIL || DEFAULT_MANAGER_EMAIL,
      password: process.env.E2E_MANAGER_PASSWORD || DEFAULT_MANAGER_PASSWORD,
      name: process.env.E2E_MANAGER_NAME || DEFAULT_MANAGER_NAME,
      role: 'manager',
    },
    user: {
      email: process.env.E2E_USER_EMAIL || DEFAULT_USER_EMAIL,
      password: process.env.E2E_USER_PASSWORD || DEFAULT_USER_PASSWORD,
      name: process.env.E2E_USER_NAME || DEFAULT_USER_NAME,
      role: 'viewer',
    },
  };

  if (!remoteConfig.skipMigrations) {
    applyRemoteMigrations(remoteConfig.dbUrl);
  }

  const resolvedCompanyId = await prepareAccount({
    account: accounts.admin,
    remoteConfig,
  });

  await Promise.all([
    prepareAccount({
      account: accounts.manager,
      remoteConfig: {
        ...remoteConfig,
        companyId: resolvedCompanyId,
      },
    }),
    prepareAccount({
      account: accounts.user,
      remoteConfig: {
        ...remoteConfig,
        companyId: resolvedCompanyId,
      },
    }),
  ]);

  if (!remoteConfig.skipSeed) {
    await seedE2eData({
      supabaseUrl: remoteConfig.supabaseUrl,
      serviceRoleKey: remoteConfig.serviceRoleKey,
      companyId: resolvedCompanyId,
    });
  }

  const publicRuntime = {
    baseUrl,
    supabaseUrl: remoteConfig.supabaseUrl,
    anonKey: remoteConfig.anonKey,
    email: accounts.admin.email,
    password: accounts.admin.password,
    accounts,
    seeded: !remoteConfig.skipSeed,
    companyId: resolvedCompanyId,
  };

  if (writeEnvFile) {
    writeRuntimeEnvFile(publicRuntime);
  }

  return publicRuntime;
}
