// design-tokens, CSS side (blueprint R7). Self-test: the scanner reports exactly each raw
// colour outside the :root token block, at its line and column, and nothing in comments or
// in the token block. Code test: every stylesheet under src/ is clean apart from the listed
// exceptions, each exception is still needed, and the scan found the stylesheets.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cssColourViolations } from './cssColours';

describe('cssColourViolations', () => {
  it('reports raw hex, rgb()/rgba() and hsl()/hsla() colours with line and column', () => {
    const css = ['.a { color: #fff; }', '.b {', '  border: 1px solid #A1B2C3d4;', '  background: rgba(0, 0, 0, .5) hsl(1 2% 3%);', '}'].join('\n');
    expect(cssColourViolations(css)).toEqual([
      { line: 1, column: 13, colour: '#fff' },
      { line: 3, column: 21, colour: '#A1B2C3d4' },
      { line: 4, column: 15, colour: 'rgba(' },
      { line: 4, column: 33, colour: 'hsl(' },
    ]);
  });

  it('ignores comments, var() tokens, ids and non-colour hex lengths', () => {
    const css = '/* #fff rgb(0,0,0)\n   #000 */\n#about, #top { color: var(--fg); }\n.x { width: 12px } /* #ab */';
    expect(cssColourViolations(css)).toEqual([]);
  });

  it('allows colours only inside the top-level :root block when it is the token file', () => {
    const css = ':root {\n  --bg: #0f1216;\n  --x: rgb(1, 2, 3);\n}\n.a { color: #fff; }\n@media (x) { :root { --y: #111; } }';
    expect(cssColourViolations(css, { tokens: true })).toEqual([
      { line: 5, column: 13, colour: '#fff' },
      { line: 6, column: 27, colour: '#111' },
    ]);
    expect(cssColourViolations(css).map((v) => v.colour)).toEqual(['#0f1216', 'rgb(', '#fff', '#111']);
  });

  it('a :root selector list or a :root descendant is not the token block', () => {
    const css = ':root, .a { --a: #111; }\n:root .b { color: #222; }';
    expect(cssColourViolations(css, { tokens: true }).map((v) => v.colour)).toEqual(['#111', '#222']);
  });
});

/**
 * Colours outside the token block that stay, each with its reason. An entry that no longer
 * matches fails the code test, so the list cannot go stale.
 */
const EXCEPTIONS = [
  {
    file: 'src/components/interests/Interests.css',
    colour: '#ff5a4d',
    reason: 'the F1 start-light red, one of the cube/F1 palette the Interests VM carries as hex',
  },
  {
    file: 'src/components/hero/Hero.css',
    colour: '#000',
    reason: 'the alpha of the --spot mask gradient, not a palette colour',
  },
];

function cssFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return cssFiles(path);
    return entry.name.endsWith('.css') ? [path] : [];
  });
}

describe('colours in the real stylesheets', () => {
  const files = cssFiles('src').sort();
  const found = files.flatMap((file) =>
    cssColourViolations(readFileSync(join(process.cwd(), file), 'utf8'), { tokens: file === 'src/styles/global.css' }).map(
      (v) => ({ file, ...v }),
    ),
  );
  const isException = (v: { file: string; colour: string }) =>
    EXCEPTIONS.some((e) => e.file === v.file && e.colour.toLowerCase() === v.colour.toLowerCase());

  it('scans global.css and the stylesheet of every section', () => {
    expect(files).toContain('src/styles/global.css');
    expect(files.filter((f) => f.startsWith('src/components/')).length).toBeGreaterThanOrEqual(7);
  });

  it('the token block of global.css holds the palette', () => {
    const css = readFileSync('src/styles/global.css', 'utf8');
    expect(cssColourViolations(css).length).toBeGreaterThan(10);
  });

  it('has no raw colour outside the token block: use a var(--...) token from src/styles/global.css', () => {
    expect(found.filter((v) => !isException(v)).map((v) => `${v.file}:${v.line}:${v.column} ${v.colour}`)).toEqual([]);
  });

  it('every listed exception is still needed', () => {
    for (const e of EXCEPTIONS) expect(found.some((v) => isException(v) && v.file === e.file), e.file).toBe(true);
  });
});
