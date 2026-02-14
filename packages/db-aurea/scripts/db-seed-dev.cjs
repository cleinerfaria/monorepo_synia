const { seedAureaDev } = require('./lib.cjs')

seedAureaDev().catch((error) => {
  process.stderr.write(`Aurea db:seed:dev failed: ${error.message}\n`)
  process.exit(1)
})
