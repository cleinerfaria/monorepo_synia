import { execFileSync } from 'node:child_process';
import { prepareE2eRuntime } from './workflow.mjs';

function ensurePlaywrightDependency() {
  try {
    execFileSync('node', ['-e', "require.resolve('@playwright/test')"], {
      cwd: process.cwd(),
      stdio: 'ignore',
    });
  } catch {
    throw new Error(
      'Dependencia @playwright/test nao encontrada. Rode primeiro: npm run test:e2e:install'
    );
  }
}

try {
  ensurePlaywrightDependency();
  const runtime = await prepareE2eRuntime({ writeEnvFile: true });
  const extraArgs = process.argv.slice(2);

  const env = {
    ...process.env,
    PLAYWRIGHT_BASE_URL: runtime.baseUrl,
    VITE_SUPABASE_URL: runtime.supabaseUrl,
    VITE_SUPABASE_ANON_KEY: runtime.anonKey,
    E2E_ADMIN_EMAIL: runtime.accounts.admin.email,
    E2E_ADMIN_PASSWORD: runtime.accounts.admin.password,
    E2E_MANAGER_EMAIL: runtime.accounts.manager.email,
    E2E_MANAGER_PASSWORD: runtime.accounts.manager.password,
    E2E_USER_EMAIL: runtime.accounts.user.email,
    E2E_USER_PASSWORD: runtime.accounts.user.password,
  };

  execFileSync('npx', ['playwright', 'test', ...extraArgs], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env,
  });
} catch (error) {
  process.stderr.write(`Falha no workflow e2e: ${error.message}\n`);
  process.exit(1);
}
