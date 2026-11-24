// L4 render: proves HeroView draws only what its view model says - window bar, panes, name,
// log and agent lines (with their kind and optional link), prompt value and chips all come
// from the VM, focus comes from the VM's class lists and aria-pressed values, and every
// control hands its event to the matching callback. No content.ts, no timers, no storage.
// Leaves to other layers: building the VM and the intro, commands and focus state machine
// (the container, Hero.vm.test.ts and Hero.behaviour.test.tsx) and the schema (heroVm.test.ts).
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HeroView } from './HeroView';
import type { AgentVm, HeroVm } from './heroVm';

const agent = (index: 1 | 2, over: Partial<AgentVm> = {}): AgentVm => ({
  index,
  label: `[${index}] agent/${index}`,
  className: 'pane pane-agent',
  pressed: false,
  status: { kind: 'idle', label: 'resting' },
  lines: [],
  ...over,
});

const vm: HeroVm = {
  bar: { panes: '7 panes', intro: { kind: 'skip', label: 'skip it' } },
  lead: {
    index: 0,
    label: '[0] boss',
    className: 'pane pane-lead',
    pressed: false,
    name: { label: 'Ada Lovelace', first: 'A#a', last: 'Lo%elace' },
    tagline: 'A tagline',
    log: [
      { kind: 'cmd', id: 'a', text: '$ hello' },
      { kind: 'err', id: 'b', text: 'nope' },
      { kind: 'out', id: 'c', text: 'mail:', link: { href: 'mailto:a@b', label: 'a@b' } },
    ],
  },
  prompt: 'proj',
  chips: ['one', 'two'],
  agents: [
    agent(1, {
      className: 'pane pane-agent is-focus',
      pressed: true,
      status: { kind: 'working', label: 'busy' },
      lines: [
        { kind: 'dim', id: 'd', text: 'thinking' },
        { kind: 'ok', id: 'e', text: 'done · 2', link: { href: '#x', label: 'open' } },
      ],
    }),
    agent(2, { status: { kind: 'done', label: 'finished' } }),
  ],
};

const lines = (root: Element) => [...root.querySelectorAll('.ln')].map((l) => [l.className, l.textContent]);

describe('HeroView', () => {
  it('draws the window bar panes count and the intro button label from the VM', () => {
    const { container } = render(<HeroView vm={vm} />);
    expect(container.querySelector('.hero-panes')).toHaveTextContent('7 panes');
    expect(screen.getByRole('button', { name: 'skip it' })).toBeInTheDocument();
  });

  it('draws the name lines, its accessible name and the tagline from the VM', () => {
    const { container } = render(<HeroView vm={vm} />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveAttribute('aria-label', 'Ada Lovelace');
    expect([...h1.querySelectorAll('span')].map((s) => s.textContent)).toEqual(['A#a', 'Lo%elace']);
    expect(container.querySelector('.hero-tagline')).toHaveTextContent('A tagline');
  });

  it('draws each lead log line with its kind class and its link', () => {
    const { container } = render(<HeroView vm={vm} />);
    expect(lines(container.querySelector('.hero-log')!)).toEqual([
      ['ln ln-cmd', '$ hello'],
      ['ln ln-err', 'nope'],
      ['ln ln-out', 'mail: a@b'],
    ]);
    expect(screen.getByRole('link', { name: 'a@b' })).toHaveAttribute('href', 'mailto:a@b');
  });

  it('draws each agent pane with its label, status, lines and link', () => {
    const { container } = render(<HeroView vm={vm} />);
    const [one, two] = container.querySelectorAll('.pane-agent');
    expect(one.querySelector('.pane-label')).toHaveTextContent('[1] agent/1');
    expect(one.querySelector('.pane-status')).toHaveTextContent('busy');
    expect(one.querySelector('.pane-status .dot')).toHaveClass('dot', 'status-working', 'live');
    expect(lines(one)).toEqual([
      ['ln ln-dim', 'thinking'],
      ['ln ln-ok', 'done · 2 open'],
    ]);
    expect(two.querySelector('.pane-status')).toHaveTextContent('finished');
    expect(two.querySelector('.pane-status .dot')?.className).toBe('dot status-done');
  });

  it('an idle agent draws an idle status dot', () => {
    const { container } = render(<HeroView vm={{ ...vm, agents: [agent(1)] }} />);
    expect(container.querySelector('.pane-status .dot')?.className).toBe('dot status-idle');
  });

  it('takes pane classes and aria-pressed values from the VM', () => {
    const { container } = render(<HeroView vm={vm} />);
    expect([...container.querySelectorAll('.pane')].map((p) => p.className)).toEqual([
      'pane pane-lead',
      'pane pane-agent is-focus',
      'pane pane-agent',
    ]);
    expect(screen.getAllByRole('button', { pressed: true }).map((b) => b.textContent)).toEqual(['[1] agent/1']);
  });

  it('draws the prompt value and one chip per VM chip, in order', () => {
    const { container } = render(<HeroView vm={vm} />);
    expect(screen.getByRole('textbox')).toHaveValue('proj');
    expect([...container.querySelectorAll('.hero-chips button')].map((b) => b.textContent)).toEqual(['one', 'two']);
  });

  it('hands every control to its callback', () => {
    const cb = {
      onIntro: vi.fn(),
      onFocusPane: vi.fn(),
      onNameEnter: vi.fn(),
      onPromptChange: vi.fn(),
      onPromptKeyDown: vi.fn(),
      onPromptFocus: vi.fn(),
      onRun: vi.fn(),
      onChip: vi.fn(),
      onFrameMove: vi.fn(),
    };
    const { container } = render(<HeroView vm={vm} {...cb} />);
    fireEvent.click(screen.getByRole('button', { name: 'skip it' }));
    fireEvent.click(screen.getByRole('button', { name: '[0] boss' }));
    fireEvent.click(screen.getByRole('button', { name: '[2] agent/2' }));
    fireEvent.mouseEnter(screen.getByRole('heading', { level: 1 }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'projects' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    fireEvent.focus(screen.getByRole('textbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Run command' }));
    fireEvent.click(screen.getByRole('button', { name: 'two' }));
    fireEvent.mouseMove(container.querySelector('.hero-frame')!);

    expect(cb.onIntro).toHaveBeenCalledOnce();
    expect(cb.onFocusPane.mock.calls).toEqual([[0], [2]]);
    expect(cb.onNameEnter).toHaveBeenCalledOnce();
    expect(cb.onPromptChange).toHaveBeenCalledExactlyOnceWith('projects');
    expect(cb.onPromptKeyDown.mock.calls[0][0]).toMatchObject({ key: 'Enter' });
    expect(cb.onPromptFocus).toHaveBeenCalledOnce();
    expect(cb.onRun).toHaveBeenCalledOnce();
    expect(cb.onChip).toHaveBeenCalledExactlyOnceWith('two');
    expect(cb.onFrameMove).toHaveBeenCalledOnce();
  });

  it('attaches frameRef to the spotlight frame', () => {
    const frameRef = { current: null as HTMLDivElement | null };
    const { container } = render(<HeroView vm={vm} frameRef={frameRef} />);
    expect(frameRef.current).toBe(container.querySelector('.hero-frame'));
  });
});
