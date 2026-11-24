// L4 render: proves ProjectsView draws only what its view model says - the filter chips
// with their pressed state, each card's text, dim marker, details panel and toggle in the
// open or closed variant, the link or the [add link] placeholder, and the also-on-github
// row - and that clicks on a chip or a toggle report the id to the callbacks. No
// content.ts, no state.
// Leaves to other layers: building the VM and the filter/open state (the container,
// Projects.vm.test.ts and Projects.behaviour.test.tsx) and the schema (projectsVm.test.ts).
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectsView } from './ProjectsView';
import type { ProjectCardVm, ProjectsVm } from './projectsVm';

const openCard: ProjectCardVm = {
  id: 'alpha',
  name: 'Alpha',
  date: 'Jan 1999',
  desc: 'First thing.',
  tags: 'A · B',
  detailsId: 'details-alpha',
  points: ['a1', 'a2'],
  details: { kind: 'open', toggleLabel: 'fewer', expanded: true, dataOpen: '' },
  toggleContext: 'on Alpha',
  link: { kind: 'link', href: 'https://alpha.example', label: 'alpha.example' },
};

const closedCard: ProjectCardVm = {
  id: 'beta',
  name: 'Beta',
  date: 'Feb 2000',
  desc: 'Second thing.',
  tags: 'C',
  dim: '',
  detailsId: 'details-beta',
  points: ['b1'],
  details: { kind: 'closed', toggleLabel: 'more', expanded: false, dataOpen: null },
  toggleContext: 'on Beta',
  link: { kind: 'placeholder', label: '(none yet)' },
};

const vm: ProjectsVm = {
  heading: '# work',
  filterGroupLabel: 'Pick a kind',
  filters: [
    { id: 'every', label: 'every', pressed: false },
    { id: 'x', label: 'kind x', pressed: true },
  ],
  cards: [openCard, closedCard],
  more: {
    label: 'elsewhere:',
    repos: [
      { href: 'https://r1.example', label: 'R1' },
      { href: 'https://r2.example', label: 'R2' },
    ],
    all: { href: 'https://all.example', label: 'everything' },
  },
};

const cards = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('article.project-card')];

describe('ProjectsView', () => {
  it('draws the heading from the VM', () => {
    render(<ProjectsView vm={vm} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('# work');
  });

  it('draws one chip per filter, in order, with its pressed state, in the labelled group', () => {
    render(<ProjectsView vm={vm} />);
    const chips = within(screen.getByRole('group', { name: 'Pick a kind' })).getAllByRole('button');
    expect(chips.map((b) => [b.textContent, b.getAttribute('aria-pressed')])).toEqual([
      ['every', 'false'],
      ['kind x', 'true'],
    ]);
  });

  it('a click on a chip calls onFilter with its id', () => {
    const onFilter = vi.fn();
    render(<ProjectsView vm={vm} onFilter={onFilter} />);
    fireEvent.click(screen.getByRole('button', { name: 'kind x' }));
    expect(onFilter).toHaveBeenCalledExactlyOnceWith('x');
  });

  it('draws one card per VM card with its name, date, description and tags', () => {
    const { container } = render(<ProjectsView vm={vm} />);
    expect(
      cards(container).map((c) => [
        c.querySelector('h3')?.textContent,
        c.querySelector('.project-date')?.textContent,
        c.querySelector('.project-desc')?.textContent,
        c.querySelector('.project-tags')?.textContent,
      ]),
    ).toEqual([
      ['Alpha', 'Jan 1999', 'First thing.', 'A · B'],
      ['Beta', 'Feb 2000', 'Second thing.', 'C'],
    ]);
  });

  it('marks a card with data-dim only when the VM carries the dim marker', () => {
    const { container } = render(<ProjectsView vm={vm} />);
    expect(cards(container).map((c) => c.hasAttribute('data-dim'))).toEqual([false, true]);
  });

  it('draws the points inside the details panel of each card', () => {
    const { container } = render(<ProjectsView vm={vm} />);
    const points = cards(container).map((c) => [...c.querySelectorAll('.project-details li')].map((li) => li.textContent));
    expect(points).toEqual([['a1', 'a2'], ['b1']]);
  });

  it('the open variant marks the panel data-open and the toggle expanded with its label', () => {
    const { container } = render(<ProjectsView vm={vm} />);
    const [alpha] = cards(container);
    const panel = alpha.querySelector('.project-details');
    expect(panel).toHaveAttribute('data-open', '');
    expect(panel).toHaveAttribute('id', 'details-alpha');
    const toggle = within(alpha).getByRole('button');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-controls', 'details-alpha');
    expect(toggle).toHaveTextContent('fewer on Alpha', { normalizeWhitespace: false });
  });

  it('the closed variant leaves the panel unmarked and the toggle collapsed with its label', () => {
    const { container } = render(<ProjectsView vm={vm} />);
    const [, beta] = cards(container);
    const panel = beta.querySelector('.project-details');
    expect(panel).not.toHaveAttribute('data-open');
    expect(panel).toHaveAttribute('id', 'details-beta');
    const toggle = within(beta).getByRole('button');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'details-beta');
    expect(toggle).toHaveTextContent('more on Beta', { normalizeWhitespace: false });
  });

  it('keeps the same panel element when a card goes from open to closed, so its CSS transition runs', () => {
    const { container, rerender } = render(<ProjectsView vm={vm} />);
    const before = cards(container)[0].querySelector('.project-details');
    const closed = { ...openCard, details: closedCard.details };
    rerender(<ProjectsView vm={{ ...vm, cards: [closed, closedCard] }} />);
    const after = cards(container)[0].querySelector('.project-details');
    expect(after).not.toHaveAttribute('data-open');
    expect(after).toBe(before);
  });

  it('a click on a toggle calls onToggle with the card id', () => {
    const onToggle = vi.fn();
    const { container } = render(<ProjectsView vm={vm} onToggle={onToggle} />);
    fireEvent.click(within(cards(container)[1]).getByRole('button'));
    expect(onToggle).toHaveBeenCalledExactlyOnceWith('beta');
  });

  it('the link variant draws a link to its href; the placeholder variant draws muted text, no link', () => {
    const { container } = render(<ProjectsView vm={vm} />);
    const [alpha, beta] = cards(container);
    const link = within(alpha).getByRole('link');
    expect(link).toHaveAttribute('href', 'https://alpha.example');
    expect(link).toHaveTextContent('alpha.example ↗');
    expect(within(beta).queryByRole('link')).toBeNull();
    expect(beta.querySelector('.project-link.project-nolink')).toHaveTextContent('(none yet)');
  });

  it('draws the also-on-github row: lead-in, each repo, then the all link', () => {
    const { container } = render(<ProjectsView vm={vm} />);
    const row = container.querySelector<HTMLElement>('.projects-more')!;
    expect(row.querySelector('span')).toHaveTextContent('elsewhere:');
    expect(within(row).getAllByRole('link').map((a) => [a.getAttribute('href'), a.textContent])).toEqual([
      ['https://r1.example', 'R1'],
      ['https://r2.example', 'R2'],
      ['https://all.example', 'everything ↗'],
    ]);
  });
});
