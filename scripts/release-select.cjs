#!/usr/bin/env node

const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const { join } = require('node:path');
const { stdin, stdout, argv, execPath, env } = require('node:process');

const PROJECTS = [
  {
    aliases: ['1', 'vidasystem'],
    label: 'vidasystem',
    dir: join(__dirname, '..', 'apps', 'vidasystem'),
  },
  {
    aliases: ['2', 'whitelabel', 'whitelabel', 'wl'],
    label: 'White Label',
    dir: join(__dirname, '..', 'apps', 'whitelabel'),
  },
];

const rawArgs = argv.slice(2);
const loweredArgs = rawArgs.map((arg) => arg.toLowerCase());

if (loweredArgs[0] === '--help' || loweredArgs[0] === '-h') {
  showHelp();
  process.exit(0);
}

const projectArg = rawArgs[0];

if (projectArg) {
  const normalizedProjectArg = projectArg.toLowerCase();
  const selected = PROJECTS.find((project) => project.aliases.includes(normalizedProjectArg));

  if (!selected) {
    stderrAndExit(`Projeto inválido: ${projectArg}`);
  }

  runRelease(selected);
} else {
  askProject();
}

function askProject() {
  stdout.write('Selecione o projeto para fazer release:\n');
  PROJECTS.forEach((project, index) => {
    stdout.write(`${index + 1}) ${project.label}\n`);
  });

  const rl = createInterface({ input: stdin, output: stdout });
  rl.question(`Digite o número (1-${PROJECTS.length}): `, (answer) => {
    const normalized = answer.trim().toLowerCase();
    rl.close();

    const selected = PROJECTS.find((project) => project.aliases.includes(normalized));
    if (!selected) {
      stderrAndExit('Opção inválida. Use 1 para VidaSystem ou 2 para White Label.');
    }

    runRelease(selected);
  });
}

function runRelease(project) {
  stdout.write(`\nIniciando release para ${project.label}...\n\n`);
  const bumpScriptPath = join(__dirname, 'bump-version.cjs');

  const child = spawn(
    execPath,
    [bumpScriptPath, `--target-dir=${project.dir}`, `--project-name=${project.label}`],
    {
      stdio: 'inherit',
    }
  );

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });

  child.on('error', (error) => {
    stderrAndExit(`Erro ao executar release: ${error.message}`);
  });
}

function stderrAndExit(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function showHelp() {
  stdout.write('Uso:\n');
  stdout.write('- npm run release\n');
  stdout.write('- npm run release vidasystem\n');
  stdout.write('- npm run release whitelabel\n');
  stdout.write('Projetos: vidasystem | whitelabel | whitelabel | wl\n');
}
