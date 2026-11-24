// Proves the committed git hooks (hooks/) against a throwaway repository: commit-msg runs the
// commit rule, pre-commit runs lint:staged, typecheck and test:related on the staged code
// files (and nothing when none is staged), and every hook then runs the matching beads hook
// from .beads/hooks/ when it is executable, failing when either fails.
// The npm scripts are stubs that log their call, so this tests the wiring, not ESLint,
// tsc or vitest.
// Leaves to other layers: the rule itself (check-commit-msg.test.ts), the real npm scripts.
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// Inside a git hook (pre-commit runs test:related) git exports GIT_DIR, GIT_INDEX_FILE and
// GIT_CONFIG_PARAMETERS; drop them so the git calls below act on the throwaway repository.
for (const key of Object.keys(process.env)) if (key.startsWith('GIT_')) delete process.env[key];

const ROOT = resolve(import.meta.dirname, '..');
let repo: string;

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
}

function write(path: string, text = path, mode?: number): void {
  mkdirSync(join(repo, path, '..'), { recursive: true });
  writeFileSync(join(repo, path), text);
  if (mode !== undefined) chmodSync(join(repo, path), mode);
}

function log(): string[] {
  const path = join(repo, 'calls.log');
  return existsSync(path) ? readFileSync(path, 'utf8').split('\n').filter(Boolean) : [];
}

/** A beads hook stub that logs its name and arguments, then exits with `status`. */
function beadsHook(name: string, status = 0, mode = 0o755): void {
  write(`.beads/hooks/${name}`, `#!/bin/sh\necho "beads ${name} $*" >> calls.log\nexit ${status}\n`, mode);
}

function commit(subject: string, ...paths: string[]) {
  for (const p of paths) write(p, `${p} ${Math.random()}`);
  git('add', ...paths);
  const r = spawnSync('git', ['-c', 'core.hooksPath=hooks', 'commit', '-q', '--allow-empty', '-m', subject], { cwd: repo, encoding: 'utf8' });
  return { status: r.status, stderr: r.stderr };
}

// npm appends the script's arguments to its command line; `sh -c '...' --` takes them as $@.
const stub = (name: string, status = 0) => `sh -c 'echo "${name} $*" >> calls.log; exit ${status}' --`;

function packageJson(scripts: Record<string, string> = {}): void {
  write(
    'package.json',
    JSON.stringify({ scripts: { 'lint:staged': stub('lint:staged'), typecheck: stub('typecheck'), 'test:related': stub('test:related'), ...scripts } }),
  );
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'hooks-'));
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
  cpSync(join(ROOT, 'hooks'), join(repo, 'hooks'), { recursive: true });
  cpSync(join(ROOT, 'tools/check-commit-msg.ts'), join(repo, 'tools/check-commit-msg.ts'));
  write('.gitignore', 'calls.log\n');
  packageJson();
  git('add', '-A');
  git('-c', 'core.hooksPath=/dev/null', 'commit', '-q', '-m', 'Set up');
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('commit-msg', () => {
  it('rejects an untagged commit that touches src/ and prints a correct example', () => {
    const r = commit('tweak copy', 'src/a.ts');
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('[SPEC] Add the projects filter');
    expect(git('rev-list', '--count', 'HEAD')).toBe('1');
  });

  it('accepts a [SPEC] commit that touches src/', () => {
    expect(commit('[SPEC] Add a', 'src/a.ts').status).toBe(0);
  });

  it('runs an executable beads commit-msg hook and fails when it fails', () => {
    beadsHook('commit-msg', 1);
    expect(commit('Add notes', 'notes.md').status).not.toBe(0);
    expect(log().some((l) => l.startsWith('beads commit-msg .git/COMMIT_EDITMSG'))).toBe(true);
  });
});

describe('pre-commit', () => {
  it('runs lint:staged, typecheck and test:related on the staged code files, then beads', () => {
    beadsHook('pre-commit');
    write('src/old.ts');
    git('add', 'src/old.ts');
    git('-c', 'core.hooksPath=/dev/null', 'commit', '-q', '-m', 'Add old');
    git('rm', '-q', 'src/old.ts');
    expect(commit('[SPEC] Add a', 'src/a.ts', 'src/b.tsx', 'notes.md').status).toBe(0);
    expect(log()).toEqual(['lint:staged ', 'typecheck ', 'test:related src/a.ts src/b.tsx', 'beads pre-commit ']);
  });

  it('runs none of the checks when no code file is staged, but still runs beads', () => {
    beadsHook('pre-commit');
    const r = commit('Add notes', 'notes.md', 'mocks/a.json');
    expect(r.status).toBe(0);
    expect(r.stderr).toBe('');
    expect(log()).toEqual(['beads pre-commit ']);
  });

  it('fails the commit when a check fails', () => {
    packageJson({ typecheck: stub('typecheck', 2) });
    git('add', 'package.json');
    git('-c', 'core.hooksPath=/dev/null', 'commit', '-q', '-m', 'Break typecheck');
    expect(commit('[SPEC] Add a', 'src/a.ts').status).not.toBe(0);
    expect(log()).toContain('typecheck ');
  });

  it('fails the commit when the beads hook fails', () => {
    beadsHook('pre-commit', 1);
    expect(commit('Add notes', 'notes.md').status).not.toBe(0);
  });

  it('skips a beads hook that is not executable', () => {
    beadsHook('pre-commit', 1, 0o644);
    expect(commit('Add notes', 'notes.md').status).toBe(0);
    expect(log()).toEqual([]);
  });
});

describe('beads pass-through hooks', () => {
  it('has a hook in hooks/ for every beads hook, so pointing git at hooks/ keeps beads running', () => {
    const beads = readdirSync(join(ROOT, '.beads/hooks'));
    for (const name of beads) expect(existsSync(join(ROOT, 'hooks', name)), name).toBe(true);
  });

  it('passes the arguments through and fails when beads fails', () => {
    beadsHook('prepare-commit-msg');
    expect(commit('Add notes', 'notes.md').status).toBe(0);
    expect(log()).toContain('beads prepare-commit-msg .git/COMMIT_EDITMSG message');
    beadsHook('prepare-commit-msg', 1);
    expect(commit('Add more notes', 'notes2.md').status).not.toBe(0);
  });
});
