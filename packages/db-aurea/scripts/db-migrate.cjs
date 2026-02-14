const { dbMigrate } = require('./lib.cjs')

try {
  dbMigrate()
  process.stdout.write('Aurea migrations applied.\n')
} catch (error) {
  process.stderr.write(`Aurea db:migrate failed: ${error.message}\n`)
  process.exit(1)
}
