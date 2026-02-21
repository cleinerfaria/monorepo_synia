const { dbMigrate } = require('./lib.cjs');

try {
  dbMigrate();
  process.stdout.write('whitelabel migrations applied.\n');
} catch (error) {
  process.stderr.write(`whitelabel db:migrate failed: ${error.message}\n`);
  process.exit(1);
}
