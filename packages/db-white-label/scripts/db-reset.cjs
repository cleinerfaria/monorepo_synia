const { dbReset } = require('./lib.cjs');

try {
  process.stdout.write('🔧 Starting White Label database reset...\n');
  dbReset()
    .then(() => {
      process.stdout.write('\n✅ White Label database reset complete.\n');
    })
    .catch((error) => {
      process.stderr.write(`\n❌ White Label db:reset failed: ${error.message}\n`);
      process.exit(1);
    });
} catch (error) {
  process.stderr.write(`\n❌ White Label db:reset failed: ${error.message}\n`);
  process.exit(1);
}
