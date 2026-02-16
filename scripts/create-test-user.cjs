#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  TEST_USER_EMAIL: process.env.TEST_USER_EMAIL || 'test@example.com',
  TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD || 'Test@1234567890',
  TEST_COMPANY_ID: process.env.TEST_COMPANY_ID || '00000000-0000-0000-0000-000000000001',
};

if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

async function retry(fn, maxAttempts = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function ensureCompany(client) {
  try {
    const { data: existingCompany } = await retry(() =>
      client.from('company').select('id').eq('id', CONFIG.TEST_COMPANY_ID).single()
    );

    if (existingCompany) return;

    const { error } = await client.from('company').insert([
      {
        id: CONFIG.TEST_COMPANY_ID,
        name: 'Test Company',
        slug: 'test-company',
        created_at: new Date().toISOString(),
      },
    ]);
    if (error && !error.message.includes('duplicate')) {
      throw error;
    }
  } catch (error) {
    console.warn(`Company bootstrap skipped: ${error.message}`);
  }
}

async function ensureAuthUser(client) {
  const { data, error } = await retry(() =>
    client.auth.admin.createUser({
      email: CONFIG.TEST_USER_EMAIL,
      password: CONFIG.TEST_USER_PASSWORD,
      email_confirm: true,
    })
  );

  if (!error && data?.user?.id) return data.user.id;

  if (error && (error.message.includes('already') || error.message.includes('exists'))) {
    const { data: usersData } = await client.auth.admin.listUsers();
    const existingUser = usersData?.users?.find((user) => user.email === CONFIG.TEST_USER_EMAIL);
    if (existingUser) return existingUser.id;
  }

  throw error || new Error('Unable to create/find auth user.');
}

async function ensureAppUser(client, authUserId) {
  try {
    const { data: existingAppUser } = await client
      .from('app_user')
      .select('id')
      .eq('email', CONFIG.TEST_USER_EMAIL)
      .maybeSingle();

    if (existingAppUser) return;

    const { error } = await client.from('app_user').insert([
      {
        auth_user_id: authUserId,
        company_id: CONFIG.TEST_COMPANY_ID,
        email: CONFIG.TEST_USER_EMAIL,
        name: 'Test User',
      },
    ]);

    if (error && !error.message.includes('duplicate')) {
      throw error;
    }
  } catch (error) {
    console.warn(`app_user bootstrap skipped: ${error.message}`);
  }
}

async function validateLogin(client) {
  const { error } = await client.auth.signInWithPassword({
    email: CONFIG.TEST_USER_EMAIL,
    password: CONFIG.TEST_USER_PASSWORD,
  });

  if (error) throw error;
}

async function main() {
  const client = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  await ensureCompany(client);
  const authUserId = await ensureAuthUser(client);
  await ensureAppUser(client, authUserId);
  await validateLogin(client);

  console.log('Test user setup completed.');
  console.log(`Email: ${CONFIG.TEST_USER_EMAIL}`);
  console.log(`Password: ${CONFIG.TEST_USER_PASSWORD}`);
  console.log(`Company: ${CONFIG.TEST_COMPANY_ID}`);
}

main().catch((error) => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
