// L4 render: proves the two view primitives that logic-free Views branch through -
// Render draws the component the vm's 'kind' names and fails on a missing slot or an
// unknown kind; Optional draws its child only for a present value.
// Leaves to other layers: which Views use them (each section's own tests).
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Optional, Render } from './primitives';
import type { Views } from './primitives';

type Shape = { kind: 'circle'; radius: number } | { kind: 'square'; side: number };

const shapeViews: Views<Shape> = {
  circle: ({ vm }) => <i className="circle">{vm.radius}</i>,
  square: ({ vm }) => <b className="square">{vm.side}</b>,
};

describe('Render', () => {
  it('draws the component that the vm kind names', () => {
    const html = renderToStaticMarkup(<Render vm={{ kind: 'square', side: 3 }} views={shapeViews} />);
    expect(html).toBe('<b class="square">3</b>');
  });

  it('throws on a null slot', () => {
    const vm = null as unknown as Shape;
    expect(() => renderToStaticMarkup(<Render vm={vm} views={shapeViews} />)).toThrow(
      'Render: the vm slot is null',
    );
  });

  it('throws on an undefined slot', () => {
    const vm = undefined as unknown as Shape;
    expect(() => renderToStaticMarkup(<Render vm={vm} views={shapeViews} />)).toThrow(
      'Render: the vm slot is undefined',
    );
  });

  it('throws on a kind that has no view and names that kind', () => {
    const vm = { kind: 'triangle' } as unknown as Shape;
    expect(() => renderToStaticMarkup(<Render vm={vm} views={shapeViews} />)).toThrow(
      'Render: no view for kind "triangle" (known: circle, square)',
    );
  });
});

describe('Optional', () => {
  it('omits its child for null', () => {
    const html = renderToStaticMarkup(<Optional value={null as string | null}>{(v) => <em>{v}</em>}</Optional>);
    expect(html).toBe('');
  });

  it('omits its child for undefined', () => {
    const html = renderToStaticMarkup(<Optional value={undefined as string | undefined}>{(v) => <em>{v}</em>}</Optional>);
    expect(html).toBe('');
  });

  it('renders its child with the value when present, also for falsy values', () => {
    const html = renderToStaticMarkup(<Optional value={0 as number | null}>{(v) => <em>{v}</em>}</Optional>);
    expect(html).toBe('<em>0</em>');
  });
});
