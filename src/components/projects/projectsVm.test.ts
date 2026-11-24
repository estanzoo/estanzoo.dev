// L1 unit: proves the Projects view model schema is strict - it accepts each variant of the
// details slot (open, closed) and the link slot (link, placeholder), the optional dim
// marker present and absent, and rejects unknown fields and unknown kinds, so a mock cannot
// drift from the type.
// Leaves to other layers: how the container builds the VM (Projects.vm.test.ts) and how the
// View draws it (ProjectsView.test.tsx).
import { describe, expect, it } from 'vitest';
import { projectsVmSchema } from './projectsVm';
import type { ProjectCardVm, ProjectsVm } from './projectsVm';

const card: ProjectCardVm = {
  id: 'hq',
  name: 'hq',
  date: 'Oct 2026',
  desc: 'A thing.',
  tags: 'Elixir · OTP',
  detailsId: 'project-hq-details',
  points: ['one', 'two'],
  details: { kind: 'open', toggleLabel: '− less', expanded: true, dataOpen: '' },
  toggleContext: 'about hq',
  link: { kind: 'link', href: 'https://github.com/x/hq', label: 'github.com/x/hq' },
};

const valid: ProjectsVm = {
  heading: '# projects',
  filterGroupLabel: 'Filter projects',
  filters: [{ id: 'all', label: 'all', pressed: true }],
  cards: [card],
  more: {
    label: 'also on github:',
    repos: [{ href: 'https://github.com/x/a', label: 'a (C)' }],
    all: { href: 'https://github.com/x?tab=repositories', label: 'all repositories' },
  },
};

const withCard = (patch: Record<string, unknown>) => ({ ...valid, cards: [{ ...card, ...patch }] });

describe('projectsVmSchema', () => {
  it('accepts a full view model', () => {
    expect(projectsVmSchema.parse(valid)).toEqual(valid);
  });

  it('accepts the closed details variant', () => {
    const vm = withCard({ details: { kind: 'closed', toggleLabel: '+ details', expanded: false, dataOpen: null } });
    expect(projectsVmSchema.parse(vm)).toEqual(vm);
  });

  it('accepts the placeholder link variant', () => {
    const vm = withCard({ link: { kind: 'placeholder', label: '[add link]' } });
    expect(projectsVmSchema.parse(vm)).toEqual(vm);
  });

  it('accepts a dimmed card', () => {
    const vm = withCard({ dim: '' });
    expect(projectsVmSchema.parse(vm)).toEqual(vm);
  });

  it('rejects a dim marker other than the empty attribute value', () => {
    expect(projectsVmSchema.safeParse(withCard({ dim: 'yes' })).success).toBe(false);
  });

  it('rejects an open details variant that is not expanded', () => {
    const details = { kind: 'open', toggleLabel: '− less', expanded: false, dataOpen: '' };
    expect(projectsVmSchema.safeParse(withCard({ details })).success).toBe(false);
  });

  it('rejects a closed details variant whose panel is marked open', () => {
    const details = { kind: 'closed', toggleLabel: '+ details', expanded: false, dataOpen: '' };
    expect(projectsVmSchema.safeParse(withCard({ details })).success).toBe(false);
  });

  it('rejects an unknown details kind', () => {
    const details = { kind: 'half', toggleLabel: 'x', expanded: true, dataOpen: '' };
    expect(projectsVmSchema.safeParse(withCard({ details })).success).toBe(false);
  });

  it('rejects an unknown link kind', () => {
    expect(projectsVmSchema.safeParse(withCard({ link: { kind: 'button', label: 'x' } })).success).toBe(false);
  });

  it('rejects an href on the placeholder link variant', () => {
    const link = { kind: 'placeholder', label: '[add link]', href: 'h' };
    expect(projectsVmSchema.safeParse(withCard({ link })).success).toBe(false);
  });

  it('rejects an unknown top-level field', () => {
    expect(projectsVmSchema.safeParse({ ...valid, extra: 1 }).success).toBe(false);
  });

  it('rejects an unknown field on a card', () => {
    expect(projectsVmSchema.safeParse(withCard({ open: true })).success).toBe(false);
  });

  it('rejects an unknown field on a filter chip', () => {
    const filters = [{ id: 'all', label: 'all', pressed: true, className: 'chip' }];
    expect(projectsVmSchema.safeParse({ ...valid, filters }).success).toBe(false);
  });

  it('rejects an unknown field in the also-on-github row', () => {
    expect(projectsVmSchema.safeParse({ ...valid, more: { ...valid.more, extra: 1 } }).success).toBe(false);
  });
});
