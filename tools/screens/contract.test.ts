// L1 unit: proves the mock contract library (blueprint Step 8, R6) on fixture mock folders.
// mockFailures parses every mock's vm (layered over _defaults.json) with its section's
// strict schema and renders it through the section View, and lists every broken mock with
// its file and cause. coverageGaps lists, per section, every union variant no mock shows
// and every optional/nullable/boolean property the mocks show with one value only.
// Leaves to other layers: the schema walk itself (src/testing/vmCoverage.test.ts) and the
// run over the real mocks (src/screens/contract.test.ts).
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineScreen } from '../../src/screens/defineScreen';
import { coverageGaps, mockFailures } from './contract';

type BadgeVm = { title: string; badge: { kind: 'on' } | { kind: 'off'; reason: string }; note?: string };

const badgeSchema: z.ZodType<BadgeVm> = z.strictObject({
  title: z.string(),
  badge: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('on') }),
    z.strictObject({ kind: z.literal('off'), reason: z.string() }),
  ]),
  note: z.string().optional(),
});

function BadgeView({ vm }: { vm: BadgeVm }) {
  if (vm.title === 'boom') throw new Error('the view broke');
  return createElement('h1', null, vm.title);
}

const registry = [defineScreen({ section: 'badge', schema: badgeSchema, View: BadgeView })];

function fixture(files: Record<string, unknown>): string {
  const dir = mkdtempSync(join(tmpdir(), 'contract-'));
  for (const [path, data] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), JSON.stringify(data));
  }
  return dir;
}

const on = { title: 'A', badge: { kind: 'on' }, note: 'n' };
const off = { title: 'B', badge: { kind: 'off', reason: 'r' } };

describe('mockFailures', () => {
  it('returns no failures when every mock parses and renders', () => {
    const dir = fixture({ '_defaults.json': {}, 'badge/on.json': { vm: on }, 'badge/off.json': { vm: off } });
    expect(mockFailures(dir, registry)).toEqual([]);
  });

  it('parses each mock layered over _defaults.json', () => {
    const dir = fixture({ '_defaults.json': { vm: on }, 'badge/inherits.json': {} });
    expect(mockFailures(dir, registry)).toEqual([]);
  });

  it('lists every broken mock at once, each naming its file and the unknown field', () => {
    const dir = fixture({
      '_defaults.json': {},
      'badge/a.json': { vm: { ...on, extra: 1 } },
      'badge/b.json': { vm: { ...off, badge: { kind: 'off', reason: 'r', colour: 'red' } } },
    });
    const failures = mockFailures(dir, registry);
    expect(failures).toHaveLength(2);
    expect(failures[0]).toMatch(/badge\/a\.json[\s\S]*vm: Unrecognized key: "extra"/);
    expect(failures[1]).toMatch(/badge\/b\.json[\s\S]*vm\.badge: Unrecognized key: "colour"/);
  });

  it('names a mock whose discriminator names no variant', () => {
    const dir = fixture({ '_defaults.json': {}, 'badge/x.json': { vm: { ...on, badge: { kind: 'maybe' } } } });
    expect(mockFailures(dir, registry)).toEqual([expect.stringMatching(/badge\/x\.json[\s\S]*vm\.badge/)]);
  });

  it('names a mock that the real View cannot render, with the cause', () => {
    const dir = fixture({ '_defaults.json': {}, 'badge/boom.json': { vm: { ...on, title: 'boom' } } });
    expect(mockFailures(dir, registry)).toEqual([expect.stringMatching(/badge\/boom\.json[\s\S]*the view broke/)]);
  });

  it('names a mock folder that has no section in the registry', () => {
    const dir = fixture({ '_defaults.json': {}, 'ghost/a.json': { vm: on } });
    expect(mockFailures(dir, registry)).toEqual([expect.stringMatching(/ghost\/a\.json.*no section "ghost"/)]);
  });
});

describe('coverageGaps', () => {
  it('returns no gaps when the mocks show every variant and both values', () => {
    const dir = fixture({ '_defaults.json': {}, 'badge/on.json': { vm: on }, 'badge/off.json': { vm: off } });
    expect(coverageGaps(dir, registry)).toEqual([]);
  });

  it('names the section, path and kind of a variant no mock shows', () => {
    const dir = fixture({ '_defaults.json': {}, 'badge/off.json': { vm: { ...off, note: 'x' } }, 'badge/off2.json': { vm: off } });
    expect(coverageGaps(dir, registry)).toEqual(['badge: badge variant on has no mock']);
  });

  it('names the section and path of a property the mocks show one way only', () => {
    const dir = fixture({ '_defaults.json': {}, 'badge/on.json': { vm: on }, 'badge/off.json': { vm: { ...off, note: 'x' } } });
    expect(coverageGaps(dir, registry)).toEqual(['badge: note (optional) is always present']);
  });

  it('counts only mocks that parse, and names every variant of a section with no mocks', () => {
    const dir = fixture({ '_defaults.json': {}, 'badge/bad.json': { vm: { ...on, extra: 1 } } });
    expect(coverageGaps(dir, registry)).toEqual([
      'badge: badge variant on has no mock',
      'badge: badge variant off has no mock',
      'badge: note (optional) is never shown',
    ]);
  });
});
