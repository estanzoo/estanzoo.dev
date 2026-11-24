// Proves the markup pin normalizer (blueprint R8): HTML in, a text record out, one node
// per line, indented by depth. Each rule below exists so that only a meaningful change in
// the rendered markup changes the record: comments, whitespace, attribute order, class
// token order and the spelling of entities all record the same.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkPin, firstDifference, normalizeMarkup } from './markupPin';

describe('normalizeMarkup', () => {
  it('records one node per line, children indented two spaces under their parent', () => {
    expect(normalizeMarkup('<div><p>Hi</p><span>there</span></div>')).toBe(
      ['<div>', '  <p>', '    Hi', '  <span>', '    there'].join('\n'),
    );
  });

  it('drops comments', () => {
    expect(normalizeMarkup('<p><!-- note -->Hi<!-- --></p>')).toBe(['<p>', '  Hi'].join('\n'));
  });

  it('joins the text runs a dropped comment separated, as the browser shows them', () => {
    // React's renderToString puts <!-- --> between adjacent text values.
    expect(normalizeMarkup('<p>© <!-- -->2026<!-- --> <!-- -->Ethan</p>')).toBe(
      ['<p>', '  © 2026 Ethan'].join('\n'),
    );
  });

  it('unescapes text, collapses its whitespace and trims it', () => {
    expect(normalizeMarkup('<p>\n   Tom &amp;\t\tJerry &lt;3  </p>')).toBe(['<p>', '  Tom & Jerry <3'].join('\n'));
  });

  it('drops text that is only whitespace', () => {
    expect(normalizeMarkup('<ul>\n  <li>a</li>\n  <li>b</li>\n</ul>')).toBe(
      ['<ul>', '  <li>', '    a', '  <li>', '    b'].join('\n'),
    );
  });

  it('sorts a start tag\'s attributes by name', () => {
    expect(normalizeMarkup('<a title="t" href="/x" aria-label="l"></a>')).toBe(
      '<a aria-label="l" href="/x" title="t">',
    );
  });

  it('sorts the tokens inside class and collapses the whitespace between them', () => {
    expect(normalizeMarkup('<div class="  zeta alpha\n mid "></div>')).toBe('<div class="alpha mid zeta">');
  });

  it('records every spelling of an attribute value the same', () => {
    const expected = '<a href="/?a=1&amp;b=&quot;2&quot;">';
    expect(normalizeMarkup('<a href="/?a=1&amp;b=&quot;2&quot;"></a>')).toBe(expected);
    expect(normalizeMarkup('<a href=\'/?a=1&b="2"\'></a>')).toBe(expected);
    expect(normalizeMarkup('<a href="/?a=1&#38;b=&#34;2&#x22;"></a>')).toBe(expected);
  });

  it('escapes < and > in attribute values', () => {
    expect(normalizeMarkup('<i data-x="a<b>c"></i>')).toBe('<i data-x="a&lt;b&gt;c">');
  });

  it('records a one-line script or style body verbatim', () => {
    expect(normalizeMarkup('<script>  var a = 1 < 2 && 3;  </script>')).toBe(
      ['<script>', '  var a = 1 < 2 && 3;'].join('\n'),
    );
    expect(normalizeMarkup('<style>\n  .a > .b { color: red }\n</style>')).toBe(
      ['<style>', '  .a > .b { color: red }'].join('\n'),
    );
  });

  it('records a longer script or style body as a digest of its trimmed non-blank lines', () => {
    const lines = ['const a = 1;', 'const b = 2;', 'console.log(a + b);'];
    const digest = createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 16);
    const expected = ['<script>', `  [3 lines, sha256 ${digest}]`].join('\n');
    expect(normalizeMarkup(`<script>\n  ${lines[0]}\n\n${lines[1]}\n    ${lines[2]}\n</script>`)).toBe(expected);
    // Re-indenting the body or adding blank lines does not change the record.
    expect(normalizeMarkup(`<script>${lines.join('\n\n\n')}</script>`)).toBe(expected);
  });

  it('records an empty script or style with no body line', () => {
    expect(normalizeMarkup('<style>  \n </style>')).toBe('<style>');
  });

  it('records void elements as a start tag only', () => {
    expect(normalizeMarkup('<p>a<br/>b<input disabled type="text"></p>')).toBe(
      ['<p>', '  a', '  <br>', '  b', '  <input disabled="" type="text">'].join('\n'),
    );
  });
});

