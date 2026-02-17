const fs = require('node:fs');

const commitMessagePath = process.argv[2];

if (!commitMessagePath) {
  process.stderr.write('Missing commit message file path.\n');
  process.exit(1);
}

const rawMessage = fs.readFileSync(commitMessagePath, 'utf8').trim();
const firstLine = rawMessage.split('\n')[0] || '';

if (!firstLine) {
  process.stderr.write('Commit message cannot be empty.\n');
  process.exit(1);
}

if (firstLine.startsWith('Merge ') || firstLine.startsWith('Revert "')) {
  process.exit(0);
}

const conventionalCommitPattern =
  /^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|db|revert|hotfix)(\([a-z0-9._/-]+\))?(!)?: .{5,}$/;

if (!conventionalCommitPattern.test(firstLine)) {
  process.stderr.write(
    [
      'Invalid commit message format.',
      'Use: <type>(optional-scope): <description>',
      'Example: feat(auth): add session timeout guard',
      'Allowed types: feat, fix, chore, docs, style, refactor, perf, test, build, ci, revert, hotfix',
    ].join('\n') + '\n'
  );
  process.exit(1);
}
