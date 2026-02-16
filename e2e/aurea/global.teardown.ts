import { execFileSync } from 'node:child_process';
import path from 'node:path';

export default async function globalTeardown(): Promise<void> {
  const repoRoot = path.resolve(__dirname, '../..');
  const env = {
    ...process.env,
    APP_ENV: process.env.APP_ENV || 'dev',
  };

  // execFileSync('npm', ['run', 'db:reset'], {
  //   cwd: path.resolve(repoRoot, 'apps/aurea'),
  //   stdio: 'inherit',
  //   env,
  //   timeout: 300_000,
  //   shell: true,
  // });
}
