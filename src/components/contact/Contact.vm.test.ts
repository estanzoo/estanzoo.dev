// L1 unit: proves the Contact container builds a schema-valid view model from content.ts
// for each copy state, with the display-ready copy button label of that state.
// Leaves to other layers: the clipboard and the timer that move between states
// (Contact.behaviour.test.tsx) and the drawing (ContactView.test.tsx).
import { describe, expect, it } from 'vitest';
import { contact, site } from '../../content';
import { contactVm } from './Contact';
import { contactVmSchema } from './contactVm';

describe('contactVm', () => {
  it.each([
    ['idle', 'copy email'],
    ['copied', 'copied'],
    ['blocked', 'copy blocked'],
  ] as const)('the %s state fits the schema and labels the copy button %s', (kind, label) => {
    const vm = contactVmSchema.parse(contactVm(kind));
    expect(vm.copy).toEqual({ kind, label });
  });

  it('takes its copy and links from content.ts', () => {
    expect(contactVm('idle')).toMatchObject({
      prompt: contact.prompt,
      heading: contact.heading,
      mail: { href: `mailto:${site.email}`, label: site.email },
      links: [
        { href: site.github, label: 'GitHub' },
        { href: site.linkedin, label: 'LinkedIn' },
      ],
      footer: `© ${site.year} ${site.name}`,
    });
  });
});
