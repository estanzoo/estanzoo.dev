// R7 self-test of ssr-safe-render: the rule reports exactly each browser global read on
// the render path (anywhere in a View; in a container, outside effects, handlers and ref
// callbacks), and nothing that runs only after mount or on an event.
import { at, ruleTester } from './ruleTester';
import rule from './ssr-safe-render';

const container = at('src/components/demo/Demo.tsx');
const view = at('src/components/demo/DemoView.tsx');
const inView = (name: string) =>
  `${name} is not available while the page pre-renders: a View draws only its view model and never reads ${name}.`;
const inRender = (name: string) =>
  `${name} is not available while the page pre-renders: read it in a useEffect/useLayoutEffect callback, an event handler or a ref callback, not on the render path.`;

ruleTester.run('ssr-safe-render', rule, {
  valid: [
    {
      filename: container,
      code: `
        import { useCallback, useEffect, useLayoutEffect } from 'react';
        function reducedMotion() { return window.matchMedia('(x)').matches; }
        export function Demo() {
          useEffect(() => { document.title = 'x'; reducedMotion(); }, []);
          useLayoutEffect(function () { localStorage.getItem('k'); });
          const at = (ms: number) => window.setTimeout(() => {}, ms);
          const later = () => at(5);
          const onCopy = useCallback(() => navigator.clipboard.writeText('x').then(() => sessionStorage.clear()), []);
          function onKey() { later(); }
          return (
            <div
              onClick={() => window.scrollTo(0, 0)}
              onKeyDown={onKey}
              onCopy={onCopy}
              ref={(el) => { if (el) el.style.width = String(window.innerWidth); }}
            />
          );
        }`,
    },
    // A local or a parameter that shadows the global is not the global.
    {
      filename: container,
      code: 'export function Demo({ window }: { window: number }) { const document = 1; return <i>{window + document}</i>; }',
    },
    // A property that happens to be called window is not the global.
    { filename: container, code: 'export function Demo({ vm }: { vm: { window: string } }) { return <i>{vm.window}</i>; }' },
    // A type that names a browser global is not a read.
    { filename: view, code: 'type W = typeof window; export function DemoView(_: { w?: W; e?: Window }) { return <i />; }' },
  ],
  invalid: [
    {
      filename: view,
      code: 'export function DemoView() {\n  return <i onClick={() => window.scrollTo(0, 0)} />;\n}',
      errors: [{ message: inView('window'), line: 2, column: 28, endLine: 2, endColumn: 34 }],
    },
    {
      // Every one of the six names.
      filename: container,
      code: [
        'export function Demo() {',
        '  const w = window.innerWidth;',
        '  const d = document.title;',
        '  const n = navigator.language;',
        '  const l = localStorage.length;',
        '  const s = sessionStorage.length;',
        "  const m = matchMedia('(x)');",
        '  return <i>{w}{d}{n}{l}{s}{m.media}</i>;',
        '}',
      ].join('\n'),
      errors: [
        { message: inRender('window'), line: 2, column: 13 },
        { message: inRender('document'), line: 3, column: 13 },
        { message: inRender('navigator'), line: 4, column: 13 },
        { message: inRender('localStorage'), line: 5, column: 13 },
        { message: inRender('sessionStorage'), line: 6, column: 13 },
        { message: inRender('matchMedia'), line: 7, column: 13 },
      ],
    },
    {
      // JSX expressions, render-time callbacks (.map, useState/useMemo initialisers, an
      // IIFE) and a custom hook body all run while rendering.
      filename: container,
      code: [
        "import { useMemo, useState } from 'react';",
        'function useWidth() { return window.innerWidth; }',
        'export function Demo({ items }: { items: string[] }) {',
        '  const [a] = useState(() => localStorage.getItem("k"));',
        '  const b = useMemo(() => navigator.language, []);',
        '  const c = (() => document.title)();',
        '  return <ul title={a + b + c + useWidth()}>{items.map((i) => <li key={i}>{window.name}</li>)}</ul>;',
        '}',
      ].join('\n'),
      errors: [
        { message: inRender('window'), line: 2, column: 30 },
        { message: inRender('localStorage'), line: 4, column: 30 },
        { message: inRender('navigator'), line: 5, column: 27 },
        { message: inRender('document'), line: 6, column: 20 },
        { message: inRender('window'), line: 7, column: 76 },
      ],
    },
    {
      // A helper called on the render path, directly or through another helper.
      filename: container,
      code: [
        'function width() { return window.innerWidth; }',
        'export function Demo() {',
        '  const title = () => document.title;',
        '  const both = () => title() + width();',
        '  return <i>{both()}</i>;',
        '}',
      ].join('\n'),
      errors: [
        { message: inRender('window'), line: 1, column: 27 },
        { message: inRender('document'), line: 3, column: 23 },
      ],
    },
    {
      // Module top level runs when the server imports the file.
      filename: container,
      code: "const dark = matchMedia('(prefers-color-scheme: dark)').matches;\nexport function Demo() { return <i>{String(dark)}</i>; }",
      errors: [{ message: inRender('matchMedia'), line: 1, column: 14 }],
    },
  ],
});
