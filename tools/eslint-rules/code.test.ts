// R7 code test: every rule of eslint.config.js applied to the real code is clean, and the
// scan reaches what it must (a scan that finds nothing passes every rule): every section
// View and container is linted, with the rules its kind needs.
import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

const root = process.cwd();
const toRepo = (path: string) => relative(root, path).split(sep).join('/');

/** src/components/<section>/<File>, found on disk, independent of the lint config. */
function sectionFiles() {
  const views: string[] = [];
  const containers: string[] = [];
  for (const section of readdirSync('src/components')) {
    for (const file of readdirSync(join('src/components', section))) {
      const path = `src/components/${section}/${file}`;
      if (/^[A-Z][A-Za-z0-9]*View\.tsx$/.test(file)) views.push(path);
      else if (/^[A-Z][A-Za-z0-9]*\.tsx$/.test(file)) containers.push(path);
    }
  }
  return { views, containers };
}

const SECTION_RULES = ['local/content-boundary', 'local/design-tokens', 'local/ssr-safe-render'];

describe('lint rules on the real code', () => {
  const eslint = new ESLint({ cwd: root });
  const { views, containers } = sectionFiles();
  let results: ESLint.LintResult[];

  beforeAll(async () => {
    results = await eslint.lintFiles(['.']);
  }, 120_000);

  it('finds a View and a container for every section', () => {
    expect(views.length).toBeGreaterThanOrEqual(7);
    expect(containers.map((c) => c.replace(/\.tsx$/, 'View.tsx'))).toEqual(views);
  });

  it('the lint run is clean', () => {
    const problems = results.flatMap((r) =>
      r.messages.map((m) => `${toRepo(r.filePath)}:${m.line}:${m.column} ${m.ruleId ?? ''} ${m.message}`),
    );
    expect(problems).toEqual([]);
  });

  it('lints every View, every container, App.tsx and the VMs', () => {
    const linted = new Set(results.map((r) => toRepo(r.filePath)));
    const vms = containers.map((c) => c.replace(/\/([A-Z])([A-Za-z0-9]*)\.tsx$/, (_, a, b) => `/${a.toLowerCase()}${b}Vm.ts`));
    for (const file of [...views, ...containers, ...vms, 'src/App.tsx']) expect(linted, file).toContain(file);
  });

  it('every View gets the section rules and views-no-decisions', async () => {
    for (const view of views) {
      const { rules } = await eslint.calculateConfigForFile(view);
      for (const id of [...SECTION_RULES, 'local/views-no-decisions']) expect(rules[id]?.[0], `${view} ${id}`).toBe(2);
    }
  });

  it('every container gets the section rules but may decide', async () => {
    for (const container of containers) {
      const { rules } = await eslint.calculateConfigForFile(container);
      for (const id of SECTION_RULES) expect(rules[id]?.[0], `${container} ${id}`).toBe(2);
      expect(rules['local/views-no-decisions']?.[0] ?? 0, container).toBe(0);
    }
  });
});
