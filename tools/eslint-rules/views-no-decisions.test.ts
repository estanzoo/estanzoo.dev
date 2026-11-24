// R7 self-test of views-no-decisions: in a View the rule reports exactly each &&, ||, ??,
// ?:, if, switch and hook call, and nothing in property reads, .map, <Render>, <Optional>
// or JSX.
import { at, ruleTester } from './ruleTester';
import rule from './views-no-decisions';

const filename = at('src/components/demo/DemoView.tsx');
const decision = (what: string) =>
  `A View decides nothing: no ${what}. Move the decision into the container and give the View a <Render> union slot or an <Optional> value.`;
const hook = (name: string) =>
  `A View holds no state or effects: no hook ${name}(). Move it into the container and pass the result through the view model.`;

ruleTester.run('views-no-decisions', rule, {
  valid: [
    {
      filename,
      code: `
        import type { Views } from '../../vm/primitives';
        import { Optional, Render } from '../../vm/primitives';
        type Vm = { title: string; items: { id: string; label: string }[]; link: string | null; onX?: () => void };
        const views: Views<{ kind: 'a' }> = { a: () => <i /> };
        export function DemoView({ vm, onPick }: { vm: Vm; onPick?: (id: string) => void }) {
          return (
            <section aria-label={vm.title} onClick={() => onPick?.(vm.title)}>
              {vm.items.map((item) => <b key={item.id}>{item.label}</b>)}
              <Optional value={vm.link}>{(href) => <a href={href}>x</a>}</Optional>
              <Render vm={{ kind: 'a' }} views={views} />
            </section>
          );
        }`,
    },
    // A TypeScript conditional type is a type, not a runtime decision.
    { filename, code: 'type T<X> = X extends string ? 1 : 2;' },
    // Not hooks: a property named use..., and a lower-case "user" call.
    { filename, code: 'const a = vm.useCount; const b = user(1);' },
  ],
  invalid: [
    {
      filename,
      code: 'const a = vm.x && <i />;\nconst b = vm.y || 1;\nconst c = vm.z ?? 2;',
      errors: [
        { message: decision('&&'), line: 1, column: 11, endLine: 1, endColumn: 24 },
        { message: decision('||'), line: 2, column: 11 },
        { message: decision('??'), line: 3, column: 11 },
      ],
    },
    {
      filename,
      code: 'const a = vm.x ? 1 : 2;',
      errors: [{ message: decision('?:'), line: 1, column: 11 }],
    },
    {
      filename,
      code: 'function F() {\n  if (vm.x) return 1;\n  switch (vm.y) { default: return 2; }\n}',
      errors: [
        { message: decision('if'), line: 2, column: 3 },
        { message: decision('switch'), line: 3, column: 3 },
      ],
    },
    {
      filename,
      code: 'x ||= 1;\ny ??= 2;\nz &&= 3;',
      errors: [
        { message: decision('||='), line: 1, column: 1 },
        { message: decision('??='), line: 2, column: 1 },
        { message: decision('&&='), line: 3, column: 1 },
      ],
    },
    {
      filename,
      code: 'function F() {\n  const [a] = useState(0);\n  React.useEffect(() => {}, []);\n  useCustomThing();\n}',
      errors: [
        { message: hook('useState'), line: 2, column: 15 },
        { message: hook('useEffect'), line: 3, column: 3 },
        { message: hook('useCustomThing'), line: 4, column: 3 },
      ],
    },
  ],
});
