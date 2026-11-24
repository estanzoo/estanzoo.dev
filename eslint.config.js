// ESLint flat config (blueprint Step 9, R7). The project's architecture rules live in the
// local plugin tools/eslint-rules/ (catalogue in its index.js); each has a RuleTester
// self-test, and tools/eslint-rules/code.test.ts asserts this config is clean on the real
// code and reaches every section View and container.
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import local from './tools/eslint-rules/index.js';

const TESTS = ['**/*.test.ts', '**/*.test.tsx'];

export default defineConfig([
  globalIgnores(['dist/', 'dist-ssr/', 'build/', 'coverage/', '.worktree/']),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      // Same convention as tsc's noUnusedParameters: a leading _ marks an unused name.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'vitest.setup.dom.ts'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    plugins: { local },
  },
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    ignores: TESTS,
    rules: {
      // src/terminal.ts: the Hero terminal's pure command table, used only by the Hero
      // container; it reads site and stack copy. Allowed until runCommand takes the copy
      // as an argument.
      'local/content-boundary': ['error', { allow: ['src/terminal.ts'] }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: TESTS,
    rules: { 'local/design-tokens': 'error' },
  },
  {
    // The cube sticker and F1 rev colours are view-model values: the View writes them into
    // style="background:..." and the markup pins (src/testing/pins/interests.txt) hold
    // them as hex. Token names would change that markup, so these two files may carry
    // exactly the STICKER_COLOURS and REV_COLOURS of interestsVm.ts, nothing else.
    files: ['src/components/interests/interestsVm.ts', 'src/components/interests/Interests.tsx'],
    ignores: TESTS,
    rules: {
      'local/design-tokens': [
        'error',
        { allow: ['#F2F2F2', '#FFD84D', '#FF5A4D', '#FF9F43', '#4D9BFF', '#5BD68A', '#7EE787', '#FFB454'] },
      ],
    },
  },
  {
    files: ['src/App.tsx', 'src/components/*/*.tsx'],
    ignores: TESTS,
    rules: { 'local/ssr-safe-render': 'error' },
  },
  {
    files: ['src/components/*/*View.tsx'],
    rules: { 'local/views-no-decisions': 'error' },
  },
]);
