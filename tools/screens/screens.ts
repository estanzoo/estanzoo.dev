// Screen renderer library (blueprint Step 7, R5; owner decision 4). Pure functions that
// tools/screens/cli.mjs runs inside Vite SSR, so the real section Views render:
//
//   listMocks(dir)          every mocks/<section>/<state>.json, sorted by name
//   loadMock(dir, ref)      the mock layered over mocks/_defaults.json (mock keys win)
//   renderMock(reg, ref, m) parse m.vm with the section's schema, render its View to HTML;
//                           throws an Error whose message starts with the mock file
//   statePage(...)          a standalone HTML document around one rendered section
//   indexPage(entries)      the scenario index: states grouped by section, live previews
//
// Mock keys: 'vm' holds the section view model; '_scenario' is one sentence stating the
// visitor's situation, shown in the index. A mock lives at mocks/<section>/<state>.json;
// the section names its registry entry (src/screens/registry.ts).
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import type { Screen } from '../../src/screens/defineScreen';

export type MockRef = {
  section: string;
  state: string;
  /** '<section>/<state>': the URL path, the CLI argument and the output file name. */
  name: string;
  /** The mock file, relative to the working directory, for messages and the index. */
  file: string;
};

export type Mock = Record<string, unknown>;

const DEFAULTS = '_defaults.json';

function readJson(file: string): Mock {
  return JSON.parse(readFileSync(file, 'utf8')) as Mock;
}

export function listMocks(dir: string): MockRef[] {
  const refs: MockRef[] = [];
  for (const section of readdirSync(dir, { withFileTypes: true })) {
    if (!section.isDirectory()) continue;
    for (const file of readdirSync(join(dir, section.name))) {
      if (!file.endsWith('.json')) continue;
      const state = file.slice(0, -'.json'.length);
      refs.push({
        section: section.name,
        state,
        name: `${section.name}/${state}`,
        file: relative(process.cwd(), join(dir, section.name, file)),
      });
    }
  }
  return refs.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

export function loadMock(dir: string, ref: MockRef): Mock {
  const defaultsFile = join(dir, DEFAULTS);
  const defaults = existsSync(defaultsFile) ? readJson(defaultsFile) : {};
  return { ...defaults, ...readJson(join(dir, ref.section, `${ref.state}.json`)) };
}

export function renderMock(registry: Screen[], ref: MockRef, mock: Mock): string {
  const screen = registry.find((s) => s.section === ref.section);
  if (!screen) throw new Error(`${ref.file}: no section "${ref.section}" in src/screens/registry.ts`);
  const parsed = screen.schema.safeParse(mock.vm);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${['vm', ...i.path].join('.')}: ${i.message}`).join('\n');
    throw new Error(`${ref.file}: vm does not fit the ${ref.section} schema\n${issues}`);
  }
  return renderToString(createElement(screen.View, { vm: parsed.data as never }));
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** One rendered section inside the same shell as the real page (index.html + App.tsx). */
export function statePage({ title, head, body }: { title: string; head: string; body: string }): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <title>${escapeHtml(title)}</title>
    ${head}
  </head>
  <body>
    <div id="root"><div class="site"><main>${body}</main></div></div>
  </body>
</html>
`;
}

export function indexPage(entries: { ref: MockRef; scenario: string | undefined }[]): string {
  const sections = new Map<string, typeof entries>();
  for (const entry of entries) {
    sections.set(entry.ref.section, [...(sections.get(entry.ref.section) ?? []), entry]);
  }
  const groups = [...sections].map(
    ([section, rows]) => `<h2>${escapeHtml(section)}</h2>
<table>
${rows
  .map(
    ({ ref, scenario }) => `<tr>
  <td><iframe src="/${ref.name}" title="${escapeHtml(ref.name)}" loading="lazy"></iframe></td>
  <td><a href="/${ref.name}"><b>${escapeHtml(ref.state)}</b></a><p>${escapeHtml(scenario ?? ref.name)}</p><code>${escapeHtml(ref.file)}</code></td>
</tr>`,
  )
  .join('\n')}
</table>`,
  );
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Screens</title>
    <style>
      body { font: 14px/1.5 system-ui, sans-serif; margin: 24px; background: #f6f6f4; color: #111; }
      table { border-collapse: collapse; width: 100%; }
      td { vertical-align: top; padding: 12px; border-top: 1px solid #ddd; }
      td:first-child { width: 720px; }
      iframe { width: 1440px; height: 720px; border: 1px solid #ccc; transform: scale(0.5); transform-origin: 0 0; margin: 0 -720px -360px 0; background: #fff; }
      code { color: #666; }
    </style>
  </head>
  <body>
    <h1>Screens</h1>
    <p>Every mock under mocks/, grouped by section. Edit a mock or a View and reload.</p>
    ${groups.join('\n')}
  </body>
</html>
`;
}
