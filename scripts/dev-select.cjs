#!/usr/bin/env node

const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { stdin, stdout, argv, env, execPath } = require('node:process');

const PROJECTS = [
  {
    aliases: ['1', 'vidasystem'],
    label: 'vidasystem',
    workspace: 'vidasystem',
    packageJsonPath: join(__dirname, '..', 'apps', 'vidasystem', 'package.json'),
  },
  {
    aliases: ['2', 'whitelabel', 'whitelabel', 'wl'],
    label: 'whitelabel',
    workspace: 'whitelabel',
    packageJsonPath: join(__dirname, '..', 'apps', 'whitelabel', 'package.json'),
  },
];

const SCRIPT_FALLBACKS = {
  'test:e2e:ui': { vidasystem: 'test:e2e:headed' },
};
const COMMANDS_WITH_ALL_PROJECTS = new Set(['precommit:check']);
const ALL_PROJECT_ALIASES = new Set(['3', 'all', 'todos']);

const rawArgs = argv.slice(2);
const loweredArgs = rawArgs.map((arg) => arg.toLowerCase());

if (loweredArgs[0] === '--help' || loweredArgs[0] === '-h') {
  showHelp();
  process.exit(0);
}

const rawCommand = rawArgs[0];
const lifecycleCommand = env.npm_lifecycle_event?.toLowerCase();

let command;
let remainingArgs;

if (lifecycleCommand === 'run:project') {
  command = rawCommand;
  remainingArgs = rawArgs.slice(1);
} else if (rawCommand) {
  command = rawCommand;
  remainingArgs = rawArgs.slice(1);
} else if (lifecycleCommand) {
  command = lifecycleCommand;
  remainingArgs = [];
} else {
  command = 'dev';
  remainingArgs = [];
}

if (!command) {
  stderrAndExit('Informe o script para executar. Exemplo: npm run run:project -- test:e2e');
}

const parsed = parseRemainingArgs(remainingArgs);
const projectArg = parsed.projectArg;
const forwardedArgs = parsed.forwardedArgs;

if (projectArg) {
  const normalizedProjectArg = projectArg.toLowerCase();
  if (supportsAllProjects(command) && ALL_PROJECT_ALIASES.has(normalizedProjectArg)) {
    runScriptForAllProjects(command, forwardedArgs);
    return;
  }

  const selectedByArg = PROJECTS.find((project) => project.aliases.includes(normalizedProjectArg));
  if (!selectedByArg) {
    stderrAndExit(`Projeto invalido: ${projectArg}`);
  }
  const workspaceScript = resolveWorkspaceScript(command, selectedByArg);
  runScript(workspaceScript, selectedByArg.workspace, forwardedArgs);
} else {
  askProject(command, forwardedArgs);
}

function askProject(command, forwardedArgs) {
  const allowAllProjects = supportsAllProjects(command);
  stdout.write(`Selecione o projeto para rodar ${command}:\n`);
  PROJECTS.forEach((project, index) => {
    stdout.write(`${index + 1}) ${project.label}\n`);
  });
  if (allowAllProjects) {
    stdout.write(`${PROJECTS.length + 1}) Todos os projetos\n`);
  }

  const rl = createInterface({ input: stdin, output: stdout });
  rl.question(`Digite o numero (1-${PROJECTS.length + (allowAllProjects ? 1 : 0)}): `, (answer) => {
    const normalized = answer.trim().toLowerCase();
    rl.close();

    if (allowAllProjects && ALL_PROJECT_ALIASES.has(normalized)) {
      runScriptForAllProjects(command, forwardedArgs);
      return;
    }

    const selected = PROJECTS.find((project) => project.aliases.includes(normalized));
    if (!selected) {
      if (allowAllProjects) {
        stderrAndExit('Opcao invalida. Use 1 para VidaSystem, 2 para whitelabel ou 3 para todos.');
      }
      stderrAndExit('Opcao invalida. Use 1 para VidaSystem ou 2 para whitelabel.');
    }
    const workspaceScript = resolveWorkspaceScript(command, selected);
    runScript(workspaceScript, selected.workspace, forwardedArgs);
  });
}

