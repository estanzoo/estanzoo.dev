// Markup pins of the whole page (blueprint Step 10, R8): renders <App/> exactly as the
// prerender does (src/entry-server.tsx), cuts it into one pin per section and compares each
// normalized record with src/testing/pins/<section>.txt. A refactor must reproduce the
// records. On a mismatch the actual record is written to build/markup-pin/App/<section>.txt.
// Rewrite the committed records with `npm run pins:update`, for deliberate changes only.
import { fileURLToPath } from 'node:url';
import { parseFragment, serializeOuter } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import { describe, expect, it } from 'vitest';
import { render } from '../entry-server';
import { checkPin, normalizeMarkup } from './markupPin';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];

const PIN_DIR = fileURLToPath(new URL('./pins', import.meta.url));
const OUT_DIR = fileURLToPath(new URL('../../build/markup-pin', import.meta.url));
const UPDATE = process.env.PINS_UPDATE === '1';

/** Each pin and how to find its root element. The site footer lives inside #contact. */
const SECTIONS: { name: string; matches: (el: Element) => boolean }[] = [
  { name: 'header', matches: (el) => el.tagName === 'header' },
  ...['top', 'about', 'projects', 'experience', 'interests', 'contact'].map((id) => ({
    name: id,
    matches: (el: Element) => el.tagName === 'section' && el.attrs.some((a) => a.name === 'id' && a.value === id),
  })),
];

function findAll(node: Node, matches: (el: Element) => boolean, found: Element[] = []): Element[] {
  if ('tagName' in node && matches(node)) found.push(node);
  if ('childNodes' in node) for (const child of node.childNodes) findAll(child, matches, found);
  return found;
}

const page = parseFragment(render());

describe('markup pins of the page', () => {
  it.each(SECTIONS)('$name renders the committed record', ({ name, matches }) => {
    const roots = findAll(page, matches);
    expect(roots, `exactly one root element for pin "${name}"`).toHaveLength(1);
    const failure = checkPin({
      test: 'App',
      section: name,
      actual: normalizeMarkup(serializeOuter(roots[0])),
      pinDir: PIN_DIR,
      outDir: OUT_DIR,
      update: UPDATE,
    });
    if (failure) expect.fail(failure);
  });
});
