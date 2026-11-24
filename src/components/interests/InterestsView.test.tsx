// L4 render: proves InterestsView draws only what its view model says - every text, light,
// rev segment and sticker comes from the VM, the timer shows the readout, label and
// aria-pressed of its variant, and the two cube buttons call their callbacks. No content.ts,
// no timers, no randomness.
// Leaves to other layers: building the VM and the scramble/timer state (the container,
// Interests.behaviour.test.tsx) and the schema (interestsVm.test.ts).
import { fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { InterestsView } from './InterestsView';
import type { InterestsVm } from './interestsVm';

const vm: InterestsVm = {
  intro: 'Things I like',
  f1: {
    card: { kicker: 'k1', title: 'Racing', body: 'b1' },
    lights: [{ animation: 'f3' }, { animation: 'f1' }],
    revs: [
      { colour: '#FFB454', delay: '0.50s' },
      { colour: '#FF5A4D', delay: '0.70s' },
    ],
  },
  films: { card: { kicker: 'k2', title: 'Movies', body: 'b2' } },
  cubing: {
    card: { kicker: 'k3', title: 'Cubes', body: 'b3' },
    stickers: [{ colour: '#5BD68A' }, { colour: '#FF9F43' }, { colour: '#F2F2F2' }],
    scramble: 'L2 B',
    scrambleLabel: 'shuffle',
    timer: { kind: 'running', text: '9.99', label: 'halt', pressed: true },
  },
};

function draw(over: Partial<Parameters<typeof InterestsView>[0]> = {}) {
  return render(<InterestsView vm={vm} onScramble={() => {}} onToggleTimer={() => {}} {...over} />);
}

describe('InterestsView', () => {
  it('draws the intro and the kicker, title and body of each card in order', () => {
    const { container } = draw();
    expect(container.querySelector('.interests-intro')).toHaveTextContent('Things I like');
    const cards = [...container.querySelectorAll('article.interest-card')].map((card) => [
      card.querySelector('.interest-kicker')?.textContent,
      card.querySelector('.interest-title')?.textContent,
      card.querySelector('.interest-body')?.textContent,
    ]);
    expect(cards).toEqual([
      ['k1', 'Racing', 'b1'],
      ['k2', 'Movies', 'b2'],
      ['k3', 'Cubes', 'b3'],
    ]);
  });

  it('draws one start light per VM light with its animation', () => {
    const { container } = draw();
    const lights = [...container.querySelectorAll<HTMLElement>('.f1l')].map((l) => l.style.animationName);
    expect(lights).toEqual(['f3', 'f1']);
  });

  it('draws one rev segment per VM rev with its colour and delay', () => {
    // Server markup, not the jsdom DOM: jsdom rewrites '0.50s' to '0.5s'.
    const html = renderToStaticMarkup(<InterestsView vm={vm} />);
    expect(html.match(/<span class="rev"[^>]*>/g)).toEqual([
      '<span class="rev" style="background:#FFB454;animation-delay:0.50s">',
      '<span class="rev" style="background:#FF5A4D;animation-delay:0.70s">',
    ]);
  });

  it('draws the film strip', () => {
    const { container } = draw();
    expect(container.querySelectorAll('.film .film-holes')).toHaveLength(2);
    expect(container.querySelectorAll('.film .film-frames')).toHaveLength(1);
  });

  it('draws one sticker per VM sticker with its colour', () => {
    const { container } = draw();
    const stickers = [...container.querySelectorAll<HTMLElement>('.sticker')].map((s) => s.style.background);
    expect(stickers).toEqual(['rgb(91, 214, 138)', 'rgb(255, 159, 67)', 'rgb(242, 242, 242)']);
  });

  it('draws the scramble and the scramble button label', () => {
    const { container } = draw();
    expect(container.querySelector('.cube-scramble')).toHaveTextContent('L2 B');
    expect(screen.getByRole('button', { name: 'shuffle' })).toBeInTheDocument();
  });

  it.each([
    { timer: { kind: 'idle', text: '0.00', label: 'go', pressed: false }, pressed: 'false' },
    { timer: { kind: 'running', text: '9.99', label: 'halt', pressed: true }, pressed: 'true' },
    { timer: { kind: 'stopped', text: '4.20', label: 'again', pressed: false }, pressed: 'false' },
  ] as const)('the $timer.kind timer shows its readout, label and aria-pressed', ({ timer, pressed }) => {
    const { container } = draw({ vm: { ...vm, cubing: { ...vm.cubing, timer } } });
    expect(container.querySelector('.cube-time')).toHaveTextContent(timer.text);
    expect(screen.getByRole('button', { name: timer.label })).toHaveAttribute('aria-pressed', pressed);
  });

  it('a click on the scramble button calls onScramble', () => {
    const onScramble = vi.fn();
    draw({ onScramble });
    fireEvent.click(screen.getByRole('button', { name: 'shuffle' }));
    expect(onScramble).toHaveBeenCalledOnce();
  });

  it('a click on the timer button calls onToggleTimer', () => {
    const onToggleTimer = vi.fn();
    draw({ onToggleTimer });
    fireEvent.click(screen.getByRole('button', { name: 'halt' }));
    expect(onToggleTimer).toHaveBeenCalledOnce();
  });
});
