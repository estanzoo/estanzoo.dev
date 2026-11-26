// L5 browser behaviour: proves the Projects section's interactions in a DOM emulator
// (jsdom) - the filter chips press one at a time and dim the cards outside the category,
// every card starts closed, opening one card closes the other open card, and a second click
// closes the open card.
// Leaves to other layers: the static markup (markup pins, src/testing/pins.test.ts), the
// VM rules in isolation (Projects.vm.test.ts) and the CSS dim and open transition (screens).
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Projects } from './Projects';

// Fake timers keep user-event clicks deterministic; the `jest` clock that lets them settle
// lives in vitest.setup.dom.ts.
function useFakeClock() {
  vi.useFakeTimers();
}

function restoreClock() {
  vi.useRealTimers();
}

function setup() {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const { container } = render(<Projects />);
  const card = (name: string) => screen.getByRole('heading', { level: 3, name }).closest('article')!;
  const toggle = (name: string) => within(card(name)).getByRole('button');
  const chip = (name: string) => within(screen.getByRole('group', { name: 'Filter projects' })).getByRole('button', { name });
  const dimmed = () =>
    [...container.querySelectorAll('article[data-dim]')].map((a) => a.querySelector('h3')?.textContent);
  const expanded = () =>
    ['hq', 'NoteWorks', 'Ring or Ping', 'Gnostic'].filter((n) => toggle(n).getAttribute('aria-expanded') === 'true');
  return { user, card, toggle, chip, dimmed, expanded };
}

describe('Projects filters', () => {
  beforeEach(useFakeClock);
  afterEach(restoreClock);

  it('starts on all, pressed, with no card dimmed', () => {
    const { chip, dimmed } = setup();
    expect(chip('all')).toHaveAttribute('aria-pressed', 'true');
    expect(dimmed()).toEqual([]);
  });

  it('pressing ios presses only ios and dims the cards outside ios', async () => {
    const { user, chip, dimmed } = setup();
    await user.click(chip('ios'));
    expect(['all', 'agents + ai', 'ios', 'backend'].map((n) => chip(n).getAttribute('aria-pressed'))).toEqual([
      'false',
      'false',
      'true',
      'false',
    ]);
    expect(dimmed()).toEqual(['hq', 'Gnostic']);
  });

  it('pressing agents + ai then backend moves the dimming to the backend filter', async () => {
    const { user, chip, dimmed } = setup();
    await user.click(chip('agents + ai'));
    expect(dimmed()).toEqual(['NoteWorks', 'Ring or Ping']);
    await user.click(chip('backend'));
    expect(dimmed()).toEqual(['Gnostic']);
  });

  it('pressing all after a filter brightens every card again', async () => {
    const { user, chip, dimmed } = setup();
    await user.click(chip('ios'));
    await user.click(chip('all'));
    expect(dimmed()).toEqual([]);
    expect(chip('all')).toHaveAttribute('aria-pressed', 'true');
  });

  it('a filter leaves the open card open', async () => {
    const { user, chip, toggle, expanded } = setup();
    await user.click(toggle('hq'));
    await user.click(chip('ios'));
    expect(expanded()).toEqual(['hq']);
  });
});

describe('Projects details toggles', () => {
  beforeEach(useFakeClock);
  afterEach(restoreClock);

  it('every card starts closed with its + details toggle', () => {
    const { toggle, card, expanded } = setup();
    expect(expanded()).toEqual([]);
    for (const name of ['hq', 'NoteWorks', 'Ring or Ping', 'Gnostic']) {
      expect(toggle(name)).toHaveTextContent('+ details');
      expect(card(name).querySelector('.project-details')).not.toHaveAttribute('data-open');
    }
  });

  it('clicking + details opens that card', async () => {
    const { user, toggle, card, expanded } = setup();
    await user.click(toggle('hq'));
    expect(expanded()).toEqual(['hq']);
    expect(toggle('hq')).toHaveTextContent('− less');
    expect(card('hq').querySelector('.project-details')).toHaveAttribute('data-open', '');
  });

  it('opening NoteWorks closes hq: only one card is open', async () => {
    const { user, toggle, card, expanded } = setup();
    await user.click(toggle('hq'));
    await user.click(toggle('NoteWorks'));
    expect(expanded()).toEqual(['NoteWorks']);
    expect(toggle('NoteWorks')).toHaveTextContent('− less');
    expect(toggle('hq')).toHaveTextContent('+ details');
    expect(card('hq').querySelector('.project-details')).not.toHaveAttribute('data-open');
  });

  it('clicking the open card toggle closes it, leaving every card closed', async () => {
    const { user, toggle, expanded } = setup();
    await user.click(toggle('hq'));
    await user.click(toggle('hq'));
    expect(expanded()).toEqual([]);
    expect(toggle('hq')).toHaveTextContent('+ details');
  });

  it('a closed card opens again after it was closed', async () => {
    const { user, toggle, expanded } = setup();
    await user.click(toggle('hq'));
    await user.click(toggle('hq'));
    await user.click(toggle('hq'));
    expect(expanded()).toEqual(['hq']);
  });

  it('a dimmed card can still be opened', async () => {
    const { user, chip, toggle, expanded } = setup();
    await user.click(chip('agents + ai'));
    await user.click(toggle('Ring or Ping'));
    expect(expanded()).toEqual(['Ring or Ping']);
  });
});
