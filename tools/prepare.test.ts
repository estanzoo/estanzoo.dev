// Proves the npm 'prepare' script (run by npm ci and npm install) points git at the committed
// hooks/ in a git checkout, and does nothing in CI or outside a git checkout.
// Leaves to other layers: the hooks themselves (hooks.test.ts).
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// Inside a git hook (pre-commit runs test:related) git exports GIT_DIR, GIT_INDEX_FILE and
// GIT_CONFIG_PARAMETERS; drop them so the git calls below act on the throwaway repository.
for (const key of Object.keys(process.env)) if (key.startsWith('GIT_')) delete process.env[key];

const PREPARE: string = JSON.parse(readFileSync(resolve(import.meta.dirname, '../package.json'), 'utf8')).scripts.prepare;
let dir: string;

function prepare(env: Record<string, string> = {}) {
  const { CI: _ci, ...rest } = process.env;
  return spawnSync('sh', ['-c', PREPARE], { cwd: dir, encoding: 'utf8', env: { ...rest, ...env } });
}

function hooksPath(): string {
  const r = spawnSync('git', ['config', '--local', '--get', 'core.hooksPath'], { cwd: dir, encoding: 'utf8' });
  return r.stdout.trim();
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'prepare-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('npm prepare', () => {
  it('sets core.hooksPath to hooks in a git checkout', () => {
    execFileSync('git', ['init', '-q'], { cwd: dir });
    expect(prepare().status).toBe(0);
    expect(hooksPath()).toBe('hooks');
  });

  it('leaves git alone in CI', () => {
    execFileSync('git', ['init', '-q'], { cwd: dir });
    expect(prepare({ CI: 'true' }).status).toBe(0);
    expect(hooksPath()).toBe('');
  });

  it('succeeds and does nothing outside a git checkout', () => {
    const r = prepare({ GIT_CEILING_DIRECTORIES: tmpdir() });
    expect(r.status).toBe(0);
    expect(r.stderr).toBe('');
  });
});
