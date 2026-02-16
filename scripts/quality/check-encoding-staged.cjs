const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

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
]);

const mojibakePattern = /(Ã.|Â.|â.|ð.|�)/g;

function getStagedFiles() {
  const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return output
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean);
}

function getCandidates(files) {
  return files.filter((file) => {
    const ext = path.extname(file);
    return textExtensions.has(ext) && fs.existsSync(file);
  });
}

function getLineAndColumn(text, index) {
  const before = text.slice(0, index);
  const lines = before.split(/\r?\n/);
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;
  return { line, column };
}

function findMojibakeSequences(text) {
  const issues = [];
  let match;
  while ((match = mojibakePattern.exec(text)) !== null) {
    const { line, column } = getLineAndColumn(text, match.index);
    issues.push({
      line,
      column,
      raw: match[0],
      decoded: 'suspicious-encoding-sequence',
    });
  }
  return issues;
}

function formatPreview(value) {
  return JSON.stringify(value).slice(1, -1);
}

function main() {
  let stagedFiles = [];
  try {
    stagedFiles = getStagedFiles();
  } catch {
    process.stdout.write('Could not read staged files. Skipping encoding check.\n');
    process.exit(0);
  }

  const filesToCheck = getCandidates(stagedFiles);
  if (filesToCheck.length === 0) {
    process.stdout.write('No staged text files to check encoding.\n');
    process.exit(0);
  }

  const findings = [];

  for (const file of filesToCheck) {
    const content = fs.readFileSync(file, 'utf8');
    const issues = findMojibakeSequences(content);
    if (issues.length > 0) findings.push({ file, issues });
  }

  if (findings.length === 0) {
    process.stdout.write('Encoding check passed: no mojibake patterns found.\n');
    process.exit(0);
  }

  process.stderr.write('Encoding check failed: mojibake patterns found in staged files.\n');

  for (const finding of findings) {
    process.stderr.write(`\n${finding.file}\n`);
    for (const issue of finding.issues.slice(0, 5)) {
      process.stderr.write(
        `  ${issue.line}:${issue.column} "${formatPreview(issue.raw)}" -> "${formatPreview(issue.decoded)}"\n`
      );
    }
    if (finding.issues.length > 5) {
      process.stderr.write(`  ... and ${finding.issues.length - 5} more\n`);
    }
  }

  process.exit(1);
}

main();
