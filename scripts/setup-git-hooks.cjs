const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const gitDir = path.join(repoRoot, ".git");

if (!fs.existsSync(gitDir)) {
  process.exit(0);
}

try {
  execSync("git config core.hooksPath .githooks", {
    cwd: repoRoot,
    stdio: "pipe",
  });
  process.stdout.write('Git hooks path configured to ".githooks"\n');
} catch {
  process.stdout.write(
    'Could not configure git hooks automatically. Run: git config core.hooksPath .githooks\n',
  );
}
