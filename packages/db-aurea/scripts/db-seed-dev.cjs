const { seedVidaSystemDev } = require('./lib.cjs');

try {
  process.stdout.write('🌱 Starting VidaSystem dev seed...\n');
  seedVidaSystemDev()
    .catch((error) => {
      process.stderr.write(`\n❌ VidaSystem db:seed:dev failed: ${error.message}\n`);
      process.exit(1);
    })
    .then(() => {
      process.stdout.write('\n✅ VidaSystem dev seed complete.\n');
    });
} catch (error) {
  process.stderr.write(`\n❌ VidaSystem db:seed:dev failed: ${error.message}\n`);
  process.exit(1);
}
