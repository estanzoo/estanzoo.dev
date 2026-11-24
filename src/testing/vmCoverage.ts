// View-model coverage walker (blueprint Step 8, R6.6-7). A View branches only through
// union slots (<Render>) and empty-or-present values (<Optional>), so covering every
// variant and both values of every optional, nullable or boolean property covers every
// visual branch.
//
//   vmCoverage(schema, samples) -> gaps
//
// walks a zod 4 schema together with the values of every mock (already parsed) and
// returns one line per gap, in schema order:
//
//   '<path> variant <kind> has no mock'        a discriminated-union variant no value shows
//   '<path> (optional) is always present'      also: always absent / (nullable) always null /
//                                              (optional, nullable) always empty
//   '<path> (boolean) is always true'          or always false
//   '<path> (...) is never shown'              no value reaches the property at all
//
// A path names object keys with '.', array elements with '[]', the variant a property sits
// in with '<kind>', and the root as '(root)'. E.g. 'items[]<box>.inner'.
import type { z } from 'zod';

type Schema = z.core.$ZodType;
type Def = { type: string } & Record<string, unknown>;

const def = (schema: Schema): Def => schema._zod.def as unknown as Def;

const show = (path: string) => path || '(root)';
const key = (path: string, k: string) => (path ? `${path}.${k}` : k);
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Peels wrappers that do not change what is drawn; notes optional and nullable on the way. */
function unwrap(schema: Schema): { inner: Schema; optional: boolean; nullable: boolean } {
  let inner = schema;
  let optional = false;
  let nullable = false;
  for (;;) {
    const d = def(inner);
    if (d.type === 'optional') optional = true;
    if (d.type === 'nullable') nullable = true;
    if (['optional', 'nullable', 'default', 'prefault', 'readonly', 'catch', 'nonoptional'].includes(d.type)) {
      inner = d.innerType as Schema;
    } else if (d.type === 'pipe') {
      inner = d.in as Schema;
    } else if (d.type === 'lazy') {
      inner = (d.getter as () => Schema)();
    } else {
      return { inner, optional, nullable };
    }
  }
}

function oneSided(path: string, label: string, samples: unknown[], yes: (v: unknown) => boolean, words: [string, string]) {
  if (samples.length === 0) return [`${show(path)} (${label}) is never shown`];
  const hits = samples.filter(yes).length;
  if (hits === samples.length) return [`${show(path)} (${label}) is always ${words[0]}`];
  if (hits === 0) return [`${show(path)} (${label}) is always ${words[1]}`];
  return [];
}

/** The literal values an option of a discriminated union takes on its discriminator. */
function kindsOf(option: Schema, discriminator: string): unknown[] {
  const shape = def(unwrap(option).inner).shape as Record<string, Schema>;
  return def(unwrap(shape[discriminator]).inner).values as unknown[];
}

function walk(schema: Schema, samples: unknown[], path: string, seen: Set<Schema>): string[] {
  const { inner, optional, nullable } = unwrap(schema);
  const gaps: string[] = [];

  if (optional || nullable) {
    const label = [optional && 'optional', nullable && 'nullable'].filter(Boolean).join(', ');
    const empty = optional && nullable ? 'empty' : optional ? 'absent' : 'null';
    gaps.push(...oneSided(path, label, samples, (v) => v !== undefined && v !== null, ['present', empty]));
  }

  // A schema met again with no values to look at (a recursive lazy) has nothing new to say.
  if (samples.length === 0 && (seen.has(schema) || seen.has(inner))) return gaps;
  const below = new Set(seen).add(schema).add(inner);
  const present = samples.filter((v) => v !== undefined && v !== null);
  const d = def(inner);

  switch (d.type) {
    case 'boolean':
      gaps.push(...oneSided(path, 'boolean', present, (v) => v === true, ['true', 'false']));
      break;
    case 'object': {
      const objects = present.filter(isObject);
      for (const [k, child] of Object.entries(d.shape as Record<string, Schema>)) {
        gaps.push(...walk(child, objects.map((o) => o[k]), key(path, k), below));
      }
      break;
    }
    case 'array':
      gaps.push(...walk(d.element as Schema, present.flatMap((v) => (Array.isArray(v) ? v : [])), `${show(path)}[]`, below));
      break;
    case 'union': {
      const options = d.options as Schema[];
      const discriminator = d.discriminator as string | undefined;
      if (discriminator) {
        for (const option of options) {
          const kinds = kindsOf(option, discriminator);
          const mine = present.filter((v) => isObject(v) && kinds.includes(v[discriminator]));
          const kind = kinds.map(String).join('|');
          if (mine.length === 0) gaps.push(`${show(path)} variant ${kind} has no mock`);
          gaps.push(...walk(option, mine, `${show(path)}<${kind}>`, below));
        }
      } else {
        for (const option of options) {
          gaps.push(...walk(option, present.filter((v) => isMember(option, v)), path, below));
        }
      }
      break;
    }
  }
  return gaps;
}

function isMember(option: Schema, value: unknown): boolean {
  const result = option['~standard'].validate(value);
  return !(result instanceof Promise) && !result.issues;
}

export function vmCoverage(schema: z.ZodType<unknown>, samples: unknown[]): string[] {
  return walk(schema, samples, '', new Set());
}
