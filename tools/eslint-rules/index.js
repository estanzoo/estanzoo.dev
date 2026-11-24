// The local ESLint plugin (blueprint Step 9, R7): the project's architecture rules as code.
// Each rule file documents its statement, a bad example and the reason; each has a
// RuleTester self-test beside it (<rule>.test.ts), and code.test.ts applies them to the
// real code. eslint.config.js registers the plugin as `local` and scopes each rule.
//
//   local/content-boundary    only src/App.tsx and section containers import src/content.ts
//   local/ssr-safe-render     no browser globals on the render path of a View or container
//   local/design-tokens       no raw hex/rgb()/hsl() colours in TS(X) string literals
//   local/views-no-decisions  no &&, ||, ??, ?:, if, switch or hooks in a *View.tsx
//
// Two rules of the same catalogue are vitest tests rather than lint rules, because they
// read CSS and zod schemas: tools/css-tokens/cssColours.test.ts (colours in CSS only in the
// :root token block) and src/testing/strictSchemas.test.ts (every VM object is strict).
//
// Plain JS so eslint.config.js loads it as is; Node strips the types of the .ts rules.
import contentBoundary from './content-boundary.ts';
import designTokens from './design-tokens.ts';
import ssrSafeRender from './ssr-safe-render.ts';
import viewsNoDecisions from './views-no-decisions.ts';

export default {
  meta: { name: 'local' },
  rules: {
    'content-boundary': contentBoundary,
    'design-tokens': designTokens,
    'ssr-safe-render': ssrSafeRender,
    'views-no-decisions': viewsNoDecisions,
  },
};
