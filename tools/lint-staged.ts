// npm run lint:staged: ESLint on the staged source files, for the pre-commit hook.
//
//   node tools/lint-staged.ts
//
// Lists the added, copied, modified and renamed files in the index and runs ESLint (with
// eslint.config.js) on the .js/.mjs/.ts/.tsx ones; exits with ESLint's status, or 0 when
// none is staged. Limit: ESLint reads the working-tree copy of each file, so an unstaged
// edit to a staged file is linted too.
import { execFileSync, spawnSync } from 'node:child_process';

const LINTED = /\.(js|mjs|ts|tsx)$/;

/** The staged paths ESLint should read. */
export function lintTargets(paths: string[]): string[] {
  return paths.filter((p) => LINTED.test(p));
}

if (import.meta.main) {
  const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
  const targets = lintTargets(staged);
  if (targets.length === 0) process.exit(0);
  const eslint = spawnSync('npx', ['eslint', '--no-warn-ignored', '--', ...targets], { stdio: 'inherit' });
  process.exit(eslint.status ?? 1);
}
