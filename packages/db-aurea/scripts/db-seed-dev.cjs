const { seedAureaDev } = require('./lib.cjs');

try {
  process.stdout.write('🌱 Starting Aurea dev seed...\n');
  seedAureaDev()
    .catch((error) => {
      process.stderr.write(`\n❌ Aurea db:seed:dev failed: ${error.message}\n`);
      process.exit(1);
    })
    .then(() => {
      process.stdout.write('\n✅ Aurea dev seed complete.\n');
    });
} catch (error) {
  process.stderr.write(`\n❌ Aurea db:seed:dev failed: ${error.message}\n`);
  process.exit(1);
}
