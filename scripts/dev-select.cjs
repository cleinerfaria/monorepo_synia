#!/usr/bin/env node

const { spawn } = require("node:child_process");
const { createInterface } = require("node:readline");
const { stdin, stdout, argv, env, execPath } = require("node:process");

const PROJECTS = [
  { aliases: ["1", "aurea", "aurea-care"], label: "Aurea", script: "dev:aurea" },
  { aliases: ["2", "white-label", "white_label"], label: "White Label", script: "dev:wl" },
];

const arg = argv[2]?.toLowerCase();
if (arg === "--help" || arg === "-h") {
  stdout.write("Uso: npm run dev [-- <projeto>]\n");
  stdout.write("Projetos: aurea | white-label\n");
  process.exit(0);
}

if (arg) {
  const selectedByArg = PROJECTS.find((project) => project.aliases.includes(arg));
  if (!selectedByArg) {
    stderrAndExit(`Projeto invalido: ${arg}`);
  }
  runScript(selectedByArg.script);
} else {
  askProject();
}

function askProject() {
  stdout.write("Selecione o projeto para iniciar:\n");
  PROJECTS.forEach((project, index) => {
    stdout.write(`${index + 1}) ${project.label}\n`);
  });

  const rl = createInterface({ input: stdin, output: stdout });
  rl.question("Digite o numero (1-2): ", (answer) => {
    const normalized = answer.trim().toLowerCase();
    const selected = PROJECTS.find((project) => project.aliases.includes(normalized));
    rl.close();

    if (!selected) {
      stderrAndExit("Opcao invalida. Use 1 para Aurea ou 2 para White Label.");
    }
    runScript(selected.script);
  });
}

function runScript(script) {
  const npmExecPath = env.npm_execpath;
  if (!npmExecPath) {
    stderrAndExit("Nao foi possivel localizar o executavel do npm.");
  }

  const child = spawn(execPath, [npmExecPath, "run", script], { stdio: "inherit" });

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
