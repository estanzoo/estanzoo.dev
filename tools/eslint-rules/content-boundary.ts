// content-boundary (owner decision 3): only src/App.tsx and section containers import
// src/content.ts.
//
// Reads: every import, re-export and literal dynamic import() of a non-test file.
// Bad:   src/components/hero/HeroView.tsx: import { site } from '../../content';
// Why:   a View that reads the copy itself is no longer drawn only from its view model, so
//        a mock cannot show every state and the screen renderer draws stale text.
//
// A section container is src/components/<section>/<Capitalized>.tsx that is not a
// *View.tsx. Option `allow`: extra repository-relative paths that may import it.
import { dirname, relative, resolve, sep } from 'node:path';
import type { Rule } from 'eslint';
import type { Node } from 'estree';

const CONTENT = /^src\/content(\.ts)?$/;
const CONTAINER = /^src\/components\/[^/]+\/[A-Z][A-Za-z0-9]*\.tsx$/;

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Only src/App.tsx and section containers may import src/content.ts.' },
    schema: [
      {
        type: 'object',
        properties: { allow: { type: 'array', items: { type: 'string' } } },
        additionalProperties: false,
      },
    ],
    messages: {
      boundary:
        'Only src/App.tsx and section containers (src/components/<section>/<Section>.tsx) may import src/content.ts; pass the copy in through the view model.',
    },
  },
  create(context) {
    const toRepo = (path: string) => relative(context.cwd, path).split(sep).join('/');
    const file = toRepo(context.filename);
    const allow: string[] = context.options[0]?.allow ?? [];
    const permitted =
      file === 'src/App.tsx' || (CONTAINER.test(file) && !file.endsWith('View.tsx')) || allow.includes(file);
    if (permitted) return {};

    const check = (source: Node | null | undefined) => {
      if (!source || source.type !== 'Literal' || typeof source.value !== 'string') return;
      if (!source.value.startsWith('.')) return;
      if (CONTENT.test(toRepo(resolve(dirname(context.filename), source.value)))) {
        context.report({ node: source, messageId: 'boundary' });
      }
    };

    return {
      ImportDeclaration: (node) => check(node.source),
      ExportNamedDeclaration: (node) => check(node.source),
      ExportAllDeclaration: (node) => check(node.source),
      ImportExpression: (node) => check(node.source),
    };
  },
};

export default rule;
