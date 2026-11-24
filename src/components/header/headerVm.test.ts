// L1 unit: proves the Header view model schema is strict - it accepts the handle link, the
// nav label and the nav links, and rejects unknown fields anywhere, so a mock cannot drift
// from the type.
// Leaves to other layers: how the container builds the VM (Header.vm.test.ts) and how the
// View draws it (HeaderView.test.tsx).
import { describe, expect, it } from 'vitest';
import { headerVmSchema } from './headerVm';
import type { HeaderVm } from './headerVm';

const valid: HeaderVm = {
  handle: { href: '#top', label: '~/someone' },
  navLabel: 'Sections',
  nav: [
    { href: '#about', label: 'about' },
    { href: '#contact', label: 'contact' },
  ],
};

describe('headerVmSchema', () => {
  it('accepts a handle link, a nav label and nav links', () => {
    expect(headerVmSchema.parse(valid)).toEqual(valid);
  });

  it('rejects an unknown top-level field', () => {
    expect(headerVmSchema.safeParse({ ...valid, extra: 1 }).success).toBe(false);
  });

  it('rejects an unknown field inside the handle link', () => {
    expect(headerVmSchema.safeParse({ ...valid, handle: { ...valid.handle, title: 't' } }).success).toBe(false);
  });

  it('rejects an unknown field inside a nav link', () => {
    const nav = [{ href: '#about', label: 'about', active: true }];
    expect(headerVmSchema.safeParse({ ...valid, nav }).success).toBe(false);
  });
});
