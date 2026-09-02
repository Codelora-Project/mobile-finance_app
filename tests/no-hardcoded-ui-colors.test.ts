import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const RAW_COLOR_PATTERN = /#[\dA-Fa-f]{3,8}|rgba?\(/;
const ALLOWED_COLOR_SOURCES = new Set([
  'db/migrations/002-goals-and-habits.ts',
  'db/migrations/005-multi-wallets-and-transfers.ts',
  'features/categories/category-meta.ts',
  'features/claims/claim-pdf.ts',
  'features/wallets/wallet-icons.ts',
  'theme/colors.ts',
]);

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('semantic UI colors', () => {
  it('keeps raw color literals inside approved token and metadata sources', () => {
    const violations = collectSourceFiles(SOURCE_ROOT)
      .map((path) => ({
        content: readFileSync(path, 'utf8'),
        path: relative(SOURCE_ROOT, path).replaceAll('\\', '/'),
      }))
      .filter(
        ({ content, path }) =>
          !ALLOWED_COLOR_SOURCES.has(path) && RAW_COLOR_PATTERN.test(content),
      )
      .map(({ path }) => path);

    expect(violations).toEqual([]);
  });
});
