const { seedWhiteLabelDev } = require('./lib.cjs');

try {
  process.stdout.write('🌱 Starting White Label dev seed...\n');
  seedWhiteLabelDev()
    .catch((error) => {
      process.stderr.write(`\n❌ White Label db:seed:dev failed: ${error.message}\n`);
      process.exit(1);
    })
    .then(() => {
      process.stdout.write('\n✅ White Label dev seed complete.\n');
    });
} catch (error) {
  process.stderr.write(`\n❌ White Label db:seed:dev failed: ${error.message}\n`);
  process.exit(1);
}
