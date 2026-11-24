// L4 render: proves AboutView draws only what its view model says - the label, the lead
// sentence with the organisation as a link, the body, one term/value row per fact and the
// links row with its links and separators in VM order. No content.ts.
// Leaves to other layers: building the VM (About.vm.test.ts), the schema (aboutVm.test.ts)
// and in-page navigation (About.behaviour.test.tsx).
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AboutView } from './AboutView';
import type { AboutVm } from './aboutVm';

const vm: AboutVm = {
  label: '# me',
  lead: { before: 'I build at ', org: { href: '#work', label: 'Acme' }, after: ' daily.' },
  body: 'Body text.',
  facts: [
    { label: 'based', value: 'Here' },
    { label: 'likes', value: 'Tea' },
  ],
  links: {
    label: 'elsewhere',
    items: [
      { kind: 'link', href: 'https://a.example', label: 'a' },
      { kind: 'separator', text: ' / ' },
      { kind: 'link', href: 'https://b.example', label: 'b' },
    ],
  },
};

describe('AboutView', () => {
  it('draws the label and the body from the VM', () => {
    const { container } = render(<AboutView vm={vm} />);
    expect(screen.getByRole('heading')).toHaveTextContent('# me');
    expect(container.querySelector('.about-body')).toHaveTextContent('Body text.');
  });

  it('draws the lead sentence with the organisation as a link inside it', () => {
    const { container } = render(<AboutView vm={vm} />);
    expect(container.querySelector('.about-lead')?.textContent).toBe('I build at Acme daily.');
    expect(screen.getByRole('link', { name: 'Acme' })).toHaveAttribute('href', '#work');
  });

  it('draws one term and value per fact, then the links row, in order', () => {
    const { container } = render(<AboutView vm={vm} />);
    const rows = [...container.querySelectorAll('dl > div')].map((row) => [
      row.querySelector('dt')?.textContent,
      row.querySelector('dd')?.textContent,
    ]);
    expect(rows).toEqual([
      ['based', 'Here'],
      ['likes', 'Tea'],
      ['elsewhere', 'a / b'],
    ]);
  });

  it('the links row links point where the VM says', () => {
    const { container } = render(<AboutView vm={vm} />);
    const links = [...container.querySelectorAll('dl a')].map((a) => [a.getAttribute('href'), a.textContent]);
    expect(links).toEqual([
      ['https://a.example', 'a'],
      ['https://b.example', 'b'],
    ]);
  });
});
