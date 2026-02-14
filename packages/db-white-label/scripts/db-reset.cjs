const { dbReset } = require('./lib.cjs')

try {
  dbReset()
  process.stdout.write('White Label database reset complete.\n')
} catch (error) {
  process.stderr.write(`White Label db:reset failed: ${error.message}\n`)
  process.exit(1)
}
