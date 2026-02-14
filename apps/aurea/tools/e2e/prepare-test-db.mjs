import { prepareE2eRuntime } from './workflow.mjs'

const shouldPrintJson = process.argv.includes('--json')

try {
  const runtime = await prepareE2eRuntime({ writeEnvFile: true })

  if (shouldPrintJson) {
    process.stdout.write(`${JSON.stringify(runtime)}\n`)
  } else {
    process.stdout.write('Banco remoto de desenvolvimento pronto para e2e.\n')
    process.stdout.write(`Base URL: ${runtime.baseUrl}\n`)
    process.stdout.write(`Supabase URL: ${runtime.supabaseUrl}\n`)
    process.stdout.write(`Usuario de teste: ${runtime.email}\n`)
  }
} catch (error) {
  process.stderr.write(`Falha ao preparar ambiente e2e: ${error.message}\n`)
  process.exit(1)
}
