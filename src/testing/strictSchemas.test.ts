// strict-vm-schemas (blueprint R6/R7): every object in a view-model schema is strict, so a
// mock with a misspelt or stale field fails the contract test instead of being ignored.
// Self-test: the walker names exactly each non-strict object, wherever it sits. Code test:
// every schema of the screen registry (src/screens/registry.ts) is strict throughout.
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { screens } from '../screens/registry';
import { nonStrictObjects } from './strictSchemas';

describe('nonStrictObjects', () => {
  it('a schema of strict objects has none', () => {
    const schema = z.strictObject({
      a: z.string(),
      b: z.array(z.strictObject({ c: z.number() })).optional(),
      d: z.discriminatedUnion('kind', [z.strictObject({ kind: z.literal('x') }), z.strictObject({ kind: z.literal('y') })]),
    });
    expect(nonStrictObjects(schema)).toEqual([]);
  });

  it('names the root, z.object and z.looseObject', () => {
    expect(nonStrictObjects(z.object({ a: z.string() }))).toEqual(['(root)']);
    expect(nonStrictObjects(z.strictObject({ a: z.looseObject({}) }))).toEqual(['a']);
  });

  it('finds non-strict objects inside every wrapper and container', () => {
    const loose = z.object({ x: z.string() });
    const schema = z.strictObject({
      optional: loose.optional(),
      nullable: loose.nullable(),
      array: z.array(loose),
      union: z.union([z.string(), loose]),
      variants: z.discriminatedUnion('kind', [
        z.strictObject({ kind: z.literal('a') }),
        z.object({ kind: z.literal('b') }),
      ]),
      record: z.record(z.string(), loose),
      tuple: z.tuple([z.string(), loose]),
      both: z.intersection(loose, z.strictObject({})),
      lazy: z.lazy(() => loose),
      piped: loose.transform((v) => v),
      fallback: loose.default({ x: '' }),
      readonly: loose.readonly(),
    });
    expect(nonStrictObjects(schema)).toEqual([
      'optional',
      'nullable',
      'array[]',
      'union|1',
      'variants|1',
      'record{}',
      'tuple[1]',
      'both&0',
      'lazy',
      'piped',
      'fallback',
      'readonly',
    ]);
  });

  it('terminates on a recursive schema', () => {
    type Tree = { children: Tree[] };
    const tree: z.ZodType<Tree> = z.object({ children: z.array(z.lazy(() => tree)) });
    expect(nonStrictObjects(tree)).toEqual(['(root)']);
  });
});

describe('the view-model schemas of the screen registry', () => {
  it('lists every section', () => {
    expect(screens.map((s) => s.section).sort()).toEqual(
      ['about', 'contact', 'experience', 'header', 'hero', 'interests', 'projects'],
    );
  });

  it.each(screens.map((s) => [s.section, s] as const))('%s: every object is strict', (_, screen) => {
    expect(nonStrictObjects(screen.schema)).toEqual([]);
  });
});
