const { dbMigrate } = require('./lib.cjs');

try {
  dbMigrate();
  process.stdout.write('VidaSystem migrations applied.\n');
} catch (error) {
  process.stderr.write(`VidaSystem db:migrate failed: ${error.message}\n`);
  process.exit(1);
}
