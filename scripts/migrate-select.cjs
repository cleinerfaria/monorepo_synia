#!/usr/bin/env node

const { spawn } = require("node:child_process");
const { createInterface } = require("node:readline");
const { stdin, stdout, env, execPath } = require("node:process");

const PROJECTS = [
  {
    aliases: ["1", "aurea"],
    label: "Aurea",
    workspace: "@synia/db-aurea",
    script: "db:migrate:aurea",
  },
  {
    aliases: ["2", "white-label", "white_label", "wl"],
    label: "White Label",
    workspace: "@synia/db-white-label",
    script: "db:migrate:white-label",
  },
];

function askProject() {
  stdout.write("\nSelecione o projeto para executar a migration:\n");
  PROJECTS.forEach((project, index) => {
    stdout.write(`${index + 1}) ${project.label}\n`);
  });

  const rl = createInterface({ input: stdin, output: stdout });
  rl.question(`Digite o numero (1-${PROJECTS.length}): `, (answer) => {
    const normalized = answer.trim().toLowerCase();
    const selected = PROJECTS.find((project) => project.aliases.includes(normalized));
    rl.close();

    if (!selected) {
      process.stderr.write("Opcao invalida. Use 1 para Aurea ou 2 para White Label.\n");
      process.exit(1);
    }

    runMigration(selected);
  });
}

function runMigration(project) {
  stdout.write(`\n▶ Executando migration para ${project.label}...\n\n`);

  const npmExecPath = env.npm_execpath;
  if (!npmExecPath) {
    process.stderr.write("Nao foi possivel localizar o executavel do npm. Execute via 'npm run ...'.\n");
    process.exit(1);
  }

  const child = spawn(execPath, [npmExecPath, "run", project.script], { stdio: "inherit" });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

askProject();
