#!/usr/bin/env node
/**
 * Script para criar usuário e dados de teste no Supabase
 * Cria: empresa de teste + usuário Auth + app_user
 */

const { createClient } = require('@supabase/supabase-js')

// Configuração - requer variáveis de ambiente
const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  TEST_USER_EMAIL: process.env.TEST_USER_EMAIL || 'test@example.com',
  TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD || 'Test@1234567890',
  TEST_COMPANY_ID: process.env.TEST_COMPANY_ID || '00000000-0000-0000-0000-000000000001',
}

// Validar variáveis obrigatórias
if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variáveis de ambiente obrigatórias não definidas:')
  console.error('   SUPABASE_URL:', CONFIG.SUPABASE_URL ? '✅' : '❌ não definida')
  console.error(
    '   SUPABASE_SERVICE_ROLE_KEY:',
    CONFIG.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌ não definida'
  )
  console.error('\nDefina as variáveis antes de executar:')
  console.error('  export SUPABASE_URL="https://seu-projeto.supabase.co"')
  console.error('  export SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"')
  process.exit(1)
}

// Retry helper
async function retry(fn, maxAttempts = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxAttempts) throw error
      console.log(`  ↻ Tentativa ${attempt}/${maxAttempts} falhou, aguardando...`)
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
}

async function main() {
  console.log('🔌 Conectando ao Supabase...')
  console.log(`   URL: ${CONFIG.SUPABASE_URL}`)

  const client = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1. Criar empresa de teste (se não existir)
  console.log('\n🏢 Verificando empresa de teste...')
  try {
    const { data: existingCompany } = await retry(() =>
      client.from('company').select('id').eq('id', CONFIG.TEST_COMPANY_ID).single()
    )

    if (!existingCompany) {
      const { error: companyError } = await client.from('company').insert([
        {
          id: CONFIG.TEST_COMPANY_ID,
          name: 'Test Company',
          slug: 'test-company',
          created_at: new Date().toISOString(),
        },
      ])

      if (companyError && !companyError.message.includes('duplicate')) {
        console.warn(`   ⚠️ Erro ao criar empresa: ${companyError.message}`)
      } else {
        console.log('   ✅ Empresa de teste criada')
      }
    } else {
      console.log('   ✅ Empresa já existe')
    }
  } catch (e) {
    console.warn(`   ⚠️ Tabela company pode não existir: ${e.message}`)
  }

  // 2. Criar usuário no Auth
  console.log('\n👤 Criando usuário de teste...')
  let authUserId = null

  const { data: authData, error: authError } = await retry(() =>
    client.auth.admin.createUser({
      email: CONFIG.TEST_USER_EMAIL,
      password: CONFIG.TEST_USER_PASSWORD,
      email_confirm: true,
    })
  )

  if (authError) {
    if (authError.message.includes('already') || authError.message.includes('exists')) {
      console.log('   ⚠️ Usuário já existe no Auth')

      // Buscar ID do usuário existente
      const { data: users } = await client.auth.admin.listUsers()
      const existingUser = users?.users?.find((u) => u.email === CONFIG.TEST_USER_EMAIL)

      if (existingUser) {
        authUserId = existingUser.id
        console.log(`   ✅ Usuário encontrado: ${authUserId}`)
      }
    } else {
      console.error(`   ❌ Erro ao criar usuário: ${authError.message}`)
      process.exit(1)
    }
  } else {
    authUserId = authData.user.id
    console.log(`   ✅ Usuário criado: ${authUserId}`)
  }

  // 3. Criar app_user no banco
  if (authUserId) {
    console.log('\n📝 Verificando app_user...')
    try {
      const { data: existingAppUser } = await client
        .from('app_user')
        .select('id')
        .eq('email', CONFIG.TEST_USER_EMAIL)
        .maybeSingle()

      if (!existingAppUser) {
        const { error: insertError } = await client.from('app_user').insert([
          {
            auth_user_id: authUserId,
            company_id: CONFIG.TEST_COMPANY_ID,
            email: CONFIG.TEST_USER_EMAIL,
            name: 'Test User',
          },
        ])

        if (insertError && !insertError.message.includes('duplicate')) {
          console.warn(`   ⚠️ Erro ao criar app_user: ${insertError.message}`)
        } else {
          console.log('   ✅ app_user criado')
        }
      } else {
        console.log('   ✅ app_user já existe')
      }
    } catch (e) {
      console.warn(`   ⚠️ Tabela app_user pode não existir: ${e.message}`)
    }
  }

  // 4. Validar login
  console.log('\n🔐 Validando login...')
  const { error: loginError } = await client.auth.signInWithPassword({
    email: CONFIG.TEST_USER_EMAIL,
    password: CONFIG.TEST_USER_PASSWORD,
  })

  if (loginError) {
    console.error(`   ❌ Login falhou: ${loginError.message}`)
    process.exit(1)
  }
  console.log('   ✅ Login validado')

  // Resumo
  console.log('\n' + '═'.repeat(50))
  console.log('✨ Setup de teste concluído!')
  console.log('═'.repeat(50))
  console.log(`📧 Email:    ${CONFIG.TEST_USER_EMAIL}`)
  console.log(`🔑 Senha:    ${CONFIG.TEST_USER_PASSWORD}`)
  console.log(`🏢 Empresa:  ${CONFIG.TEST_COMPANY_ID}`)
  console.log('═'.repeat(50))
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err.message)
  process.exit(1)
})
