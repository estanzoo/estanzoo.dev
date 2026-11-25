import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const script = resolve(__dirname, 'worktree-env.sh');

// Ports that browsers refuse with net::ERR_UNSAFE_PORT, inside the three port
// ranges (5201-6199, 6201-7199, 7201-8199). Union of Chromium's kRestrictedPorts
// (net/base/port_util.cc) and the Fetch spec's bad port list, read 2026-11-24.
const BLOCKED_IN_RANGES = [6000, 6566, 6665, 6666, 6667, 6668, 6669, 6679, 6697];

// R1: offset = (first 8 hex of sha256('<checkout-dir-name>/site') mod 999) + 1
function hashOffset(name: string): number {
  const hex = createHash('sha256').update(`${name}/site`).digest('hex').slice(0, 8);
  return (parseInt(hex, 16) % 999) + 1;
}

// A blocked port moves up to the next unblocked port of its range.
function safePort(base: number, off: number): number {
  let o = off;
  while (BLOCKED_IN_RANGES.includes(base + o)) o = (o % 999) + 1;
  return base + o;
}

function expectedEnv(name: string): string {
  const off = hashOffset(name);
  return `DEV_PORT=${safePort(5200, off)}\nPREVIEW_PORT=${safePort(6200, off)}\nSCREENS_PORT=${safePort(7200, off)}\n`;
}

function ports(envText: string): Record<string, number> {
  return Object.fromEntries(
    envText.trim().split('\n').map((line) => {
      const [key, value] = line.split('=');
      return [key, Number(value)];
    }),
  );
}

// The first generated name whose hash offset lands its range's port on 'port'.
function nameLandingOn(port: number): string {
  const base = port < 6200 ? 5200 : port < 7200 ? 6200 : 7200;
  for (let i = 0; ; i++) {
    const name = `blocked-${port}-${i}`;
    if (base + hashOffset(name) === port) return name;
  }
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

  it('moves a blocked port to the next port of its range that is not blocked', () => {
    // 6667 (IRC) is the port a real checkout got. 6668 and 6669 are blocked too,
    // so the next safe preview port is 6670. The dev and screens ports keep the hash.
    const name = nameLandingOn(6667);
    const dir = checkout(name);

    run([dir], root);

    expect(ports(readFileSync(join(dir, '.env'), 'utf8'))).toEqual({
      DEV_PORT: 5200 + 467,
      PREVIEW_PORT: 6670,
      SCREENS_PORT: 7200 + 467,
    });
  });

  it('moves a blocked dev port (6000, X11) to the next port', () => {
    const dir = checkout(nameLandingOn(6000));

    run([dir], root);

    expect(ports(readFileSync(join(dir, '.env'), 'utf8')).DEV_PORT).toBe(6001);
  });

  it('never writes a blocked port, and keeps the three ports distinct and in range', () => {
    // One name that lands on each blocked port of the ranges, plus generic names.
    const names = [
      ...BLOCKED_IN_RANGES.map((port) => nameLandingOn(port)),
      ...Array.from({ length: 12 }, (_, i) => `sweep-${i}`),
    ];
    for (const name of names) {
      const dir = checkout(name);

      run([dir], root);

      const env = readFileSync(join(dir, '.env'), 'utf8');
      const p = ports(env);
      expect(env).toBe(expectedEnv(name));
      for (const port of Object.values(p)) expect(BLOCKED_IN_RANGES).not.toContain(port);
      expect(p.DEV_PORT).toBeGreaterThan(5200);
      expect(p.DEV_PORT).toBeLessThan(6200);
      expect(p.PREVIEW_PORT).toBeGreaterThan(6200);
      expect(p.PREVIEW_PORT).toBeLessThan(7200);
      expect(p.SCREENS_PORT).toBeGreaterThan(7200);
      expect(p.SCREENS_PORT).toBeLessThan(8200);
    }
  }, 60_000);

  it('fails for a checkout directory that does not exist', () => {
    expect(() => run([join(root, 'missing')], root)).toThrow();
  });
});
