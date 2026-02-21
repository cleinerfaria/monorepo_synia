import { execFileSync } from 'node:child_process';
import path from 'node:path';

export default async function globalSetup(): Promise<void> {
  const repoRoot = path.resolve(__dirname, '../..');
  process.env.TEST_USER_EMAIL =
    process.env.TEST_USER_EMAIL ||
    process.env.WHITELABEL_E2E_ADMIN_EMAIL ||
    'e2e.admin@whitelabel.local';
  process.env.TEST_USER_PASSWORD =
    process.env.TEST_USER_PASSWORD ||
    process.env.WHITELABEL_E2E_ADMIN_PASSWORD ||
    'WhiteLabelE2E!123';

  const env = {
    ...process.env,
    APP_ENV: process.env.APP_ENV || 'dev',
  };

  // execFileSync('npm', ['run', 'db:prepare:test'], {
  //   cwd: path.resolve(repoRoot, 'apps/whitelabel'),
  //   stdio: 'inherit',
  //   env,
  //   timeout: 300_000,
  //   shell: true,
  // });
}
