#!/usr/bin/env node

/**
 * Setup Development Environment
 *
 * Este script automatiza o setup de desenvolvimento local:
 * 1. Verifica/inicia Supabase localmente
 * 2. Aguarda Supabase ficar pronto
 * 3. Reseta e popula o banco de dados
 * 4. Exibe informações úteis para desenvolvimento
 *
 * Uso:
 *   node scripts/setup-dev.cjs [vidasystem|whitelabel|all]
 */

const { execSync, spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const PROJECTS = ['vidasystem', 'whitelabel'];
const DEFAULT_PROJECT = 'vidasystem';
const SUPABASE_API_PORT = 54321;
const SUPABASE_DB_PORT = 54322;
const SUPABASE_STUDIO_PORT = 54323;
const MAX_RETRIES = 30; // 30 segundos
const RETRY_INTERVAL = 1000; // 1 segundo

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'bright');
  log(`  ${title}`, 'bright');
  log(`${'='.repeat(60)}\n`, 'bright');
}

function logSuccess(msg) {
  log(`✅ ${msg}`, 'green');
}

function logWarning(msg) {
  log(`⚠️  ${msg}`, 'yellow');
}

function logInfo(msg) {
  log(`ℹ️  ${msg}`, 'blue');
}

function logError(msg) {
  log(`❌ ${msg}`, 'red');
}

function isSupabaseRunning() {
  try {
    execSync('npx supabase status', {
      stdio: 'pipe',
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}

async function waitForSupabase() {
  logInfo('Aguardando Supabase ficar pronto...');

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = await fetch(`http://localhost:${SUPABASE_API_PORT}/health`, {
        timeout: 2000,
      });

      if (response.ok) {
        logSuccess(`Supabase disponível em http://localhost:${SUPABASE_API_PORT}`);
        return true;
      }
    } catch {
      // Continua tentando
    }

    if (i < MAX_RETRIES - 1) {
      process.stdout.write('.');
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
    }
  }

  throw new Error(
    'Timeout aguardando Supabase inicializar. ' +
      'Tente rodar `npx supabase start` manualmente e verifique os logs.'
  );
}

function startSupabase() {
  logInfo('Iniciando Supabase...');

  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['supabase', 'start'], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            'Supabase falhou ao iniciar.\n\n' +
              'Possível causa: Docker Desktop não instalado ou não rodando.\n\n' +
              'Solução:\n' +
              '  1. Instale Docker Desktop: https://www.docker.com/products/docker-desktop\n' +
              '  2. Reinicie sua máquina\n' +
              '  3. Abra Docker Desktop (procure o ícone na system tray)\n' +
              '  4. Tente novamente: npm run setup:dev:vidasystem'
          )
        );
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

function setupDatabase(project) {
  if (!PROJECTS.includes(project)) {
    throw new Error(`Projeto inválido: ${project}. Use: ${PROJECTS.join(', ')}`);
  }

  logInfo(`Resetando banco para ${project}...`);
  execSync(`npm run db:reset:${project}`, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
  });

  logSuccess(`Banco resetado para ${project}`);

  logInfo(`Populando banco com dados de exemplo para ${project}...`);
  execSync(`npm run db:seed:dev:${project}`, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
  });

  logSuccess(`Banco populado para ${project}`);
}

function displaySetupInfo() {
  logSection('🎉 Setup Completo!');

  log('URLs de acesso:', 'bright');
  log(`  API:        http://localhost:${SUPABASE_API_PORT}`, 'blue');
  log(`  Studio:     http://localhost:${SUPABASE_STUDIO_PORT}`, 'blue');
  log(`  DB:         localhost:${SUPABASE_DB_PORT}`, 'blue');

  log('\nPróximos passos:', 'bright');
  log(`  1. Verifique/atualize o .env.local da sua app:`, 'dim');
  log(`     cp apps/vidasystem/.env.example apps/vidasystem/.env.local`, 'dim');
  log(`     (ou whitelabel/.env.local)`, 'dim');

  log(`\n  2. Inicie o desenvolvimento:`, 'dim');
  log(`     npm run dev:vidasystem`, 'dim');
  log(`     ou`, 'dim');
  log(`     npm run dev:wl`, 'dim');

  log(`\n  3. Parar Supabase quando terminar:`, 'dim');
  log(`     npx supabase stop`, 'dim');

  log(`\nCredenciais padrão para E2E:`, 'bright');
  log(`  Admin:   e2e.admin@vidasystem.local / Vida123`, 'dim');
  log(`  Manager: e2e.manager@vidasystem.local / Vida123`, 'dim');
  log(`  User:    e2e.user@vidasystem.local / Vida123`, 'dim');

  log('');
}

async function main() {
  try {
    logSection('🚀 Setup de Desenvolvimento Local');

    // Parse argumentos
    const projectArg = process.argv[2] || DEFAULT_PROJECT;
    const projectsToSetup =
      projectArg === 'all'
        ? PROJECTS
        : projectArg === 'vidasystem'
          ? ['vidasystem']
          : projectArg === 'whitelabel'
            ? ['whitelabel']
            : (() => {
                throw new Error(`Projeto inválido: ${projectArg}`);
              })();

    // 1. Verificar/iniciar Supabase
    logSection('1️⃣  Verificando Supabase');

    if (isSupabaseRunning()) {
      logSuccess('Supabase já está rodando');
    } else {
      logWarning('Supabase não está rodando, iniciando...');
      await startSupabase();
    }

    // 2. Aguardar Supabase ficar pronto
    logSection('2️⃣  Aguardando Supabase');
    await waitForSupabase();

    // 3. Setup de banco de dados
    logSection('3️⃣  Configurando Banco de Dados');
    for (const project of projectsToSetup) {
      setupDatabase(project);
      logInfo('');
    }

    // 4. Exibir informações
    displaySetupInfo();
  } catch (error) {
    logError(`Erro durante setup: ${error.message}`);
    process.exit(1);
  }
}

main();
