const { dbReset, dbMigrate, seedWhiteLabelDev, ensureDevEnv } = require('./lib.cjs');

async function run() {
  ensureDevEnv();
  dbReset();
  dbMigrate();
  await seedWhiteLabelDev();
  process.stdout.write('whitelabel db:prepare:test complete.\n');
}

run().catch((error) => {
  process.stderr.write(`whitelabel db:prepare:test failed: ${error.message}\n`);
  process.exit(1);
});
