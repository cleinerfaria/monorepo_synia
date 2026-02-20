#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

const targetDirArg = process.argv.find((arg) => arg.startsWith('--target-dir='));
const projectNameArg = process.argv.find((arg) => arg.startsWith('--project-name='));
const targetDir = targetDirArg ? targetDirArg.split('=')[1] : process.cwd();
const projectName = projectNameArg ? projectNameArg.split('=')[1] : null;
const packageJsonPath = path.join(targetDir, 'package.json');

function readPackageVersion() {
  const content = fs.readFileSync(packageJsonPath, 'utf8');
  const pkg = JSON.parse(content);
  return pkg.version;
}

function parseSemver(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function buildVersion({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

function bumpVersion(current, bumpType) {
  const parsed = parseSemver(current);
  if (!parsed) return null;
  if (bumpType === 'major') return buildVersion({ major: parsed.major + 1, minor: 0, patch: 0 });
  if (bumpType === 'minor') return buildVersion({ major: parsed.major, minor: parsed.minor + 1, patch: 0 });
  if (bumpType === 'patch') return buildVersion({ major: parsed.major, minor: parsed.minor, patch: parsed.patch + 1 });
  return null;
}

function isValidVersion(version) {
  return /^\d+\.\d+\.\d+$/.test(version);
}

function runNpmVersion(newVersion) {
  const cmd =
    process.platform === 'win32'
      ? `npm.cmd version ${newVersion} --no-git-tag-version`
      : `npm version ${newVersion} --no-git-tag-version`;
  execSync(cmd, { cwd: targetDir, stdio: 'inherit' });
}

function createGitCommitAndTag(newVersion) {
  const tag = `v${newVersion}`;
  const scopePrefix = projectName ? `(${projectName})` : '';
  const commitMessage = `chore${scopePrefix}: bump version to ${newVersion}`;

  try {
    // Commit das mudanças
    execSync('git add package.json', { cwd: targetDir, stdio: 'inherit' });
    execSync(`git commit -m "${commitMessage}"`, { cwd: targetDir, stdio: 'inherit' });

    // Criar tag
    execSync(`git tag -a ${tag} -m "Release ${tag}"`, { cwd: targetDir, stdio: 'inherit' });

    // Obter branch atual
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: targetDir, encoding: 'utf8' }).trim();

    // Push com tags
    execSync(`git push origin ${currentBranch} --tags`, { cwd: targetDir, stdio: 'inherit' });

    return true;
  } catch (error) {
    console.error(`\nErro ao criar commit e tag: ${error.message}`);
    console.error('Você pode fazer isso manualmente com:');
    console.error(`  git add package.json`);
    console.error(`  git commit -m "chore: bump version to ${newVersion}"`);
    console.error(`  git tag -a v${newVersion} -m "Release v${newVersion}"`);
    console.error(`  git push origin <branch> --tags`);
    return false;
  }
}

async function askBumpType(currentVersion) {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    stdout.write(`\nCurrent version: ${currentVersion}\n`);
    stdout.write('Choose change type:\n');
    stdout.write('1) major (x.0.0)\n');
    stdout.write('2) minor (x.y.0)\n');
    stdout.write('3) patch (x.y.z)\n');
    stdout.write('4) custom (enter version manually)\n');
    stdout.write('5) cancel\n');

    const option = (await rl.question('Option: ')).trim();
    if (option === '5') return { cancelled: true };

    if (option === '4') {
      const custom = (await rl.question('New version (e.g. 2.0.0): ')).trim();
      if (!isValidVersion(custom)) throw new Error('Invalid version. Use x.y.z format.');
      return { targetVersion: custom };
    }

    const map = { 1: 'major', 2: 'minor', 3: 'patch' };
    const bumpType = map[option];
    if (!bumpType) throw new Error('Invalid option.');

    const targetVersion = bumpVersion(currentVersion, bumpType);
    if (!targetVersion) throw new Error(`Could not calculate version from "${currentVersion}".`);
    return { targetVersion };
  } finally {
    rl.close();
  }
}

async function main() {
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`package.json not found in target dir: ${targetDir}`);
  }

  const currentVersion = readPackageVersion();
  const cliArg = process.argv[2]?.startsWith('--') ? undefined : process.argv[2]?.trim();
  let targetVersion;

  if (cliArg) {
    const normalized = cliArg.toLowerCase();
    if (normalized === 'major' || normalized === 'minor' || normalized === 'patch') {
      targetVersion = bumpVersion(currentVersion, normalized);
      if (!targetVersion) throw new Error(`Could not calculate version from "${currentVersion}".`);
    } else if (isValidVersion(cliArg)) {
      targetVersion = cliArg;
    } else {
      throw new Error('Invalid argument. Use major, minor, patch or x.y.z.');
    }
  } else {
    const answer = await askBumpType(currentVersion);
    if (answer.cancelled) {
      stdout.write('Canceled.\n');
      return;
    }
    targetVersion = answer.targetVersion;
  }

  if (targetVersion === currentVersion) {
    throw new Error(`New version (${targetVersion}) is the same as current.`);
  }

  stdout.write(`\nUpdating version: ${currentVersion} -> ${targetVersion}\n`);
  runNpmVersion(targetVersion);
  stdout.write(`Version updated to ${targetVersion}.\n`);

  stdout.write('\nCriando commit e tag do GitHub...\n');
  const success = createGitCommitAndTag(targetVersion);

  if (success) {
    stdout.write(`\n✓ Commit criado, tag v${targetVersion} criada e enviada para GitHub com sucesso!\n`);
  } else {
    stdout.write(`\n⚠ Versão atualizada mas houve erro ao criar commit/tag. Verifique os comandos acima.\n`);
  }
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
