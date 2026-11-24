// design-tokens, CSS side (blueprint R7; the TS side is the ESLint rule
// tools/eslint-rules/design-tokens.ts, with the same colour pattern).
//
//   cssColourViolations(css, { tokens }) -> [{ line, column, colour }]
//
// Reports every raw hex (#rgb, #rgba, #rrggbb, #rrggbbaa) and rgb()/rgba()/hsl()/hsla()
// colour of a stylesheet, outside comments. With tokens: true (src/styles/global.css) the
// top-level `:root { ... }` block, the token block, may hold colours; nothing else may.
// Bad:   .f1l { background: #ff5a4d; }
// Why:   a raw colour skips the palette; var(--...) names the decision.
import { allColours } from '../eslint-rules/design-tokens';

export type CssColourViolation = { line: number; column: number; colour: string };

/** The text with every comment replaced by spaces, so offsets and lines stay. */
const blankComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));

/** [start, end) offsets of each top-level rule whose selector is exactly :root. */
function rootBlocks(css: string): [number, number][] {
  const blocks: [number, number][] = [];
  let depth = 0;
  let selectorStart = 0;
  let open = -1;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '{') {
      if (depth === 0 && css.slice(selectorStart, i).trim() === ':root') open = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        if (open >= 0) blocks.push([open, i + 1]);
        open = -1;
        selectorStart = i + 1;
      }
    } else if (ch === ';' && depth === 0) {
      selectorStart = i + 1;
    }
  }
  return blocks;
}

export function cssColourViolations(css: string, { tokens = false } = {}): CssColourViolation[] {
  const text = blankComments(css);
  const allowed = tokens ? rootBlocks(text) : [];
  return allColours(text)
    .filter(({ index }) => !allowed.some(([start, end]) => index >= start && index < end))
    .map(({ index, colour }) => {
      const before = text.slice(0, index);
      const line = before.split('\n').length;
      return { line, column: index - before.lastIndexOf('\n'), colour };
    });
}
