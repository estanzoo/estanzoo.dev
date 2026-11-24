// Write build/screens/approve.html (npm run screens:approve): every screenshot baseline
// in e2e/__screenshots__/ at both widths, grouped by section with each state's
// _scenario, plus the real site's full-page shot and a link to the design. The owner
// approves the baselines from this page. Exits 1 and names each missing baseline.
// The page layout lives in tools/screenshots/shots.ts (unit-tested).
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listMocks, loadMock } from '../screens/screens.ts';
import { approvePage, PROJECTS, screenshotName } from './shots.ts';

const root = fileURLToPath(new URL('../..', import.meta.url));
const mocks = join(root, 'mocks');
const shots = join(root, 'e2e/__screenshots__');
const out = join(root, 'build/screens/approve.html');

const entries = [
  ...listMocks(mocks).map((ref) => ({
    section: ref.section,
    state: ref.state,
    scenario: loadMock(mocks, ref)._scenario,
  })),
  { section: 'site', state: 'full', scenario: 'The real built site, whole page, intro already seen (e2e/site.spec.ts).' },
];

const missing = entries.flatMap((e) =>
  PROJECTS.map((p) => join(shots, p.name, screenshotName(e))).filter((f) => !existsSync(f)),
);
if (missing.length) {
  for (const f of missing) console.error(`no baseline: ${relative(root, f)}`);
  console.error('run npm run screenshots:update');
  process.exit(1);
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(
  out,
  approvePage({ entries, src: (project, file) => relative(dirname(out), join(shots, project, file)) }),
);
console.log(`wrote ${out}`);
