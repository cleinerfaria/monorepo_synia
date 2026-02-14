const { execSync } = require('child_process')
const fs = require('fs')

try {
  // 1. Get staged files that match Prettier's supported extensions
  const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACM', {
    encoding: 'utf-8',
  })
    .split('\n')
    .filter((file) => file && /\.(js|jsx|ts|tsx|json|css|scss|md|html|yml|yaml)$/.test(file))

  if (stagedFiles.length === 0) {
    console.log('✅ No staged files to check.')
    process.exit(0)
  }

  // 2. Check formatting for each staged file
  let hasErrors = false
  stagedFiles.forEach((file) => {
    try {
      if (fs.existsSync(file)) {
        execSync(`npx prettier --check "${file}"`, { stdio: 'ignore' })
      }
    } catch (e) {
      console.error(`❌ Prettier check failed for: ${file}`)
      hasErrors = true
    }
  })

  if (hasErrors) {
    console.error(
      '❌ Some staged files are not formatted correctly. Run "npm run format" and stage the changes.'
    )
    process.exit(1)
  }

  console.log('✅ All staged files are formatted correctly.')
} catch (error) {
  console.error('❌ Error checking staged files:', error.message)
  process.exit(1)
}
