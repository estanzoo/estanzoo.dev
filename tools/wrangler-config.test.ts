// Proves the Cloudflare Workers config serves exactly what the build writes: the static
// assets directory is Vite's output folder, and the Worker name matches the project.
// Leaves to other layers: the build itself (npm run build) and Cloudflare's own deploy.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..');

/** wrangler.jsonc allows // comments; strip whole-line comments before parsing. */
function readJsonc(path: string): Record<string, unknown> {
  const text = readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
  return JSON.parse(text) as Record<string, unknown>;
}

describe('wrangler.jsonc', () => {
  it('serves the static build output in dist as the Worker assets', () => {
    const config = readJsonc(resolve(ROOT, 'wrangler.jsonc'));
    expect(config.assets).toEqual({ directory: './dist' });
  });

  it('has a previews block, which wrangler preview needs for branch builds', () => {
    const config = readJsonc(resolve(ROOT, 'wrangler.jsonc'));
    expect(config.previews).toEqual({});
  });

  it('names the Worker estanzoo-dev and sets a compatibility date', () => {
    const config = readJsonc(resolve(ROOT, 'wrangler.jsonc'));
    expect(config.name).toBe('estanzoo-dev');
    expect(config.compatibility_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
