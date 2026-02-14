const { execFileSync } = require('node:child_process')
const path = require('node:path')

const PROJECT = 'aurea'
const DB_URL_ENV = 'AUREA_DB_URL'
const SUPABASE_URL_ENV = 'AUREA_SUPABASE_URL'
const SERVICE_ROLE_ENV = 'AUREA_SUPABASE_SERVICE_ROLE_KEY'
const APP_DIR = path.resolve(__dirname, '../../../apps/aurea')

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function ensureDevEnv() {
  const appEnv = process.env.APP_ENV
  if (!appEnv) {
    throw new Error('Missing required environment variable: APP_ENV')
  }

  if (appEnv !== 'dev') {
    throw new Error(`Seed blocked: APP_ENV must be dev, got ${appEnv}`)
  }
}

function run(command, args, options = {}) {
  execFileSync(command, args, {
    cwd: options.cwd || process.cwd(),
    stdio: 'inherit',
    env: options.env || process.env,
    timeout: options.timeout || 60_000,
  })
}

async function requestJson(url, { method = 'GET', headers = {}, body } = {}) {
  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
    const responseText = await response.text()
    throw new Error(`${method} ${url} failed: ${response.status} ${responseText}`)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

function authHeaders(serviceRoleKey) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  }
}

function postgrestHeaders(serviceRoleKey, prefer = 'return=representation') {
  return {
    ...authHeaders(serviceRoleKey),
    Prefer: prefer,
  }
}

function getDbUrl() {
  return requireEnv(DB_URL_ENV)
}

function getSupabaseConfig() {
  return {
    supabaseUrl: requireEnv(SUPABASE_URL_ENV),
    serviceRoleKey: requireEnv(SERVICE_ROLE_ENV),
  }
}

function dbReset() {
  const dbUrl = getDbUrl()
  run(
    'supabase',
    ['db', 'reset', '--db-url', dbUrl, '--version', '0', '--no-seed', '--yes', '--workdir', APP_DIR],
    { timeout: 180_000 }
  )
}

function dbMigrate() {
  const dbUrl = getDbUrl()
  run(
    'supabase',
    ['db', 'push', '--db-url', dbUrl, '--include-all', '--yes', '--workdir', APP_DIR],
    { timeout: 180_000 }
  )
}

async function ensureAuthUser({ supabaseUrl, serviceRoleKey, email, password, name }) {
  const usersResponse = await requestJson(
    `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`,
    {
      headers: authHeaders(serviceRoleKey),
    }
  )

  const existingUser = usersResponse?.users?.find(
    (user) => (user.email || '').toLowerCase() === email.toLowerCase()
  )

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
    })

    return updated?.id || existingUser.id
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
  })

  if (!created?.id) {
    throw new Error('Could not create auth user for dev seed')
  }

  return created.id
}

async function getSingleRow({ supabaseUrl, serviceRoleKey, path }) {
  const rows = await requestJson(`${supabaseUrl}/rest/v1/${path}`, {
    headers: postgrestHeaders(serviceRoleKey, 'return=representation'),
  })

  return Array.isArray(rows) ? rows[0] || null : rows
}

async function upsertRows({ supabaseUrl, serviceRoleKey, table, rows, onConflict }) {
  if (!rows.length) {
    return
  }

  await requestJson(`${supabaseUrl}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
    method: 'POST',
    headers: postgrestHeaders(serviceRoleKey, 'resolution=merge-duplicates,return=representation'),
    body: rows,
  })
}

async function seedAureaDev() {
  ensureDevEnv()

  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig()
  const companyDocument = '11.111.111/0001-11'
  const adminEmail = process.env.AUREA_E2E_ADMIN_EMAIL || 'e2e.admin@aurea.local'
  const adminPassword = process.env.AUREA_E2E_ADMIN_PASSWORD || 'AureaE2E!123'
  const managerEmail = process.env.AUREA_E2E_MANAGER_EMAIL || 'e2e.manager@aurea.local'
  const managerPassword = process.env.AUREA_E2E_MANAGER_PASSWORD || 'AureaE2E!123'
  const userEmail = process.env.AUREA_E2E_USER_EMAIL || 'e2e.user@aurea.local'
  const userPassword = process.env.AUREA_E2E_USER_PASSWORD || 'AureaE2E!123'

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
  })

  const company = await getSingleRow({
    supabaseUrl,
    serviceRoleKey,
    path: `company?select=id,document&document=eq.${encodeURIComponent(companyDocument)}&limit=1`,
  })

  if (!company?.id) {
    throw new Error('Could not resolve Aurea company for dev seed')
  }

  const adminProfile = await getSingleRow({
    supabaseUrl,
    serviceRoleKey,
    path: 'access_profile?select=id&code=eq.admin&is_system=is.true&limit=1',
  })

  const viewerProfile = await getSingleRow({
    supabaseUrl,
    serviceRoleKey,
    path: 'access_profile?select=id&code=eq.viewer&is_system=is.true&limit=1',
  })

  const managerProfile = await getSingleRow({
    supabaseUrl,
    serviceRoleKey,
    path: 'access_profile?select=id&code=eq.manager&is_system=is.true&limit=1',
  })

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
  ])

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
  })

  await Promise.all([
    upsertRows({
      supabaseUrl,
      serviceRoleKey,
      table: 'client',
      rows: [
        {
          company_id: company.id,
          code: 'E2E-CLI-001',
          type: 'company',
          name: 'E2E Cliente 1',
          active: true,
        },
      ],
      onConflict: 'company_id,code',
    }),
    upsertRows({
      supabaseUrl,
      serviceRoleKey,
      table: 'professional',
      rows: [
        {
          company_id: company.id,
          code: 'E2E-PRO-001',
          name: 'E2E Profissional 1',
          role: 'Nurse',
          active: true,
        },
      ],
      onConflict: 'company_id,code',
    }),
    upsertRows({
      supabaseUrl,
      serviceRoleKey,
      table: 'patient',
      rows: [
        {
          company_id: company.id,
          code: 'E2E-PAT-001',
          name: 'E2E Paciente 1',
          active: true,
        },
      ],
      onConflict: 'company_id,code',
    }),
    upsertRows({
      supabaseUrl,
      serviceRoleKey,
      table: 'product',
      rows: [
        {
          company_id: company.id,
          item_type: 'material',
          code: 'E2E-PRD-001',
          name: 'E2E Produto 1',
          active: true,
        },
      ],
      onConflict: 'company_id,code',
    }),
  ])

  process.stdout.write(`Aurea dev seed applied for company ${company.id}\n`)
}

module.exports = {
  PROJECT,
  dbReset,
  dbMigrate,
  seedAureaDev,
  ensureDevEnv,
}
