// L1 unit: proves the view-model coverage walker (blueprint Step 8, R6.6-7) on small
// fixture schemas. Given a zod 4 schema and the values of every mock, it lists each
// discriminated-union variant that no value shows, and each optional, nullable or boolean
// property that shows only one of its two values. It walks objects, arrays, unions,
// discriminated unions, optional/nullable/default/readonly wrappers, pipes and lazy
// (recursive) schemas, and names every gap by its path.
// Leaves to other layers: reading, parsing and rendering the real mocks
// (src/screens/contract.test.ts).
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { vmCoverage } from './vmCoverage';

const shape = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('circle'), r: z.number() }),
  z.strictObject({ kind: z.literal('square'), side: z.number() }),
]);

describe('vmCoverage - variants', () => {
  it('reports nothing when every variant of a union appears', () => {
    const schema = z.strictObject({ shape });
    expect(vmCoverage(schema, [{ shape: { kind: 'circle', r: 1 } }, { shape: { kind: 'square', side: 1 } }])).toEqual([]);
  });

  it('names the path and kind of a variant no value shows', () => {
    const schema = z.strictObject({ shape });
    expect(vmCoverage(schema, [{ shape: { kind: 'circle', r: 1 } }])).toEqual(['shape variant square has no mock']);
  });

  it('names a variant missing from a union at the root', () => {
    expect(vmCoverage(shape, [{ kind: 'square', side: 2 }])).toEqual(['(root) variant circle has no mock']);
  });

  it('finds unions inside array elements', () => {
    const schema = z.strictObject({ items: z.array(shape) });
    expect(vmCoverage(schema, [{ items: [{ kind: 'circle', r: 1 }] }, { items: [] }])).toEqual([
      'items[] variant square has no mock',
    ]);
  });

  it('finds unions nested inside a variant, under the variant path', () => {
    const schema = z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('box'), inner: shape }),
      z.strictObject({ kind: z.literal('empty') }),
    ]);
    const samples = [{ kind: 'box', inner: { kind: 'circle', r: 1 } }, { kind: 'empty' }];
    expect(vmCoverage(schema, samples)).toEqual(['(root)<box>.inner variant square has no mock']);
  });

  it('reports a union nested in a missing variant too, so every unreached variant is named', () => {
    const schema = z.strictObject({
      slot: z.discriminatedUnion('kind', [
        z.strictObject({ kind: z.literal('a') }),
        z.strictObject({ kind: z.literal('b'), inner: shape }),
      ]),
    });
    expect(vmCoverage(schema, [{ slot: { kind: 'a' } }])).toEqual([
      'slot variant b has no mock',
      'slot<b>.inner variant circle has no mock',
      'slot<b>.inner variant square has no mock',
    ]);
  });

  it('finds unions inside the members of a plain (non-discriminated) union', () => {
    const schema = z.strictObject({ v: z.union([z.string(), z.strictObject({ shape })]) });
    expect(vmCoverage(schema, [{ v: 'text' }, { v: { shape: { kind: 'circle', r: 1 } } }])).toEqual([
      'v.shape variant square has no mock',
    ]);
  });

  it('counts variants per path and walks lazy (recursive) schemas without looping', () => {
    type Node = { kind: 'leaf' } | { kind: 'branch'; children: Node[] };
    const node: z.ZodType<Node> = z.lazy(() =>
      z.discriminatedUnion('kind', [
        z.strictObject({ kind: z.literal('leaf') }),
        z.strictObject({ kind: z.literal('branch'), children: z.array(node) }),
      ]),
    );
    const tree = { kind: 'branch', children: [{ kind: 'leaf' }, { kind: 'branch', children: [] }] };
    expect(vmCoverage(node, [tree, { kind: 'leaf' }])).toEqual([]);
    expect(vmCoverage(node, [{ kind: 'branch', children: [{ kind: 'leaf' }] }, { kind: 'leaf' }])).toEqual([
      '(root)<branch>.children[] variant branch has no mock',
    ]);
    expect(vmCoverage(node, [{ kind: 'leaf' }])).toEqual(['(root) variant branch has no mock']);
  });
});

describe('vmCoverage - both values', () => {
  it('reports nothing when an optional field is absent in one value and present in another', () => {
    const schema = z.strictObject({ note: z.string().optional() });
    expect(vmCoverage(schema, [{}, { note: 'x' }])).toEqual([]);
  });

  it('names an optional field that is always present', () => {
    const schema = z.strictObject({ note: z.string().optional() });
    expect(vmCoverage(schema, [{ note: 'x' }, { note: 'y' }])).toEqual(['note (optional) is always present']);
  });

  it('names an optional field that is always absent', () => {
    const schema = z.strictObject({ note: z.string().optional() });
    expect(vmCoverage(schema, [{}])).toEqual(['note (optional) is always absent']);
  });

  it('names a nullable field that is always null', () => {
    const schema = z.strictObject({ note: z.string().nullable() });
    expect(vmCoverage(schema, [{ note: null }])).toEqual(['note (nullable) is always null']);
  });

  it('checks an optional nullable field once, counting null and absent as empty', () => {
    const schema = z.strictObject({ note: z.string().nullable().optional() });
    expect(vmCoverage(schema, [{}, { note: null }])).toEqual(['note (optional, nullable) is always empty']);
    expect(vmCoverage(schema, [{ note: null }, { note: 'x' }])).toEqual([]);
  });

  it('names a boolean that is always true, and one that is always false', () => {
    const schema = z.strictObject({ on: z.boolean(), off: z.boolean() });
    expect(vmCoverage(schema, [{ on: true, off: false }])).toEqual([
      'on (boolean) is always true',
      'off (boolean) is always false',
    ]);
  });

  it('checks fields inside array elements across every element of every value', () => {
    const schema = z.strictObject({ rows: z.array(z.strictObject({ done: z.boolean() })) });
    expect(vmCoverage(schema, [{ rows: [{ done: true }] }, { rows: [{ done: false }] }])).toEqual([]);
    expect(vmCoverage(schema, [{ rows: [{ done: true }, { done: true }] }])).toEqual([
      'rows[].done (boolean) is always true',
    ]);
  });

  it('checks fields of a variant only against the values of that variant', () => {
    const schema = z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('a'), flag: z.boolean() }),
      z.strictObject({ kind: z.literal('b') }),
    ]);
    expect(vmCoverage(schema, [{ kind: 'a', flag: true }, { kind: 'b' }])).toEqual([
      '(root)<a>.flag (boolean) is always true',
    ]);
  });

  it('names a field that no value reaches, e.g. inside an array that is always empty', () => {
    const schema = z.strictObject({ rows: z.array(z.strictObject({ done: z.boolean() })) });
    expect(vmCoverage(schema, [{ rows: [] }])).toEqual(['rows[].done (boolean) is never shown']);
  });

  it('looks through default, readonly and pipe wrappers', () => {
    const schema = z.strictObject({
      a: z.boolean().default(false),
      b: z.boolean().readonly(),
      c: z.string().pipe(z.string()).optional(),
    });
    expect(vmCoverage(schema, [{ a: true, b: true, c: 'x' }])).toEqual([
      'a (boolean) is always true',
      'b (boolean) is always true',
      'c (optional) is always present',
    ]);
  });

  it('ignores literals, strings and numbers', () => {
    const schema = z.strictObject({ k: z.literal('x'), s: z.string(), n: z.number() });
    expect(vmCoverage(schema, [{ k: 'x', s: 's', n: 1 }])).toEqual([]);
  });
});
