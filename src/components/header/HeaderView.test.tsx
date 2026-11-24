// L4 render: proves HeaderView draws only what its view model says - the handle link and
// one nav link per VM link, in order, inside a nav named by the VM. No content.ts.
// Leaves to other layers: building the VM (Header.vm.test.ts), the schema
// (headerVm.test.ts) and in-page navigation (Header.behaviour.test.tsx).
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeaderView } from './HeaderView';
import type { HeaderVm } from './headerVm';

const vm: HeaderVm = {
  handle: { href: '#start', label: '~/someone' },
  navLabel: 'Parts',
  nav: [
    { href: '#one', label: 'one' },
    { href: '#two', label: 'two' },
  ],
};

const linkPairs = (links: HTMLElement[]) => links.map((a) => [a.getAttribute('href'), a.textContent]);

describe('HeaderView', () => {
  it('draws the handle link from the VM', () => {
    render(<HeaderView vm={vm} />);
    expect(screen.getByRole('link', { name: '~/someone' })).toHaveAttribute('href', '#start');
  });

  it('draws one nav link per VM nav link, in order, inside the nav named by the VM', () => {
    render(<HeaderView vm={vm} />);
    const nav = screen.getByRole('navigation', { name: 'Parts' });
    expect(linkPairs(within(nav).getAllByRole('link'))).toEqual([
      ['#one', 'one'],
      ['#two', 'two'],
    ]);
  });
});
