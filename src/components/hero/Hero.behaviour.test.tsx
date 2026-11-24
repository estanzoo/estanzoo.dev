// L5 browser behaviour: proves the Hero terminal in a DOM emulator (jsdom) - the boot
// intro on a first visit (sessionStorage 'intro-seen'), skip and replay, typed commands,
// chips and the run button (src/terminal.ts runCommand), pane focus, the name scramble,
// the pointer spotlight and the removal of the pre-hydration <html data-intro> guard.
// Timers are fake; sessionStorage and matchMedia are jsdom's or stubbed at the boundary.
// Leaves to other layers: the server markup (markup pin src/testing/pins/top.txt), the
// command table (src/terminal.test.ts) and the drawing of each state (HeroView.test.tsx).
//
// user-event under vitest fake timers: Testing Library's async wrapper waits on a
// setTimeout(0) and advances only Jest's clock, so it hangs even with the advanceTimers
// option. A global `jest` whose advanceTimersByTime is vitest's lets it advance our clock.
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { site } from '../../content';
import { COMMANDS } from '../../terminal';
import { Hero } from './Hero';

/** The whole intro: two typed commands, both agents and the final line (about 7.5s). */
const INTRO_MS = 8000;

const FINISHED_LOG = [
  '$ whoami',
  '$ hq dispatch --team portfolio',
  'dispatched 2 agents, 2 worktrees',
  'both agents reported. your turn: type help',
];

