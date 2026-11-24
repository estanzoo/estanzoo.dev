// A RuleTester wired to vitest and to the parser eslint.config.js uses (typescript-eslint,
// JSX on), so the self-tests parse code exactly as `npm run lint` does.
//
// Case filenames are relative to the repository root (`at('src/App.tsx')`), because the
// rules that look at the path (content-boundary, ssr-safe-render) read it relative to
// ESLint's cwd.
import { join } from 'node:path';
import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, it } from 'vitest';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

export const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

/** An absolute filename for a path relative to the repository root. */
export const at = (path: string) => join(process.cwd(), path);
