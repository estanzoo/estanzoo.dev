// strict-vm-schemas walker (blueprint R6/R7). A view-model object must be strict
// (z.strictObject): a mock with an unknown field then fails the contract test, so a stale
// or misspelt mock field cannot pass silently.
//
//   nonStrictObjects(schema) -> paths
//
// walks a zod 4 schema and returns the path of every z.object or z.looseObject in it, in
// schema order. A path names object keys with '.', array elements with '[]', union options
// with '|<index>', record values with '{}', tuple items with '[<index>]', intersection sides
// with '&<index>', and the root as '(root)'. Wrappers (optional, nullable, default, lazy,
// pipe, ...) keep the path of what they wrap. vmCoverage.ts walks values against a schema;
// this walks the schema alone, so it is its own small walker.
import type { z } from 'zod';

type Schema = z.core.$ZodType;
type Def = { type: string } & Record<string, unknown>;

const def = (schema: Schema): Def => schema._zod.def as unknown as Def;
const key = (path: string, k: string) => (path ? `${path}.${k}` : k);

const WRAPPERS = ['optional', 'nullable', 'default', 'prefault', 'readonly', 'catch', 'nonoptional', 'promise'];

function walk(schema: Schema, path: string, seen: Set<Schema>): string[] {
  if (seen.has(schema)) return [];
  const below = new Set(seen).add(schema);
  const d = def(schema);
  const at = (child: unknown, p: string) => walk(child as Schema, p, below);

  if (WRAPPERS.includes(d.type)) return at(d.innerType, path);
  switch (d.type) {
    case 'lazy':
      return at((d.getter as () => Schema)(), path);
    case 'pipe':
      return [...at(d.in, path), ...at(d.out, path)];
    case 'object': {
      const strict = d.catchall !== undefined && def(d.catchall as Schema).type === 'never';
      const own = strict ? [] : [path || '(root)'];
      const shape = Object.entries(d.shape as Record<string, Schema>);
      return [...own, ...shape.flatMap(([k, child]) => at(child, key(path, k)))];
    }
    case 'array':
      return at(d.element, `${path}[]`);
    case 'union':
      return (d.options as Schema[]).flatMap((option, i) => at(option, `${path}|${i}`));
    case 'record':
      return at(d.valueType, `${path}{}`);
    case 'tuple':
      return [
        ...(d.items as Schema[]).flatMap((item, i) => at(item, `${path}[${i}]`)),
        ...(d.rest ? at(d.rest, `${path}[]`) : []),
      ];
    case 'intersection':
      return [...at(d.left, `${path}&0`), ...at(d.right, `${path}&1`)];
    default:
      return [];
  }
}

export function nonStrictObjects(schema: z.ZodType<unknown>): string[] {
  return walk(schema, '', new Set());
}
