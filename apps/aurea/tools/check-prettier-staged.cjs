const { execSync, spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const prettierExts = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.json',
  '.css',
  '.scss',
  '.md',
  '.html',
  '.yml',
  '.yaml',
])

function getStagedFiles() {
  const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  return output
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean)
}

function getPrettierCandidates(files) {
  return files.filter((file) => {
    const ext = path.extname(file)
    return prettierExts.has(ext) && fs.existsSync(file)
  })
}

function main() {
  let stagedFiles = []
  try {
    stagedFiles = getStagedFiles()
  } catch {
    process.stdout.write('Could not read staged files. Skipping staged prettier check.\n')
    process.exit(0)
  }

  const filesToCheck = getPrettierCandidates(stagedFiles)
  if (filesToCheck.length === 0) {
    process.stdout.write('No staged files to check with Prettier.\n')
    process.exit(0)
  }

  const prettierBin = require.resolve('prettier/bin/prettier.cjs')
  const result = spawnSync(process.execPath, [prettierBin, '--check', ...filesToCheck], {
    stdio: 'inherit',
  })

  process.exit(result.status ?? 1)
}

main()