function setup({ seen }: { seen: boolean }) {
  if (seen) sessionStorage.setItem('intro-seen', '1');
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const { container } = render(<Hero />);
  return { user, container };
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

function texts(container: HTMLElement, selector: string): string[] {
  return [...container.querySelectorAll(selector)].map((el) => el.textContent ?? '');
}

const logLines = (c: HTMLElement) => texts(c, '.hero-log .ln');
const agentLines = (c: HTMLElement, pane: 0 | 1) => texts(c.querySelectorAll<HTMLElement>('.pane-agent')[pane], '.ln');
const statuses = (c: HTMLElement) => texts(c, '.pane-status');
const shownName = (c: HTMLElement) => texts(c, '.hero-name span').join(' ');
const prompt = () => screen.getByRole<HTMLInputElement>('textbox');
const focusedPanes = (c: HTMLElement) => [...c.querySelectorAll('.pane')].map((p) => p.classList.contains('is-focus'));
const pressed = () => screen.getAllByRole('button', { pressed: true }).map((b) => b.textContent);

async function runTyped(user: ReturnType<typeof userEvent.setup>, command: string) {
  await user.type(prompt(), command + '{Enter}');
}

describe('Hero', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('jest', { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) });
    sessionStorage.clear();
    document.documentElement.dataset.intro = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('the intro', () => {
    it('a first visit starts the intro from an empty terminal and marks it seen', () => {
      const { container } = setup({ seen: false });
      expect(logLines(container)).toEqual([]);
      expect(shownName(container).trim()).toBe('');
      expect(statuses(container)).toEqual(['idle', 'idle']);
      expect(screen.getByRole('button', { name: 'skip intro' })).toBeInTheDocument();
      expect(sessionStorage.getItem('intro-seen')).toBe('1');
    });

    it('the intro types whoami into the prompt', () => {
      setup({ seen: false });
      advance(500 + 3 * 55);
      expect(prompt()).toHaveValue('who');
    });

    it('mid-intro both agents are working', () => {
      const { container } = setup({ seen: false });
      advance(5000);
      expect(statuses(container)).toEqual(['working', 'working']);
      expect(logLines(container)).toEqual(FINISHED_LOG.slice(0, 3));
    });

    it('the intro ends with the finished log, both agents done and a replay button', () => {
      const { container } = setup({ seen: false });
      advance(INTRO_MS);
      expect(logLines(container)).toEqual(FINISHED_LOG);
      expect(shownName(container)).toBe(site.name);
      expect(statuses(container)).toEqual(['done', 'done']);
      expect(screen.getByRole('button', { name: 'replay intro' })).toBeInTheDocument();
    });

    it('a return visit shows the finished terminal with no intro', () => {
      const { container } = setup({ seen: true });
      expect(logLines(container)).toEqual(FINISHED_LOG);
      expect(shownName(container)).toBe(site.name);
      advance(INTRO_MS);
      expect(logLines(container)).toEqual(FINISHED_LOG);
    });

    it('a visitor who prefers reduced motion gets no intro', () => {
      vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') }));
      const { container } = setup({ seen: false });
      expect(logLines(container)).toEqual(FINISHED_LOG);
      expect(screen.getByRole('button', { name: 'replay intro' })).toBeInTheDocument();
    });

    it('mounting lifts the pre-hydration data-intro guard from <html>', () => {
      setup({ seen: false });
      expect(document.documentElement.dataset.intro).toBeUndefined();
    });

    it('skip intro jumps to the finished terminal', async () => {
      const { user, container } = setup({ seen: false });
      advance(1000);
      await user.click(screen.getByRole('button', { name: 'skip intro' }));
      expect(logLines(container)).toEqual(FINISHED_LOG);
      expect(statuses(container)).toEqual(['done', 'done']);
      expect(screen.getByRole('button', { name: 'replay intro' })).toBeInTheDocument();
    });

    it('replay intro empties the terminal and plays the intro again', async () => {
      const { user, container } = setup({ seen: true });
      await user.click(screen.getByRole('button', { name: 'replay intro' }));
      expect(logLines(container)).toEqual([]);
      expect(screen.getByRole('button', { name: 'skip intro' })).toBeInTheDocument();
      advance(INTRO_MS);
      expect(logLines(container)).toEqual(FINISHED_LOG);
    });

    it('a command typed during the intro finishes the intro first', async () => {
      const { user, container } = setup({ seen: false });
      advance(1500);
      act(() => {
        fireEvent.change(prompt(), { target: { value: 'stack' } });
      });
      await user.click(screen.getByRole('button', { name: 'Run command' }));
      expect(logLines(container).slice(0, 4)).toEqual(FINISHED_LOG);
      expect(logLines(container)[4]).toBe('$ stack');
      expect(screen.getByRole('button', { name: 'replay intro' })).toBeInTheDocument();
    });
  });

  describe('commands', () => {
    it('typing help and Enter prints the command list and clears the prompt', async () => {
      const { user, container } = setup({ seen: true });
      await runTyped(user, 'help');
      expect(logLines(container).slice(-2)).toEqual(['$ help', COMMANDS.join(' · ')]);
      expect(prompt()).toHaveValue('');
    });

    it('the run button with an empty prompt runs help', async () => {
      const { user, container } = setup({ seen: true });
      await user.click(screen.getByRole('button', { name: 'Run command' }));
      expect(logLines(container).slice(-2)).toEqual(['$ help', COMMANDS.join(' · ')]);
    });

    it('the run button runs what is typed', async () => {
      const { user, container } = setup({ seen: true });
      await user.type(prompt(), 'stack');
      await user.click(screen.getByRole('button', { name: 'Run command' }));
      expect(logLines(container).at(-2)).toBe('$ stack');
    });

    it('a chip runs its command', async () => {
      const { user, container } = setup({ seen: true });
      await user.click(screen.getByRole('button', { name: 'stack' }));
      expect(logLines(container).at(-2)).toBe('$ stack');
    });

    it('an unknown command prints a command-not-found error line', async () => {
      const { user, container } = setup({ seen: true });
      await runTyped(user, 'rm -rf');
      const last = container.querySelector('.hero-log .ln:last-child');
      expect(last).toHaveClass('ln-err');
      expect(last).toHaveTextContent('command not found: rm -rf · try help');
    });

    it('contact prints a mail line with a link to the email', async () => {
      const { user, container } = setup({ seen: true });
      await user.click(screen.getByRole('button', { name: 'contact' }));
      const link = container.querySelector('.hero-log .ln:last-child a');
      expect(link).toHaveAttribute('href', `mailto:${site.email}`);
      expect(link).toHaveTextContent(site.email);
    });

    it('the log keeps only its last six lines', async () => {
      const { user, container } = setup({ seen: true });
      await runTyped(user, 'help');
      await runTyped(user, 'stack');
      const lines = logLines(container);
      expect(lines).toHaveLength(6);
      expect(lines.slice(-2)[0]).toBe('$ stack');
      expect(lines[0]).toBe(FINISHED_LOG[2]);
    });

    it('clear empties the log', async () => {
      const { user, container } = setup({ seen: true });
      await runTyped(user, 'clear');
      expect(logLines(container)).toEqual([]);
    });

    it('replay restarts the intro', async () => {
      const { user, container } = setup({ seen: true });
      await runTyped(user, 'replay');
      expect(logLines(container)).toEqual([]);
      expect(screen.getByRole('button', { name: 'skip intro' })).toBeInTheDocument();
    });

    it('whoami scrambles the name and settles on the real name', async () => {
      const { user, container } = setup({ seen: true });
      await runTyped(user, 'whoami');
      advance(2000);
      expect(shownName(container)).toBe(site.name);
      expect(logLines(container).at(-1)).toContain('ethan zhu');
    });
  });

  describe('agents and focus', () => {
    it('projects focuses agent/projects, which works and then reports done', async () => {
      const { user, container } = setup({ seen: true });
      await user.click(screen.getByRole('button', { name: 'projects' }));
      expect(focusedPanes(container)).toEqual([false, true, false]);
      expect(pressed()).toEqual(['[1] agent/projects']);
      expect(statuses(container)).toEqual(['working', 'done']);
      expect(agentLines(container, 0)).toEqual([]);
      advance(2300);
      expect(statuses(container)).toEqual(['done', 'done']);
      expect(agentLines(container, 0)).toHaveLength(4);
      expect(agentLines(container, 0).at(-1)).toContain('done · ');
    });

    it('experience focuses agent/experience', async () => {
      const { user, container } = setup({ seen: true });
      await runTyped(user, 'experience');
      expect(focusedPanes(container)).toEqual([false, false, true]);
      expect(statuses(container)).toEqual(['done', 'working']);
    });

    it('clicking a pane label focuses that pane', async () => {
      const { user, container } = setup({ seen: true });
      expect(focusedPanes(container)).toEqual([true, false, false]);
      await user.click(screen.getByRole('button', { name: '[2] agent/experience' }));
      expect(focusedPanes(container)).toEqual([false, false, true]);
      expect(pressed()).toEqual(['[2] agent/experience']);
    });

    it('focusing the prompt focuses the lead pane', async () => {
      const { user, container } = setup({ seen: true });
      await user.click(screen.getByRole('button', { name: '[1] agent/projects' }));
      await user.click(prompt());
      expect(focusedPanes(container)).toEqual([true, false, false]);
    });
  });

  describe('the name and the spotlight', () => {
    it('hovering the name after the intro scrambles it and settles on the real name', async () => {
      const { user, container } = setup({ seen: true });
      vi.spyOn(Math, 'random').mockReturnValue(0);
      await user.hover(screen.getByRole('heading', { level: 1 }));
      advance(40);
      expect(shownName(container)).not.toBe(site.name);
      advance(2000);
      expect(shownName(container)).toBe(site.name);
      vi.mocked(Math.random).mockRestore();
    });

    it('moving the pointer over the frame sets the spotlight position on the next frame', () => {
      const { container } = setup({ seen: true });
      const frame = container.querySelector<HTMLElement>('.hero-frame')!;
      fireEvent.mouseMove(frame, { clientX: 30, clientY: 40 });
      advance(20);
      expect(frame.style.getPropertyValue('--mx')).toBe('30px');
      expect(frame.style.getPropertyValue('--my')).toBe('40px');
    });
  });
});
