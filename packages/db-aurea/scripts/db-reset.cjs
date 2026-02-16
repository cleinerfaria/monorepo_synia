const { dbReset } = require('./lib.cjs');

try {
  process.stdout.write('🔧 Starting Aurea database reset...\n');
  dbReset()
    .then(() => {
      process.stdout.write('\n✅ Aurea database reset complete.\n');
    })
    .catch((error) => {
      process.stderr.write(`\n❌ Aurea db:reset failed: ${error.message}\n`);
      process.exit(1);
    });
} catch (error) {
  process.stderr.write(`\n❌ Aurea db:reset failed: ${error.message}\n`);
  process.exit(1);
}
