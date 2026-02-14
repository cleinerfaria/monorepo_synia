import { execFileSync } from 'node:child_process'
import path from 'node:path'

export default async function globalSetup(): Promise<void> {
  const repoRoot = path.resolve(__dirname, '../../..')
  const env = {
    ...process.env,
    APP_ENV: process.env.APP_ENV || 'dev',
  }

  execFileSync('npm', ['run', 'db:prepare:test'], {
    cwd: path.resolve(repoRoot, 'apps/aurea'),
    stdio: 'inherit',
    env,
    timeout: 300_000,
  })
}
