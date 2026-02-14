#!/usr/bin/env node

const { execSync } = require('node:child_process')
const { chmodSync, existsSync } = require('node:fs')
const { join } = require('node:path')

const hooksPath = '.githooks'
const preCommitPath = join(process.cwd(), hooksPath, 'pre-commit')

if (!existsSync(join(process.cwd(), '.git'))) {
  console.log('[hooks] .git não encontrado, setup de hooks ignorado.')
  process.exit(0)
}

try {
  execSync(`git config core.hooksPath ${hooksPath}`, { stdio: 'ignore' })
} catch (error) {
  console.warn('[hooks] Falha ao definir core.hooksPath automaticamente.')
  process.exit(0)
}

if (existsSync(preCommitPath)) {
  try {
    chmodSync(preCommitPath, 0o755)
  } catch (error) {
    // Em alguns ambientes (principalmente Windows), chmod pode não ser necessário.
  }
}

console.log(`[hooks] core.hooksPath configurado para "${hooksPath}".`)
