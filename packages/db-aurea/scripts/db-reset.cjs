const { dbReset } = require('./lib.cjs')

try {
  dbReset()
  process.stdout.write('Aurea database reset complete.\n')
} catch (error) {
  process.stderr.write(`Aurea db:reset failed: ${error.message}\n`)
  process.exit(1)
}
