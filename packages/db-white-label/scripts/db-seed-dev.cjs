const { seedWhiteLabelDev } = require('./lib.cjs')

seedWhiteLabelDev().catch((error) => {
  process.stderr.write(`White Label db:seed:dev failed: ${error.message}\n`)
  process.exit(1)
})