function runScript(script, workspace, forwardedArgs, onExit) {
  const npmExecPath = env.npm_execpath;
  if (!npmExecPath) {
    stderrAndExit("Nao foi possivel localizar o executavel do npm. Execute via 'npm run ...'.");
  }

  const spawnArgs = ['run', script, '-w', workspace];
  if (forwardedArgs.length > 0) {
    spawnArgs.push('--', ...forwardedArgs);
  }

  const child = spawn(execPath, [npmExecPath, ...spawnArgs], { stdio: 'inherit' });

  child.on('exit', (code, signal) => {
    if (onExit) {
      onExit(code, signal);
      return;
    }
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

function runScriptForAllProjects(command, forwardedArgs) {
  const queue = PROJECTS.map((project) => ({
    project,
    script: resolveWorkspaceScript(command, project),
  }));

  runQueueIndex(0);

  function runQueueIndex(index) {
    if (index >= queue.length) {
      stdout.write('Todos os projetos finalizaram com sucesso.\n');
      process.exit(0);
      return;
    }

    const current = queue[index];
    stdout.write(
      `[${index + 1}/${queue.length}] Rodando ${command} em ${current.project.label}...\n`
    );
    runScript(current.script, current.project.workspace, forwardedArgs, (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }

      if ((code ?? 1) !== 0) {
        process.exit(code ?? 1);
        return;
      }

      runQueueIndex(index + 1);
    });
  }
}

function stderrAndExit(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function parseRemainingArgs(args) {
  const dashDashIndex = args.indexOf('--');
  const argsBeforeDashDash = dashDashIndex >= 0 ? args.slice(0, dashDashIndex) : args;
  const argsAfterDashDash = dashDashIndex >= 0 ? args.slice(dashDashIndex + 1) : [];

  let projectArg;
  const cleanedBefore = [...argsBeforeDashDash];
  if (cleanedBefore.length > 0 && !cleanedBefore[0].startsWith('-')) {
    projectArg = cleanedBefore.shift();
  }

  return {
    projectArg,
    forwardedArgs: [...cleanedBefore, ...argsAfterDashDash],
  };
}

function resolveWorkspaceScript(command, project) {
  const projectPackageJson = getPackageJson(project.packageJsonPath);
  const projectScripts = projectPackageJson.scripts ?? {};
  const normalizedCommand = command.toLowerCase();
  const projectFallbacks = SCRIPT_FALLBACKS[normalizedCommand] ?? {};
  const fallbackScript = projectFallbacks[project.workspace];
  const candidateScripts = [command, fallbackScript].filter(Boolean);

  const selectedScript = candidateScripts.find((scriptName) => projectScripts[scriptName]);
  if (!selectedScript) {
    stderrAndExit(`O script "${command}" nao existe no projeto ${project.label}.`);
  }

  return selectedScript;
}

function supportsAllProjects(command) {
  return COMMANDS_WITH_ALL_PROJECTS.has(command.toLowerCase());
}

function getPackageJson(packageJsonPath) {
  try {
    return JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  } catch (_error) {
    stderrAndExit(`Nao foi possivel ler o package.json em ${packageJsonPath}`);
  }
}

function showHelp() {
  stdout.write('Uso:\n');
  stdout.write('- npm run dev [-- <projeto>]\n');
  stdout.write('- npm run precommit:check [-- <projeto|all>]\n');
  stdout.write('- npm run test:e2e [-- <projeto>] [-- <args-do-script>]\n');
  stdout.write('- npm run run:project -- <script> [<projeto>] [-- <args-do-script>]\n');
  stdout.write('Projetos: vidasystem | whitelabel | all (somente precommit:check)\n');
}
