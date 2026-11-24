// L1 unit: proves the Contact view model schema is strict - it accepts each copy-state
// variant and rejects unknown fields and unknown kinds, so a mock cannot drift from the type.
// Leaves to other layers: how the container builds the VM (Contact.vm.test.ts) and how the
// View draws it (ContactView.test.tsx).
import { describe, expect, it } from 'vitest';
import { contactVmSchema } from './contactVm';
import type { ContactVm } from './contactVm';

const valid: ContactVm = {
  prompt: 'hq send ethan "hello"',
  heading: 'Want to get in touch?',
  mail: { href: 'mailto:a@b.dev', label: 'a@b.dev' },
  copy: { kind: 'idle', label: 'copy email' },
  links: [{ href: 'https://github.com/x', label: 'GitHub' }],
  footer: '© 2026 A B',
};

describe('contactVmSchema', () => {
  it.each(['idle', 'copied', 'blocked'] as const)('accepts the %s copy variant', (kind) => {
    const vm = { ...valid, copy: { kind, label: 'x' } };
    expect(contactVmSchema.parse(vm)).toEqual(vm);
  });

  it('rejects an unknown top-level field', () => {
    expect(contactVmSchema.safeParse({ ...valid, extra: 1 }).success).toBe(false);
  });

  it('rejects an unknown copy kind', () => {
    expect(contactVmSchema.safeParse({ ...valid, copy: { kind: 'pending', label: 'x' } }).success).toBe(false);
  });

  it('rejects an unknown field inside the copy variant', () => {
    expect(contactVmSchema.safeParse({ ...valid, copy: { kind: 'idle', label: 'x', ok: true } }).success).toBe(false);
  });

  it('rejects an unknown field inside a link', () => {
    const links = [{ href: 'h', label: 'l', target: '_blank' }];
    expect(contactVmSchema.safeParse({ ...valid, links }).success).toBe(false);
  });
});
