const { dbReset } = require('./lib.cjs');

try {
  process.stdout.write('🔧 Starting whitelabel database reset...\n');
  dbReset()
    .then(() => {
      process.stdout.write('\n✅ whitelabel database reset complete.\n');
    })
    .catch((error) => {
      process.stderr.write(`\n❌ whitelabel db:reset failed: ${error.message}\n`);
      process.exit(1);
    });
} catch (error) {
  process.stderr.write(`\n❌ whitelabel db:reset failed: ${error.message}\n`);
  process.exit(1);
}
