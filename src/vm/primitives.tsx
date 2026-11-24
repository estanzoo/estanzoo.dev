// View primitives (blueprint Step 8, owner decision 3). A section View is logic-free:
// it reads properties, maps over arrays, and branches only through these two.
//
//   <Render vm={slot} views={slotViews} />
//     A slot that can look different is a union discriminated by 'kind'. `views` maps
//     every kind to the component that draws it (TypeScript checks the map is complete).
//     Throws on a null/undefined slot or an unknown kind, so a broken VM fails loudly
//     instead of rendering nothing.
//
//   <Optional value={x}>{(v) => ...}</Optional>
//     Draws its child only when x is not null/undefined. The only way a View leaves
//     something out. Falsy values (0, '') are present values and are drawn.
import type { ComponentType, ReactNode } from 'react';

/** A view model slot with variants: each variant names itself in 'kind'. */
export type Variant = { kind: string };

/** One component per kind of the union V, each receiving its own variant. */
export type Views<V extends Variant> = {
  [K in V['kind']]: ComponentType<{ vm: Extract<V, { kind: K }> }>;
};

export function Render<V extends Variant>({ vm, views }: { vm: V; views: Views<V> }) {
  if (vm === null || vm === undefined) throw new Error(`Render: the vm slot is ${vm}`);
  const View = (views as unknown as Record<string, ComponentType<{ vm: V }> | undefined>)[vm.kind];
  if (!View) {
    throw new Error(`Render: no view for kind "${vm.kind}" (known: ${Object.keys(views).join(', ')})`);
  }
  return <View vm={vm} />;
}

export function Optional<T>({
  value,
  children,
}: {
  value: T | null | undefined;
  children: (value: T) => ReactNode;
}) {
  if (value === null || value === undefined) return null;
  return <>{children(value)}</>;
}
