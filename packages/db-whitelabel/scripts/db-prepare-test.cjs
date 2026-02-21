const { dbReset, dbMigrate, seedWhiteLabelDev, ensureDevEnv } = require('./lib.cjs')

async function run() {
  ensureDevEnv()
  dbReset()
  dbMigrate()
  await seedWhiteLabelDev()
  process.stdout.write('White Label db:prepare:test complete.\n')
}

run().catch((error) => {
  process.stderr.write(`White Label db:prepare:test failed: ${error.message}\n`)
  process.exit(1)
})
