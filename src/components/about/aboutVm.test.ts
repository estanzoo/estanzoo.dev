// L1 unit: proves the About view model schema is strict - it accepts the lead paragraph
// parts, the body, the facts and the links row with both of its item kinds, and rejects
// unknown fields and unknown kinds, so a mock cannot drift from the type.
// Leaves to other layers: how the container builds the VM (About.vm.test.ts) and how the
// View draws it (AboutView.test.tsx).
import { describe, expect, it } from 'vitest';
import { aboutVmSchema } from './aboutVm';
import type { AboutVm } from './aboutVm';

const valid: AboutVm = {
  label: '# about',
  lead: { before: 'I work at ', org: { href: '#experience', label: 'Org' }, after: ', on things.' },
  body: 'Before that, other things.',
  facts: [{ label: 'based', value: 'Somewhere' }],
  links: {
    label: 'links',
    items: [
      { kind: 'link', href: 'https://a.example', label: 'a' },
      { kind: 'separator', text: ' · ' },
      { kind: 'link', href: 'https://b.example', label: 'b' },
    ],
  },
};

describe('aboutVmSchema', () => {
  it('accepts the lead parts, body, facts and a links row of links and separators', () => {
    expect(aboutVmSchema.parse(valid)).toEqual(valid);
  });

  it('rejects an unknown top-level field', () => {
    expect(aboutVmSchema.safeParse({ ...valid, extra: 1 }).success).toBe(false);
  });

  it('rejects an unknown field inside the lead', () => {
    expect(aboutVmSchema.safeParse({ ...valid, lead: { ...valid.lead, em: 'x' } }).success).toBe(false);
  });

  it('rejects an unknown field inside a fact', () => {
    const facts = [{ label: 'based', value: 'x', icon: 'pin' }];
    expect(aboutVmSchema.safeParse({ ...valid, facts }).success).toBe(false);
  });

  it('rejects a fact without a value', () => {
    expect(aboutVmSchema.safeParse({ ...valid, facts: [{ label: 'based' }] }).success).toBe(false);
  });

  it('rejects an unknown links row item kind', () => {
    const links = { label: 'links', items: [{ kind: 'icon', text: 'x' }] };
    expect(aboutVmSchema.safeParse({ ...valid, links }).success).toBe(false);
  });

  it('rejects an unknown field inside a links row item', () => {
    const links = { label: 'links', items: [{ kind: 'separator', text: ' · ', wide: true }] };
    expect(aboutVmSchema.safeParse({ ...valid, links }).success).toBe(false);
  });
});
