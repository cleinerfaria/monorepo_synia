const { execSync } = require('child_process');
const fs = require('fs');

try {
  // 1. Get staged files
  const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACM', {
    encoding: 'utf-8',
  })
    .split('\n')
    .filter((file) => file && /\.(js|ts|tsx|json|md|sql|txt)$/.test(file));

  if (stagedFiles.length === 0) {
    console.log('✅ No staged files to check for encoding.');
    process.exit(0);
  }

  // 2. Check encoding for each file
  let hasErrors = false;
  stagedFiles.forEach((file) => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file);
      // Check for replacement characters or invalid UTF-8 sequences if possible.
      // A simple heuristic is to check if it looks like UTF-8.
      // Node's buffer defaults to UTF-8, but we can check for the replacement char  (U+FFFD)
      const contentStr = content.toString('utf8');
      if (contentStr.includes('')) {
        console.error(`❌ Encoding error detected in: ${file}`);
        hasErrors = true;
      }
    }
  });

  if (hasErrors) {
    console.error('❌ Some staged files have encoding issues. Ensure they are saved as UTF-8.');
    process.exit(1);
  }

  console.log('✅ All staged files have valid encoding.');
} catch (error) {
  console.error('❌ Error checking encoding:', error.message);
  process.exit(1);
}
