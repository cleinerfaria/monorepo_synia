const { seedWhiteLabelDev } = require('./lib.cjs');

try {
  process.stdout.write('🌱 Starting whitelabel dev seed...\n');
  seedWhiteLabelDev()
    .catch((error) => {
      process.stderr.write(`\n❌ whitelabel db:seed:dev failed: ${error.message}\n`);
      process.exit(1);
    })
    .then(() => {
      process.stdout.write('\n✅ whitelabel dev seed complete.\n');
    });
} catch (error) {
  process.stderr.write(`\n❌ whitelabel db:seed:dev failed: ${error.message}\n`);
  process.exit(1);
}
