// Proves which staged paths `npm run lint:staged` hands to ESLint: the source files ESLint
// reads (.js, .mjs, .ts, .tsx), nothing else.
// Leaves to other layers: the git query and the ESLint run (tools/lint-staged.ts main).
import { describe, expect, it } from 'vitest';
import { lintTargets } from './lint-staged';

describe('lintTargets', () => {
  it('keeps the files ESLint lints and drops the rest', () => {
    expect(
      lintTargets(['src/App.tsx', 'src/terminal.ts', 'eslint.config.js', 'tools/screens/cli.mjs', 'README.md', 'src/styles/global.css', 'mocks/a.json', 'src/x.d.ts.snap']),
    ).toEqual(['src/App.tsx', 'src/terminal.ts', 'eslint.config.js', 'tools/screens/cli.mjs']);
  });

  it('nothing staged is nothing to lint', () => {
    expect(lintTargets([])).toEqual([]);
  });
});