describe('firstDifference', () => {
  const lines = (n: number, change?: [number, string]) =>
    Array.from({ length: n }, (_, i) => (change && change[0] === i + 1 ? change[1] : `line ${i + 1}`)).join('\n');

  it('equal records have no difference', () => {
    expect(firstDifference(lines(3), lines(3))).toBeNull();
  });

  it('names the first differing line and shows five lines of context from both sides', () => {
    const message = firstDifference(lines(20), lines(20, [10, 'changed']))!;
    expect(message.split('\n')).toEqual([
      'first difference at line 10',
      '--- expected',
      '     5 | line 5',
      '     6 | line 6',
      '     7 | line 7',
      '     8 | line 8',
      '     9 | line 9',
      '>   10 | line 10',
      '    11 | line 11',
      '    12 | line 12',
      '    13 | line 13',
      '    14 | line 14',
      '    15 | line 15',
      '+++ actual',
      '     5 | line 5',
      '     6 | line 6',
      '     7 | line 7',
      '     8 | line 8',
      '     9 | line 9',
      '>   10 | changed',
      '    11 | line 11',
      '    12 | line 12',
      '    13 | line 13',
      '    14 | line 14',
      '    15 | line 15',
    ]);
  });

  it('a record that ends early differs at the first line past its end', () => {
    const message = firstDifference(lines(3), lines(4))!;
    expect(message.split('\n')[0]).toBe('first difference at line 4');
    expect(message).toContain('>    4 | line 4');
  });
});

describe('checkPin', () => {
  const dirs = () => {
    const root = mkdtempSync(join(tmpdir(), 'markup-pin-'));
    return { pinDir: join(root, 'pins'), outDir: join(root, 'out') };
  };

  it('a record equal to the committed pin passes and writes nothing', () => {
    const { pinDir, outDir } = dirs();
    mkdirSync(pinDir, { recursive: true });
    writeFileSync(join(pinDir, 'about.txt'), '<p>\n  Hi\n');
    expect(checkPin({ test: 'site', section: 'about', actual: '<p>\n  Hi', pinDir, outDir })).toBeNull();
    expect(existsSync(outDir)).toBe(false);
  });

  it('a different record writes the actual record and reports the first difference with both paths', () => {
    const { pinDir, outDir } = dirs();
    mkdirSync(pinDir, { recursive: true });
    writeFileSync(join(pinDir, 'about.txt'), '<p>\n  Hi\n');
    const failure = checkPin({ test: 'site', section: 'about', actual: '<p>\n  Bye', pinDir, outDir })!;
    const written = join(outDir, 'site', 'about.txt');
    expect(readFileSync(written, 'utf8')).toBe('<p>\n  Bye\n');
    expect(failure).toContain('markup pin "about" differs from ' + join(pinDir, 'about.txt'));
    expect(failure).toContain('actual record: ' + written);
    expect(failure).toContain('first difference at line 2');
  });

  it('a missing pin fails and says how to create it', () => {
    const { pinDir, outDir } = dirs();
    const failure = checkPin({ test: 'site', section: 'about', actual: '<p>', pinDir, outDir })!;
    expect(failure).toContain('npm run pins:update');
    expect(existsSync(join(outDir, 'site', 'about.txt'))).toBe(true);
  });

  it('update mode rewrites the committed pin and passes', () => {
    const { pinDir, outDir } = dirs();
    expect(checkPin({ test: 'site', section: 'about', actual: '<p>', pinDir, outDir, update: true })).toBeNull();
    expect(readFileSync(join(pinDir, 'about.txt'), 'utf8')).toBe('<p>\n');
  });
});
