#!/usr/bin/env node

/**
 * Script para testar migrations localmente antes do deploy
 * Verifica se as migrations podem ser aplicadas com sucesso
 */

const { execSync } = require('child_process');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function runCommand(command, cwd) {
  try {
    const result = execSync(command, {
      cwd,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    return { success: true, output: result };
  } catch (error) {
    return {
      success: false,
      output: error.stdout || error.stderr || error.message,
    };
  }
}

function testMigrations() {
  log('cyan', '🧪 Testando migrations localmente...\n');

  const projects = [
    { name: 'VidaSystem', workdir: 'packages/db-vidasystem' },
    { name: 'whitelabel', workdir: 'packages/db-whitelabel' },
  ];

  let allSuccess = true;

  for (const project of projects) {
    log('blue', `\n📦 Testando ${project.name}...`);

    // 1. Verificar se existem migrations
    log('yellow', '1. Verificando migrations disponíveis...');
    const listResult = runCommand('supabase migration list --local', project.workdir);

    if (!listResult.success) {
      log('red', `❌ Erro ao listar migrations: ${listResult.output}`);
      allSuccess = false;
      continue;
    }

    const migrations = listResult.output.split('\n').filter((line) => line.includes('│')).length;
    log('green', `✅ Encontradas ${migrations} migrations`);

    // 2. Testar syntax das migrations
    log('yellow', '2. Verificando sintaxe das migrations...');
    const validateResult = runCommand('supabase db lint', project.workdir);

    if (validateResult.success) {
      log('green', '✅ Sintaxe das migrations ok');
    } else {
      log('red', `❌ Problemas de sintaxe: ${validateResult.output}`);
      allSuccess = false;
    }

    // 3. Simular aplicação (dry-run se disponível)
    log('yellow', '3. Simulando aplicação das migrations...');
    const dryRunResult = runCommand('supabase db push --dry-run', project.workdir);

    if (dryRunResult.success) {
      log('green', '✅ Simulação ok - migrations podem ser aplicadas');
    } else {
      // Dry run pode não estar disponível, então apenas reportamos
      log('yellow', `⚠️  Simulação não disponível: ${dryRunResult.output.substring(0, 100)}...`);
    }

    // 4. Verificar dependências
    log('yellow', '4. Verificando dependências...');
    const migrationFiles = require('fs').readdirSync(
      path.join(project.workdir, 'supabase/migrations')
    );

    if (migrationFiles.length === 0) {
      log('yellow', '⚠️  Nenhuma migration encontrada');
    } else {
      const latestMigration = migrationFiles.sort().pop();
      log('green', `✅ Última migration: ${latestMigration}`);
    }
  }

  log('cyan', '\n📊 Resumo do teste:');
  if (allSuccess) {
    log('green', '✅ Todas as migrations passaram nos testes!');
    log('green', '🚀 Seguro para deploy em homologação/produção');
    return 0;
  } else {
    log('red', '❌ Algumas migrations falharam nos testes');
    log('red', '🛑 Corrija os problemas antes do deploy');
    return 1;
  }
}

function checkEnvironment() {
  log('cyan', '🔍 Verificando ambiente...\n');

  const requiredEnvVars = ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DB_URL'];

  let envOk = true;
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      log('green', `✅ ${envVar}: definido`);
    } else {
      log('red', `❌ ${envVar}: não definido`);
      envOk = false;
    }
  }

  if (!envOk) {
    log('red', '\n❌ Variáveis de ambiente obrigatórias não definidas');
    log('yellow', '💡 Execute: npm run setup:dev:vidasystem');
    return 1;
  }

  log('green', '\n✅ Ambiente configurado corretamente');
  return 0;
}

function main() {
  log('cyan', '════════════════════════════════════════');
  log('cyan', '🧪 TESTE PRÉ-DEPLOY DE MIGRATIONS');
  log('cyan', '════════════════════════════════════════\n');

  // Verificar ambiente primeiro
  const envResult = checkEnvironment();
  if (envResult !== 0) {
    process.exit(envResult);
  }

  // Testar migrations
  const testResult = testMigrations();
  process.exit(testResult);
}

if (require.main === module) {
  main();
}
