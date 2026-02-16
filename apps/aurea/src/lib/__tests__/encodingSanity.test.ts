import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE_ROOT = path.resolve(process.cwd(), 'src');
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.html']);
const IGNORED_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git']);

function collectSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }

    if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('encoding sanity', () => {
  it('does not contain replacement characters in source files', () => {
    const files = collectSourceFiles(SOURCE_ROOT);
    const filesWithInvalidChar = files
      .filter((filePath) => fs.readFileSync(filePath, 'utf8').includes('\uFFFD'))
      .map((filePath) => path.relative(process.cwd(), filePath));

    expect(filesWithInvalidChar).toEqual([]);
  });
});
