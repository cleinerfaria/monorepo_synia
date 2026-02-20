const { dbReset } = require('./lib.cjs');

try {
  process.stdout.write('🔧 Starting VidaSystem database reset...\n');
  dbReset()
    .then(() => {
      process.stdout.write('\n✅ VidaSystem database reset complete.\n');
    })
    .catch((error) => {
      process.stderr.write(`\n❌ VidaSystem db:reset failed: ${error.message}\n`);
      process.exit(1);
    });
} catch (error) {
  process.stderr.write(`\n❌ VidaSystem db:reset failed: ${error.message}\n`);
  process.exit(1);
}
