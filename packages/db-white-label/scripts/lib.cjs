const { execFileSync } = require('node:child_process')
const path = require('node:path')

const PROJECT = 'white-label'
const DB_URL_ENV = 'WHITE_LABEL_DB_URL'
const SUPABASE_URL_ENV = 'WHITE_LABEL_SUPABASE_URL'
const SERVICE_ROLE_ENV = 'WHITE_LABEL_SUPABASE_SERVICE_ROLE_KEY'
const APP_DIR = path.resolve(__dirname, '../../../apps/white-label')

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

async function seedWhiteLabelDev() {
  ensureDevEnv()

  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig()
  const companyDocument = '22.222.222/0001-22'
  const adminEmail = process.env.WHITE_LABEL_E2E_ADMIN_EMAIL || process.env.TEST_USER_EMAIL || 'e2e.admin@whitelabel.local'
  const adminPassword = process.env.WHITE_LABEL_E2E_ADMIN_PASSWORD || process.env.TEST_USER_PASSWORD || 'WhiteLabelE2E!123'

  await upsertRows({
    supabaseUrl,
    serviceRoleKey,
    table: 'company',
    rows: [
      {
        name: 'White Label E2E Tenant',
        trade_name: 'White Label E2E',
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
    throw new Error('Could not resolve White Label company for dev seed')
  }

  const adminProfile = await getSingleRow({
    supabaseUrl,
    serviceRoleKey,
    path: `access_profile?select=id&company_id=eq.${company.id}&code=eq.admin&limit=1`,
  })

  if (!adminProfile?.id) {
    throw new Error('Could not resolve White Label admin access profile for dev seed')
  }

  const adminAuthId = await ensureAuthUser({
    supabaseUrl,
    serviceRoleKey,
    email: adminEmail,
    password: adminPassword,
    name: 'E2E Admin White Label',
  })

  await Promise.all([
    upsertRows({
      supabaseUrl,
      serviceRoleKey,
      table: 'app_user',
      rows: [
        {
          company_id: company.id,
          auth_user_id: adminAuthId,
          name: 'E2E Admin White Label',
          email: adminEmail,
          active: true,
          access_profile_id: adminProfile.id,
        },
      ],
      onConflict: 'auth_user_id,company_id',
    }),
    upsertRows({
      supabaseUrl,
      serviceRoleKey,
      table: 'system_user',
      rows: [
        {
          auth_user_id: adminAuthId,
          is_superadmin: true,
          name: 'E2E Admin White Label',
          email: adminEmail,
        },
      ],
      onConflict: 'auth_user_id',
    }),
  ])

  process.stdout.write(`White Label dev seed applied for company ${company.id}\n`)
}

module.exports = {
  PROJECT,
  dbReset,
  dbMigrate,
  seedWhiteLabelDev,
  ensureDevEnv,
}
