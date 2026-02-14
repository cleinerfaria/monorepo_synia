const { dbReset, dbMigrate, seedAureaDev, ensureDevEnv } = require('./lib.cjs')

async function run() {
  ensureDevEnv()
  dbReset()
  dbMigrate()
  await seedAureaDev()
  process.stdout.write('Aurea db:prepare:test complete.\n')
}

run().catch((error) => {
  process.stderr.write(`Aurea db:prepare:test failed: ${error.message}\n`)
  process.exit(1)
})
