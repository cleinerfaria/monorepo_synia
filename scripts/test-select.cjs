#!/usr/bin/env node

const { spawn } = require("node:child_process");
const { createInterface } = require("node:readline");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { stdin, stdout, argv, env, execPath } = require("node:process");

const PROJECTS = [
  {
    aliases: ["1", "aurea"],
    label: "Aurea",
    workspace: "aurea",
    packageJsonPath: join(__dirname, "..", "apps", "aurea", "package.json"),
  },
  {
    aliases: ["2", "white-label", "white_label", "wl"],
    label: "White Label",
    workspace: "white_label",
    packageJsonPath: join(__dirname, "..", "apps", "white-label", "package.json"),
  },
  {
    aliases: ["3", "ambos", "all"],
    label: "Ambos (Aurea + White Label)",
    workspace: null,
    packageJsonPath: null,
  },
];

const rawArgs = argv.slice(2);
const loweredArgs = rawArgs.map((arg) => arg.toLowerCase());

if (loweredArgs[0] === "--help" || loweredArgs[0] === "-h") {
  showHelp();
  process.exit(0);
}

const parsed = parseRemainingArgs(rawArgs);
const projectArg = parsed.projectArg;
const forwardedArgs = parsed.forwardedArgs;

if (projectArg) {
  const selectedByArg = PROJECTS.find((project) => project.aliases.includes(projectArg.toLowerCase()));
  if (!selectedByArg) {
    stderrAndExit(`Projeto invalido: ${projectArg}`);
  }
  runTest(selectedByArg, forwardedArgs);
} else {
  askProject(forwardedArgs);
}

function askProject(forwardedArgs) {
  stdout.write(`Selecione o projeto para rodar testes:\n`);
  PROJECTS.forEach((project, index) => {
    stdout.write(`${index + 1}) ${project.label}\n`);
  });

  const rl = createInterface({ input: stdin, output: stdout });
  rl.question(`Digite o numero (1-${PROJECTS.length}): `, (answer) => {
    const normalized = answer.trim().toLowerCase();
    const selected = PROJECTS.find((project) => project.aliases.includes(normalized));
    rl.close();

    if (!selected) {
      stderrAndExit(`Opcao invalida. Use 1 para Aurea, 2 para White Label ou 3 para Ambos.`);
    }
    runTest(selected, forwardedArgs);
  });
}

function runTest(project, forwardedArgs) {
  if (project.workspace === null) {
    // Rodar ambos
    runBothTests(forwardedArgs);
  } else {
    // Rodar apenas um
    runScript("test:run", project.workspace, forwardedArgs);
  }
}

function runBothTests(forwardedArgs) {
  const npmExecPath = env.npm_execpath;
  if (!npmExecPath) {
    stderrAndExit("Nao foi possivel localizar o executavel do npm. Execute via 'npm run ...'.");
  }

  const spawnArgs = ["run", "test:run", "--workspaces"];
  if (forwardedArgs.length > 0) {
    spawnArgs.push("--", ...forwardedArgs);
  }

  const child = spawn(execPath, [npmExecPath, ...spawnArgs], { stdio: "inherit" });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

function runScript(script, workspace, forwardedArgs) {
  const npmExecPath = env.npm_execpath;
  if (!npmExecPath) {
    stderrAndExit("Nao foi possivel localizar o executavel do npm. Execute via 'npm run ...'.");
  }

  const spawnArgs = ["run", script, "-w", workspace];
  if (forwardedArgs.length > 0) {
    spawnArgs.push("--", ...forwardedArgs);
  }

  const child = spawn(execPath, [npmExecPath, ...spawnArgs], { stdio: "inherit" });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

function stderrAndExit(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function parseRemainingArgs(args) {
  const dashDashIndex = args.indexOf("--");
  const argsBeforeDashDash = dashDashIndex >= 0 ? args.slice(0, dashDashIndex) : args;
  const argsAfterDashDash = dashDashIndex >= 0 ? args.slice(dashDashIndex + 1) : [];

  let projectArg;
  const cleanedBefore = [...argsBeforeDashDash];
  if (cleanedBefore.length > 0 && !cleanedBefore[0].startsWith("-")) {
    projectArg = cleanedBefore.shift();
  }

  return {
    projectArg,
    forwardedArgs: [...cleanedBefore, ...argsAfterDashDash],
  };
}

function showHelp() {
  stdout.write("Uso:\n");
  stdout.write("- npm run test [-- <projeto>]\n");
  stdout.write("Projetos: aurea | white-label | ambos\n");
}
