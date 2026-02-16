#!/usr/bin/env node

/**
 * Setup Project Selection Script
 *
 * Permite selecionar qual projeto fazer setup:
 * 1. Pergunta qual projeto (Aurea ou White Label)
 * 2. Executa npm run db:reset:<project>
 * 3. Executa npm run db:seed:dev:<project>
 *
 * Uso:
 *   npm run setup [-- aurea|white-label]
 *   npm run setup (abre menu interativo)
 */

const { execSync } = require('node:child_process')
const { createInterface } = require('node:readline')
const { stdin, stdout, argv } = require('node:process')
const path = require('node:path')

const PROJECTS = [
  {
    aliases: ['1', 'aurea'],
    label: 'Aurea',
    key: 'aurea',
  },
  {
    aliases: ['2', 'white-label', 'white_label', 'wl'],
    label: 'White Label',
    key: 'white-label',
  },
]

const rawArgs = argv.slice(2)
const loweredArgs = rawArgs.map((arg) => arg.toLowerCase())
const projectArg = loweredArgs[0]?.replace(/^--/, '')

if (projectArg) {
  const selected = PROJECTS.find((project) =>
    project.aliases.includes(projectArg)
  )
  if (!selected) {
    console.error(
      `❌ Projeto inválido: ${projectArg}\nUse: aurea ou white-label`
    )
    process.exit(1)
  }
  runSetup(selected)
} else {
  askProject()
}

function askProject() {
  stdout.write('\n')
  stdout.write('═'.repeat(60) + '\n')
  stdout.write('  🚀 Setup de Desenvolvimento Local\n')
  stdout.write('═'.repeat(60) + '\n\n')
  stdout.write('Selecione o projeto para fazer setup:\n')
  PROJECTS.forEach((project, index) => {
    stdout.write(`  ${index + 1}) ${project.label}\n`)
  })
  stdout.write('\n')

  const rl = createInterface({ input: stdin, output: stdout })
  rl.question(`Digite o número (1-${PROJECTS.length}): `, (answer) => {
    const normalized = answer.trim().toLowerCase()
    const selected = PROJECTS.find((project) =>
      project.aliases.includes(normalized)
    )
    rl.close()

    if (!selected) {
      console.error('❌ Opção inválida. Use 1 para Aurea ou 2 para White Label.')
      process.exit(1)
    }
    stdout.write('\n')
    runSetup(selected)
  })
}

function runSetup(project) {
  try {
    console.log(`\n🔄 Resetando banco de dados para ${project.label}...\n`)
    execSync(`npm run db:reset:${project.key}`, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    })

    console.log(`\n🌱 Populando banco com dados de desenvolvimento...\n`)
    execSync(`npm run db:seed:dev:${project.key}`, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    })

    console.log(`\n✅ Setup concluído para ${project.label}!\n`)
  } catch (error) {
    console.error(`\n❌ Erro durante setup: ${error.message}`)
    process.exit(1)
  }
}
