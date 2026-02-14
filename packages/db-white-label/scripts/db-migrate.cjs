const { dbMigrate } = require('./lib.cjs')

try {
  dbMigrate()
  process.stdout.write('White Label migrations applied.\n')
} catch (error) {
  process.stderr.write(`White Label db:migrate failed: ${error.message}\n`)
  process.exit(1)
}
