// L1 unit: proves the screen renderer library (blueprint Step 7, R5) - it finds every
// mocks/<section>/<state>.json, layers each over mocks/_defaults.json, renders the real
// section View from the mock's 'vm', names the mock when it cannot render, and builds the
// standalone state page and the scenario index.
// Leaves to other layers: the HTTP server, the Vite SSR loading and the CSS build
// (tools/screens/cli.mjs, checked by running npm run screens:*).
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { screens } from '../../src/screens/registry';
import { indexPage, listMocks, loadMock, renderMock, statePage } from './screens';

const MOCKS = fileURLToPath(new URL('../../mocks', import.meta.url));

function fixture(files: Record<string, unknown>): string {
  const dir = mkdtempSync(join(tmpdir(), 'screens-'));
  for (const [path, data] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), JSON.stringify(data));
  }
  return dir;
}

describe('listMocks', () => {
  it('lists every <section>/<state>.json sorted, without _defaults.json', () => {
    const dir = fixture({
      '_defaults.json': {},
      'b/one.json': {},
      'a/two.json': {},
      'a/one.json': {},
    });
    expect(listMocks(dir).map((m) => m.name)).toEqual(['a/one', 'a/two', 'b/one']);
  });

  it('lists the contact states of the real mocks', () => {
    expect(listMocks(MOCKS).map((m) => m.name)).toEqual(
      expect.arrayContaining(['contact/idle', 'contact/copied', 'contact/blocked']),
    );
  });
});

describe('loadMock', () => {
  it('layers the mock over _defaults.json, the mock keys winning', () => {
    const dir = fixture({
      '_defaults.json': { _scenario: 'default', shared: 1 },
      'a/one.json': { _scenario: 'own', vm: { x: 1 } },
    });
    const [ref] = listMocks(dir);
    expect(loadMock(dir, ref)).toEqual({ _scenario: 'own', shared: 1, vm: { x: 1 } });
  });

  it('works without a _defaults.json', () => {
    const dir = fixture({ 'a/one.json': { vm: 1 } });
    expect(loadMock(dir, listMocks(dir)[0])).toEqual({ vm: 1 });
  });
});

describe('renderMock', () => {
  it('renders every real mock through its section View', () => {
    for (const ref of listMocks(MOCKS)) {
      expect(renderMock(screens, ref, loadMock(MOCKS, ref)), ref.name).toMatch(/^<(section|header) /);
    }
  });

  it('draws the copy label of the copied mock', () => {
    const ref = listMocks(MOCKS).find((m) => m.name === 'contact/copied')!;
    expect(renderMock(screens, ref, loadMock(MOCKS, ref))).toContain('<span aria-live="polite">copied</span>');
  });

  it('names the mock when its vm does not fit the schema', () => {
    const ref = { section: 'contact', state: 'bad', name: 'contact/bad', file: 'mocks/contact/bad.json' };
    expect(() => renderMock(screens, ref, { vm: { heading: 'x' } })).toThrow(/^mocks\/contact\/bad\.json: vm does not fit/);
  });

  it('lists each schema issue with its vm path', () => {
    const ref = { section: 'contact', state: 'bad', name: 'contact/bad', file: 'mocks/contact/bad.json' };
    const idle = listMocks(MOCKS).find((m) => m.name === 'contact/idle')!;
    const vm = { ...(loadMock(MOCKS, idle).vm as object), extra: 1, mail: { href: 'h' } };
    expect(() => renderMock(screens, ref, { vm })).toThrow(/\n {2}vm\.mail\.label: .*\n {2}vm: Unrecognized key: "extra"$/);
  });

  it('names the mock when it has no vm', () => {
    const ref = { section: 'contact', state: 'bad', name: 'contact/bad', file: 'mocks/contact/bad.json' };
    expect(() => renderMock(screens, ref, {})).toThrow(/^mocks\/contact\/bad\.json: vm does not fit/);
  });

  it('names the mock when no section in the registry matches', () => {
    const ref = { section: 'nope', state: 'x', name: 'nope/x', file: 'mocks/nope/x.json' };
    expect(() => renderMock(screens, ref, { vm: {} })).toThrow(
      'mocks/nope/x.json: no section "nope" in src/screens/registry.ts',
    );
  });
});

describe('statePage', () => {
  it('is a standalone document with the head and the body inside the app shell', () => {
    const html = statePage({ title: 'contact/idle', head: '<style>.x{}</style>', body: '<section>hi</section>' });
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain('<title>contact/idle</title>');
    expect(html).toContain('<style>.x{}</style>');
    expect(html).toContain('<div id="root"><div class="site"><main><section>hi</section></main></div></div>');
  });
});

describe('indexPage', () => {
  it('groups the states by section with a live preview and the scenario sentence', () => {
    const html = indexPage([
      { ref: { section: 'contact', state: 'idle', name: 'contact/idle', file: 'mocks/contact/idle.json' }, scenario: 'A visitor arrives.' },
      { ref: { section: 'contact', state: 'copied', name: 'contact/copied', file: 'mocks/contact/copied.json' }, scenario: undefined },
    ]);
    expect(html.match(/<h2>contact<\/h2>/g)).toHaveLength(1);
    expect(html).toContain('<iframe src="/contact/idle"');
    expect(html).toContain('<iframe src="/contact/copied"');
    expect(html).toContain('A visitor arrives.');
    expect(html).toContain('mocks/contact/copied.json');
  });

  it('escapes the scenario sentence', () => {
    const html = indexPage([
      { ref: { section: 's', state: 'x', name: 's/x', file: 'f' }, scenario: '<b>"hi"</b>' },
    ]);
    expect(html).toContain('&lt;b&gt;&quot;hi&quot;&lt;/b&gt;');
  });
});
