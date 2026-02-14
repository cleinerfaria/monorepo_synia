#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

const ROOT = path.resolve(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(ROOT, 'package.json');

function readPackageVersion() {
  const content = fs.readFileSync(PACKAGE_JSON_PATH, 'utf8');
  const pkg = JSON.parse(content);
  return pkg.version;
}

function parseSemver(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!match) {
    return null;
  }

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
  if (!parsed) {
    return null;
  }

  if (bumpType === 'major') {
    return buildVersion({ major: parsed.major + 1, minor: 0, patch: 0 });
  }

  if (bumpType === 'minor') {
    return buildVersion({ major: parsed.major, minor: parsed.minor + 1, patch: 0 });
  }

  if (bumpType === 'patch') {
    return buildVersion({ major: parsed.major, minor: parsed.minor, patch: parsed.patch + 1 });
  }

  return null;
}

function isValidVersion(version) {
  return /^\d+\.\d+\.\d+$/.test(version);
}

function runNpmVersion(newVersion) {
  const commands =
    process.platform === 'win32'
      ? [
          `npm version ${newVersion} --no-git-tag-version`,
          `npm.cmd version ${newVersion} --no-git-tag-version`,
        ]
      : [`npm version ${newVersion} --no-git-tag-version`];

  let lastError = null;

  for (const command of commands) {
    try {
      execSync(command, {
        cwd: ROOT,
        stdio: 'inherit',
      });
      return;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }
}

async function askBumpType(currentVersion) {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    stdout.write(`\nVersao atual: ${currentVersion}\n`);
    stdout.write('Escolha o tipo de mudanca:\n');
    stdout.write('1) major (x.0.0)\n');
    stdout.write('2) minor (x.y.0)\n');
    stdout.write('3) patch (x.y.z)\n');
    stdout.write('4) custom (informar versao manualmente)\n');
    stdout.write('5) cancelar\n');

    const option = (await rl.question('Opcao: ')).trim();

    if (option === '5') {
      return { cancelled: true };
    }

    if (option === '4') {
      const custom = (await rl.question('Informe a nova versao (ex: 2.0.0): ')).trim();
      if (!isValidVersion(custom)) {
        throw new Error('Versao invalida. Use o formato x.y.z (ex: 2.0.0).');
      }
      return { targetVersion: custom };
    }

    const map = {
      1: 'major',
      2: 'minor',
      3: 'patch',
    };

    const bumpType = map[option];
    if (!bumpType) {
      throw new Error('Opcao invalida.');
    }

    const targetVersion = bumpVersion(currentVersion, bumpType);
    if (!targetVersion) {
      throw new Error(`Nao foi possivel calcular a versao a partir de "${currentVersion}".`);
    }

    return { targetVersion };
  } finally {
    rl.close();
  }
}

async function main() {
  const currentVersion = readPackageVersion();
  const cliArg = process.argv[2]?.trim();

  let targetVersion;

  if (cliArg) {
    const normalizedType = cliArg.toLowerCase();
    if (normalizedType === 'major' || normalizedType === 'minor' || normalizedType === 'patch') {
      targetVersion = bumpVersion(currentVersion, normalizedType);
      if (!targetVersion) {
        throw new Error(`Nao foi possivel calcular a versao a partir de "${currentVersion}".`);
      }
    } else if (isValidVersion(cliArg)) {
      targetVersion = cliArg;
    } else {
      throw new Error('Argumento invalido. Use major, minor, patch ou x.y.z.');
    }
  } else {
    const answer = await askBumpType(currentVersion);
    if (answer.cancelled) {
      stdout.write('Operacao cancelada.\n');
      return;
    }
    targetVersion = answer.targetVersion;
  }

  if (targetVersion === currentVersion) {
    throw new Error(`A nova versao (${targetVersion}) e igual a versao atual.`);
  }

  stdout.write(`\nAtualizando versao: ${currentVersion} -> ${targetVersion}\n`);

  try {
    runNpmVersion(targetVersion);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Falha ao atualizar a versao. Detalhe: ${detail}`);
  }

  stdout.write(`Versao atualizada com sucesso para ${targetVersion}.\n`);
}

main().catch((error) => {
  console.error(`Erro: ${error.message}`);
  process.exit(1);
});
