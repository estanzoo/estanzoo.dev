// L4 render: proves ContactView draws only what its view model says - every text and link
// comes from the VM, the copy button shows the label of the current copy variant, and a
// click on it calls onCopy. No content.ts, no clipboard.
// Leaves to other layers: building the VM and the copy state machine (the container,
// Contact.behaviour.test.tsx) and the schema (contactVm.test.ts).
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContactView } from './ContactView';
import type { ContactVm } from './contactVm';

const vm: ContactVm = {
  prompt: 'say hi',
  heading: 'Talk to me',
  mail: { href: 'mailto:me@x.dev', label: 'me@x.dev' },
  copy: { kind: 'blocked', label: 'nope' },
  links: [
    { href: 'https://a.example', label: 'A' },
    { href: 'https://b.example', label: 'B' },
  ],
  footer: '© 1999 Someone',
};

describe('ContactView', () => {
  it('draws the heading, prompt and footer from the VM', () => {
    const { container } = render(<ContactView vm={vm} onCopy={() => {}} />);
    expect(screen.getByRole('heading')).toHaveTextContent('Talk to me');
    expect(container.querySelector('.contact-cmd')).toHaveTextContent('$ say hi');
    expect(container.querySelector('.contact-foot')).toHaveTextContent('© 1999 Someone');
  });

  it('draws the mail link and one chip link per VM link, in order', () => {
    render(<ContactView vm={vm} onCopy={() => {}} />);
    const links = screen.getAllByRole('link');
    expect(links.map((a) => [a.getAttribute('href'), a.textContent])).toEqual([
      ['mailto:me@x.dev', 'me@x.dev'],
      ['https://a.example', 'A'],
      ['https://b.example', 'B'],
    ]);
  });

  it('the copy button shows the label of the copy variant', () => {
    render(<ContactView vm={vm} onCopy={() => {}} />);
    expect(screen.getByRole('button')).toHaveTextContent('nope');
  });

  it('a click on the copy button calls onCopy', () => {
    const onCopy = vi.fn();
    render(<ContactView vm={vm} onCopy={onCopy} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onCopy).toHaveBeenCalledOnce();
  });
});
