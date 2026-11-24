// Screenshot tests of every mock state (owner decision 6). Shared by playwright.config.ts,
// e2e/*.spec.ts and the approval page (tools/screenshots/approve.mjs):
//
//   PROJECTS               the two widths every screen is shot at
//   screenshotName(ref)    '<section>-<state>.png', the baseline file name
//   approvePage(...)       build/screens/approve.html: every baseline at both widths,
//                          grouped by section with the state's _scenario, for the owner
//
// Baselines live in e2e/__screenshots__/<project>/<section>-<state>.png and come only
// from the Playwright Docker image (npm run screenshots:update).

export const PROJECTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
] as const;

export type ProjectName = (typeof PROJECTS)[number]['name'];

export const DESIGN_URL = 'https://claude.ai/artifact/7SEsxq1uao9KNBUy9PFZm9#artboard-Panes';

export function screenshotName({ section, state }: { section: string; state: string }): string {
  return `${section}-${state}.png`;
}

export type ApproveEntry = { section: string; state: string; scenario: string | undefined };

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function approvePage({
  entries,
  src,
}: {
  entries: ApproveEntry[];
  /** The image URL of one baseline, relative to the approval page. */
  src: (project: ProjectName, file: string) => string;
}): string {
  const sections = new Map<string, ApproveEntry[]>();
  for (const entry of entries) sections.set(entry.section, [...(sections.get(entry.section) ?? []), entry]);

  const groups = [...sections].map(
    ([section, rows]) => `<h2 id="${escapeHtml(section)}">${escapeHtml(section)}</h2>
${rows
  .map((row) => {
    const file = screenshotName(row);
    const shots = PROJECTS.map(
      (p) => `<figure class="${p.name}"><figcaption>${p.name} · ${p.width}</figcaption><a href="${escapeHtml(src(p.name, file))}"><img src="${escapeHtml(src(p.name, file))}" alt="${escapeHtml(`${section}/${row.state} at ${p.width}`)}" loading="lazy" /></a></figure>`,
    ).join('\n');
    return `<article>
  <h3>${escapeHtml(row.state)}</h3>
  <p>${escapeHtml(row.scenario ?? `${section}/${row.state}`)}</p>
  <div class="shots">
${shots}
  </div>
</article>`;
  })
  .join('\n')}`,
  );

  const nav = [...sections.keys()].map((s) => `<a href="#${escapeHtml(s)}">${escapeHtml(s)}</a>`).join(' · ');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Screenshot approval</title>
    <style>
      body { font: 14px/1.5 system-ui, sans-serif; margin: 24px; background: #f6f6f4; color: #111; }
      h2 { margin-top: 48px; border-bottom: 1px solid #ccc; }
      article { margin: 24px 0; }
      h3 { margin: 0; font-family: ui-monospace, monospace; }
      .shots { display: flex; gap: 24px; align-items: flex-start; }
      figure { margin: 0; }
      figcaption { color: #666; font-size: 12px; }
      .desktop img { width: 720px; }
      .phone img { width: 195px; }
      img { display: block; border: 1px solid #ccc; background: #fff; }
    </style>
  </head>
  <body>
    <h1>Screenshot approval</h1>
    <p>Every baseline in e2e/__screenshots__/, at ${PROJECTS.map((p) => `${p.name} ${p.width}px`).join(' and ')}, grouped by section. Compare with the design: <a href="${DESIGN_URL}">${DESIGN_URL}</a>. Click a shot for full size.</p>
    <p>${nav}</p>
    ${groups.join('\n')}
  </body>
</html>
`;
}
