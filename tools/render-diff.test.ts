// Contract tests for tools/render-diff.sh (blueprint Step 10b, R9). Each test drives the real
// script against a throwaway git repo whose `screens:renderAll` is a tiny shell renderer:
// it writes build/screens/<page>.html from pages/<page>.txt, puts the checkout path into
// every page (like an absolute asset URI), and fails on a page that says BROKEN.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const script = resolve(__dirname, 'render-diff.sh');

const RENDERER = `#!/bin/sh
for f in $(find pages -name "*.txt" | sort); do
  page=\${f#pages/}; page=\${page%.txt}
  if grep -q BROKEN "$f"; then echo "cannot render: $PWD/pages/$page.txt is broken" >&2; exit 1; fi
  mkdir -p build/screens/$(dirname "$page")
  { cat "$f"; echo "<link href=\\"$PWD/assets/font.woff2\\">"; } > build/screens/$page.html
done
`;

let root: string;
let repo: string;
let tmp: string;

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
}

function write(path: string, content: string): void {
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), content);
}

function packageJson(scripts: Record<string, string>): string {
  return JSON.stringify({ name: 'fake', version: '1.0.0', private: true, scripts }, null, 2);
}

function commit(message: string): void {
  git('add', '-A');
  git('commit', '-q', '-m', message);
}

function run(args: string[] = [], opts: { cwd?: string; env?: Record<string, string> } = {}) {
  const r = spawnSync('bash', [script, ...args], {
    cwd: opts.cwd ?? repo,
    encoding: 'utf8',
    env: { ...process.env, TMPDIR: tmp, BUILD_SLOTS_DIR: join(root, 'slots'), ...opts.env },
  });
  return { status: r.status, out: r.stdout + r.stderr };
}

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'render-diff-')));
  repo = join(root, 'repo');
  tmp = join(root, 'tmp');
  mkdirSync(repo);
  mkdirSync(tmp);
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
  write('package.json', packageJson({ 'screens:renderAll': 'sh render.sh' }));
  write(
    'package-lock.json',
    JSON.stringify({ name: 'fake', version: '1.0.0', lockfileVersion: 3, requires: true, packages: { '': { name: 'fake', version: '1.0.0' } } }),
  );
  write('.gitignore', 'build/\nnode_modules/\n');
  write('render.sh', RENDERER);
  write('pages/contact/idle.txt', '<p>Say hello</p>\n');
  write('pages/contact/copied.txt', '<p>Copied</p>\n');
  commit('base');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('tools/render-diff.sh', () => {
  it('exits 0 when no page changed, although each page holds its checkout path', () => {
    const r = run(['HEAD']);

    expect(r.out).toContain('render-diff: no page changed');
    expect(r.status).toBe(0);
  });

  it('exits 1 and names the page after an uncommitted text change', () => {
    write('pages/contact/idle.txt', '<p>Say hi</p>\n');

    const r = run(['HEAD']);

    expect(r.out).toContain('changed: contact/idle');
    expect(r.out).not.toContain('contact/copied');
    expect(r.status).toBe(1);
  });

  it('names added and removed pages', () => {
    write('pages/contact/blocked.txt', '<p>Blocked</p>\n');
    rmSync(join(repo, 'pages/contact/copied.txt'));

    const r = run(['HEAD']);

    expect(r.out).toContain('added: contact/blocked');
    expect(r.out).toContain('removed: contact/copied');
    expect(r.status).toBe(1);
  });

  it('does not count stale pages left in the working tree build folder', () => {
    write('build/screens/old/gone.html', 'stale');

    const r = run(['HEAD']);

    expect(r.status).toBe(0);
  });

  it('exits 2 and names the working tree when a page there cannot render', () => {
    write('pages/contact/idle.txt', 'BROKEN\n');

    const r = run(['HEAD']);

    expect(r.out).toContain('render-diff: cannot render the working tree');
    expect(r.out).toContain('cannot render: static:/pages/contact/idle.txt is broken');
    expect(r.out).not.toContain(repo);
    expect(r.status).toBe(2);
  });

  it('exits 2 and names the base when the base cannot render', () => {
    write('pages/contact/idle.txt', 'BROKEN\n');
    commit('break');
    write('pages/contact/idle.txt', '<p>Say hello</p>\n');

    const r = run(['HEAD']);

    expect(r.out).toContain('render-diff: cannot render the base');
    expect(r.status).toBe(2);
  });

  it('exits 2 and names the base when the base has no screens:renderAll', () => {
    write('package.json', packageJson({}));
    commit('no renderer');
    write('package.json', packageJson({ 'screens:renderAll': 'sh render.sh' }));

    const r = run(['HEAD']);

    expect(r.out).toMatch(/render-diff: the base \([0-9a-f]+\) has no screens:renderAll/);
    expect(r.status).toBe(2);
  });

  it('defaults the base to the merge-base with main', () => {
    git('checkout', '-q', '-b', 'feature');
    write('pages/contact/idle.txt', '<p>Feature text</p>\n');
    commit('feature');

    const r = run();

    expect(r.out).toContain(`base ${git('rev-parse', 'main')}`);
    expect(r.out).toContain('changed: contact/idle');
    expect(r.status).toBe(1);
  });

  it('works from a subdirectory of the checkout', () => {
    write('pages/contact/idle.txt', '<p>Say hi</p>\n');

    const r = run(['HEAD'], { cwd: join(repo, 'pages/contact') });

    expect(r.out).toContain('changed: contact/idle');
    expect(r.status).toBe(1);
  });

  it('removes the temporary worktree and its temp folders, also after a failure', () => {
    write('pages/contact/idle.txt', 'BROKEN\n');

    run(['HEAD']);

    expect(git('worktree', 'list', '--porcelain').match(/^worktree /gm)).toHaveLength(1);
    expect(readdirSync(tmp).filter((f) => f.startsWith('render-diff'))).toEqual([]);
  });

  it('keeps both output folders with KEEP=1 and prints their paths', () => {
    write('pages/contact/idle.txt', '<p>Say hi</p>\n');

    const r = run(['HEAD'], { env: { KEEP: '1' } });

    const base = r.out.match(/^kept base: (.+)$/m)?.[1];
    const tree = r.out.match(/^kept tree: (.+)$/m)?.[1];
    expect(base && existsSync(join(base, 'contact/idle.html'))).toBe(true);
    expect(tree && existsSync(join(tree, 'contact/idle.html'))).toBe(true);
    expect(git('worktree', 'list', '--porcelain').match(/^worktree /gm)).toHaveLength(1);
    expect(r.status).toBe(1);
  });
});
