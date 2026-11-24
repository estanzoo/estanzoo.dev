import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const script = resolve(__dirname, 'worktree-env.sh');

// R1: offset = (first 8 hex of sha256('<checkout-dir-name>/site') mod 999) + 1
function expectedEnv(name: string): string {
  const hex = createHash('sha256').update(`${name}/site`).digest('hex').slice(0, 8);
  const off = (parseInt(hex, 16) % 999) + 1;
  return `DEV_PORT=${5200 + off}\nPREVIEW_PORT=${6200 + off}\nSCREENS_PORT=${7200 + off}\n`;
}

function run(args: string[], cwd: string): string {
  return execFileSync('bash', [script, ...args], { cwd, encoding: 'utf8' });
}

let root: string;

function checkout(name: string): string {
  const dir = join(root, name);
  mkdirSync(dir);
  return dir;
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'worktree-env-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('tools/worktree-env.sh', () => {
  it('writes the R1 ports for the checkout directory name', () => {
    const dir = checkout('estsite-20-3');

    run([dir], root);

    expect(readFileSync(join(dir, '.env'), 'utf8')).toBe(expectedEnv('estsite-20-3'));
  });

  it('writes the same ports for the same directory name in another place', () => {
    const a = checkout('same');
    const b = join(root, 'elsewhere', 'same');
    mkdirSync(b, { recursive: true });

    run([a], root);
    run([b], root);

    expect(readFileSync(join(b, '.env'), 'utf8')).toBe(readFileSync(join(a, '.env'), 'utf8'));
  });

  it('writes different ports for different directory names', () => {
    const a = checkout('estsite-20-3');
    const b = checkout('estsite-20-4');

    run([a], root);
    run([b], root);

    expect(readFileSync(join(a, '.env'), 'utf8')).not.toBe(readFileSync(join(b, '.env'), 'utf8'));
  });

  it('resolves a relative checkout path against the current directory', () => {
    const dir = checkout('relative');

    run(['relative'], root);

    expect(readFileSync(join(dir, '.env'), 'utf8')).toBe(expectedEnv('relative'));
  });

  it('keeps an existing .env', () => {
    const dir = checkout('kept');
    writeFileSync(join(dir, '.env'), 'DEV_PORT=1234\n');

    run([dir], root);

    expect(readFileSync(join(dir, '.env'), 'utf8')).toBe('DEV_PORT=1234\n');
  });

  it('rewrites an existing .env with --force', () => {
    const dir = checkout('forced');
    writeFileSync(join(dir, '.env'), 'DEV_PORT=1234\n');

    run(['--force', dir], root);

    expect(readFileSync(join(dir, '.env'), 'utf8')).toBe(expectedEnv('forced'));
  });

  it('prints the same output on every run', () => {
    const dir = checkout('stable');

    const first = run(['--force', dir], root);
    const second = run(['--force', dir], root);

    expect(first).toBe(second);
    expect(first).toContain('DEV_PORT=');
  });

  it('defaults to the checkout that holds the script', () => {
    const repo = resolve(__dirname, '..');
    const env = join(repo, '.env');
    const before = existsSync(env) ? readFileSync(env, 'utf8') : undefined;

    const out = run([], root);

    expect(out).toContain(env);
    if (before !== undefined) expect(readFileSync(env, 'utf8')).toBe(before);
  });

  it('fails for a checkout directory that does not exist', () => {
    expect(() => run([join(root, 'missing')], root)).toThrow();
  });
});
