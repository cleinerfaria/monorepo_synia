const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const textExtensions = new Set([
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
  '.sql',
  '.txt',
])

const cp1252Reverse = {
  '€': 0x80,
  '‚': 0x82,
  ƒ: 0x83,
  '„': 0x84,
  '…': 0x85,
  '†': 0x86,
  '‡': 0x87,
  ˆ: 0x88,
  '‰': 0x89,
  Š: 0x8a,
  '‹': 0x8b,
  Œ: 0x8c,
  Ž: 0x8e,
  '‘': 0x91,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '•': 0x95,
  '–': 0x96,
  '—': 0x97,
  '˜': 0x98,
  '™': 0x99,
  š: 0x9a,
  '›': 0x9b,
  œ: 0x9c,
  ž: 0x9e,
  Ÿ: 0x9f,
}

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

function getCandidates(files) {
  return files.filter((file) => {
    const ext = path.extname(file)
    return textExtensions.has(ext) && fs.existsSync(file)
  })
}

function toByte(char) {
  const codePoint = char.codePointAt(0)
  if (codePoint <= 0xff) return codePoint
  return cp1252Reverse[char] ?? null
}

function getLineAndColumn(text, index) {
  const before = text.slice(0, index)
  const lines = before.split(/\r?\n/)
  const line = lines.length
  const column = lines[lines.length - 1].length + 1
  return { line, column }
}

function findMojibakeSequences(text) {
  const issues = []

  for (let i = 0; i < text.length; i++) {
    const firstByte = toByte(text[i])
    let continuationLength = 0

    if (firstByte === 0xc2 || firstByte === 0xc3) continuationLength = 1
    else if (firstByte === 0xe2) continuationLength = 2
    else if (firstByte === 0xf0) continuationLength = 3

    if (continuationLength === 0 || i + continuationLength >= text.length) continue

    const bytes = [firstByte]
    let valid = true

    for (let j = 1; j <= continuationLength; j++) {
      const byte = toByte(text[i + j])
      if (byte == null || byte < 0x80 || byte > 0xbf) {
        valid = false
        break
      }
      bytes.push(byte)
    }

    if (!valid) continue

    const raw = text.slice(i, i + continuationLength + 1)
    const decoded = Buffer.from(bytes).toString('utf8')
    const { line, column } = getLineAndColumn(text, i)

    issues.push({ line, column, raw, decoded })
    i += continuationLength
  }

  return issues
}

function formatPreview(value) {
  return JSON.stringify(value).slice(1, -1)
}

function main() {
  let stagedFiles = []
  try {
    stagedFiles = getStagedFiles()
  } catch {
    process.stdout.write('Could not read staged files. Skipping encoding check.\n')
    process.exit(0)
  }

  const filesToCheck = getCandidates(stagedFiles)
  if (filesToCheck.length === 0) {
    process.stdout.write('No staged text files to check encoding.\n')
    process.exit(0)
  }

  const findings = []

  for (const file of filesToCheck) {
    const content = fs.readFileSync(file, 'utf8')
    const issues = findMojibakeSequences(content)
    if (issues.length > 0) findings.push({ file, issues })
  }

  if (findings.length === 0) {
    process.stdout.write('Encoding check passed: no mojibake patterns found.\n')
    process.exit(0)
  }

  process.stderr.write('Encoding check failed: mojibake patterns found in staged files.\n')

  for (const finding of findings) {
    process.stderr.write(`\n${finding.file}\n`)
    for (const issue of finding.issues.slice(0, 5)) {
      process.stderr.write(
        `  ${issue.line}:${issue.column} "${formatPreview(issue.raw)}" -> "${formatPreview(issue.decoded)}"\n`
      )
    }
    if (finding.issues.length > 5) {
      process.stderr.write(`  ... and ${finding.issues.length - 5} more\n`)
    }
  }

  process.exit(1)
}

main()
