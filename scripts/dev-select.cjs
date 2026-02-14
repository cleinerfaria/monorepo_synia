#!/usr/bin/env node

const { spawn } = require("node:child_process");
const { createInterface } = require("node:readline");
const { stdin, stdout, argv, env, execPath } = require("node:process");

const PROJECTS = [
  { aliases: ["1", "aurea"], label: "Aurea", workspace: "aurea" },
  { aliases: ["2", "white-label", "white_label", "wl"], label: "White Label", workspace: "white_label" },
];

const COMMANDS = {
  dev: {
    usage: "npm run dev [-- <projeto>]",
    promptAction: "iniciar",
    workspaceScript: "dev",
  },
  "precommit:check": {
    usage: "npm run precommit:check [-- <projeto>]",
    promptAction: "rodar precommit:check em",
    workspaceScript: "precommit:check",
  },
};

const args = argv.slice(2).map((arg) => arg.toLowerCase());
if (args.includes("--help") || args.includes("-h")) {
  showHelp();
  process.exit(0);
}

const rawCommand = args[0];
const lifecycleCommand = env.npm_lifecycle_event?.toLowerCase();
const commandKey = COMMANDS[rawCommand]
  ? rawCommand
  : COMMANDS[lifecycleCommand]
    ? lifecycleCommand
    : "dev";
const command = COMMANDS[commandKey];
const projectArg = COMMANDS[rawCommand] ? args[1] : args[0];

if (projectArg) {
  const selectedByArg = PROJECTS.find((project) => project.aliases.includes(projectArg));
  if (!selectedByArg) {
    stderrAndExit(`Projeto invalido: ${projectArg}`);
  }
  runScript(command.workspaceScript, selectedByArg.workspace);
} else {
  askProject(command);
}

function askProject(command) {
  stdout.write(`Selecione o projeto para ${command.promptAction}:\n`);
  PROJECTS.forEach((project, index) => {
    stdout.write(`${index + 1}) ${project.label}\n`);
  });

  const rl = createInterface({ input: stdin, output: stdout });
  rl.question(`Digite o numero (1-${PROJECTS.length}): `, (answer) => {
    const normalized = answer.trim().toLowerCase();
    const selected = PROJECTS.find((project) => project.aliases.includes(normalized));
    rl.close();

    if (!selected) {
      stderrAndExit("Opcao invalida. Use 1 para Aurea ou 2 para White Label.");
    }
    runScript(command.workspaceScript, selected.workspace);
  });
}

function runScript(script, workspace) {
  const npmExecPath = env.npm_execpath;
  if (!npmExecPath) {
    stderrAndExit("Nao foi possivel localizar o executavel do npm.");
  }

  const child = spawn(execPath, [npmExecPath, "run", script, "-w", workspace], { stdio: "inherit" });

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

function showHelp() {
  stdout.write("Uso:\n");
  Object.values(COMMANDS).forEach((command) => {
    stdout.write(`- ${command.usage}\n`);
  });
  stdout.write("Projetos: aurea | white-label\n");
}
