// L1 unit: proves the Projects container builds a schema-valid view model from content.ts
// for a filter and an open card: the pressed chip, the dimmed cards, the single open card
// with its display-ready toggle label, and the link or [add link] placeholder.
// Leaves to other layers: the clicks that change filter and open card
// (Projects.behaviour.test.tsx) and the drawing (ProjectsView.test.tsx).
import { describe, expect, it } from 'vitest';
import { otherRepos, projectFilters, projects, site } from '../../content';
import { projectsVm } from './Projects';
import { projectsVmSchema } from './projectsVm';

const byId = (vm: ReturnType<typeof projectsVm>) => Object.fromEntries(vm.cards.map((c) => [c.id, c]));

describe('projectsVm', () => {
  it('fits the schema', () => {
    expect(() => projectsVmSchema.parse(projectsVm('all', 'hq'))).not.toThrow();
  });

  it('draws one chip per content filter and presses only the active one', () => {
    const vm = projectsVm('ios', 'hq');
    expect(vm.filters).toEqual(projectFilters.map((f) => ({ id: f.id, label: f.label, pressed: f.id === 'ios' })));
  });

  it('the all filter dims no card', () => {
    expect(projectsVm('all', 'hq').cards.map((c) => c.dim)).toEqual(projects.map(() => undefined));
  });

  it('a category filter dims exactly the cards outside that category', () => {
    const cards = byId(projectsVm('ai', 'hq'));
    expect(Object.keys(cards).filter((id) => 'dim' in cards[id])).toEqual(['noteworks', 'ring']);
    expect(cards.noteworks.dim).toBe('');
  });

  it('the open card shows the open details variant and every other card the closed one', () => {
    const cards = byId(projectsVm('all', 'ring'));
    expect(cards.ring.details).toEqual({ kind: 'open', toggleLabel: '− less', expanded: true, dataOpen: '' });
    for (const id of ['hq', 'noteworks', 'gnostic']) {
      expect(cards[id].details).toEqual({ kind: 'closed', toggleLabel: '+ details', expanded: false, dataOpen: null });
    }
  });

  it('with no open card every card is closed', () => {
    expect(projectsVm('all', '').cards.map((c) => c.details.kind)).toEqual(projects.map(() => 'closed'));
  });

  it('takes each card from its content project', () => {
    const [hq] = projects;
    expect(byId(projectsVm('all', 'hq')).hq).toMatchObject({
      id: hq.id,
      name: hq.name,
      date: hq.date,
      desc: hq.desc,
      tags: hq.tags,
      points: hq.points,
      detailsId: 'project-hq-details',
      toggleContext: 'about hq',
      link: { kind: 'link', href: hq.href, label: hq.linkText },
    });
  });

  it('shows the NoteWorks copy taken from the public repo', () => {
    expect(byId(projectsVm('all', 'hq')).noteworks).toMatchObject({
      name: 'NoteWorks',
      date: 'Feb 2026',
      tags: 'Swift · TypeScript · PostgreSQL · Supabase · Gemini',
      desc: 'A native iPad note-taking app in SwiftUI, with course spaces, a student community and AI study tools on a Supabase backend.',
      points: [
        'PencilKit canvas whose Apple Pencil drawing works alongside zoom and pan gestures.',
        'Per-page ink persistence, with text, image and shape overlays on each page.',
        'Deno edge functions serve notes, posts, comments and uploads; Gemini calls that organise notes and find gaps between them run server-side.',
        'Apple, Google and email sign-in, plus GitHub Actions CI that checks migrations apply and TypeScript types generate.',
      ],
      link: { kind: 'link', href: 'https://noteworks.studio', label: 'noteworks.studio' },
    });
  });

  it('a project with an empty href gets the [add link] placeholder', () => {
    const list = [{ ...projects[0], href: '' }];
    expect(projectsVm('all', 'hq', list).cards[0].link).toEqual({ kind: 'placeholder', label: '[add link]' });
  });

  it('takes the heading, group label and also-on-github row from content.ts', () => {
    expect(projectsVm('all', 'hq')).toMatchObject({
      heading: '# projects',
      filterGroupLabel: 'Filter projects',
      more: {
        label: 'also on github:',
        repos: otherRepos.map((r) => ({ href: r.href, label: r.label })),
        all: { href: `${site.github}?tab=repositories`, label: 'all repositories' },
      },
    });
  });
});
