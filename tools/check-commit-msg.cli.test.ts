// Proves the git side of tools/check-commit-msg.ts against a throwaway repository: the
// message-file mode reads the staged paths, and the --commits mode checks each commit of a
// range, except the commits made before the rule existed (their tree has no
// tools/check-commit-msg.ts).
// Leaves to other layers: the rule itself (check-commit-msg.test.ts), the hooks and CI wiring.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// Inside a git hook (pre-commit runs test:related) git exports GIT_DIR, GIT_INDEX_FILE and
// GIT_CONFIG_PARAMETERS; drop them so the git calls below act on the throwaway repository.
for (const key of Object.keys(process.env)) if (key.startsWith('GIT_')) delete process.env[key];

const CLI = resolve(import.meta.dirname, 'check-commit-msg.ts');
let repo: string;

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
}

function write(path: string, text = path): void {
  mkdirSync(join(repo, path, '..'), { recursive: true });
  writeFileSync(join(repo, path), text);
}

function commit(subject: string, ...paths: string[]): string {
  for (const p of paths) write(p, `${p} ${subject}`);
  git('add', '-A');
  git('-c', 'core.hooksPath=/dev/null', 'commit', '-q', '--allow-empty', '-m', subject);
  return git('rev-parse', 'HEAD');
}

function cli(...args: string[]) {
  const r = spawnSync('node', [CLI, ...args], { cwd: repo, encoding: 'utf8' });
  return { status: r.status, stderr: r.stderr };
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'check-commit-msg-'));
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('message-file mode', () => {
  it('fails an untagged message when src/ is staged', () => {
    write('src/a.ts');
    git('add', '-A');
    write('MSG', '# comment\ntweak copy\n');
    const r = cli('MSG');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('[SPEC] Add the projects filter');
  });

  it('passes an untagged message when only other paths are staged', () => {
    write('README.md');
    git('add', 'README.md');
    write('MSG', 'tweak copy\n');
    expect(cli('MSG').status).toBe(0);
  });
});

describe('--commits mode', () => {
  it('checks the commits that carry the rule and skips the ones before it', () => {
    const base = commit('Add the site', 'src/old.ts');
    commit('Add the commit rule', 'tools/check-commit-msg.ts');
    commit('[SPEC] Add a section', 'src/new.ts');
    const bad = commit('tweak copy', 'src/new.ts');

    const all = cli('--commits', 'HEAD');
    expect(all.status).toBe(1);
    expect(all.stderr).toContain(bad.slice(0, 10));
    expect(all.stderr).not.toContain('Add the site');

    expect(cli('--commits', `${base}..HEAD~1`).status).toBe(0);
  });
});
