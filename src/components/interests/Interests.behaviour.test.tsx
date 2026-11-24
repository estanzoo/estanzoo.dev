// L5 browser behaviour: proves the Interests cube card in a DOM emulator (jsdom) - new
// scramble draws a random scramble and cube face (randomness only on click), the timer
// starts, counts on a 47ms interval, stops and keeps its time, a new scramble stops and
// resets it, and unmounting clears the interval. Fake timers drive the clock (Date.now too);
// Math.random is the only stub, at the randomness boundary.
// Leaves to other layers: the static markup (pins, src/testing/pins.test.ts), the VM
// mapping (Interests.vm.test.ts) and the CSS animations (screenshots, manual check).
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Interests } from './Interests';

const TICK_MS = 47;

function setup() {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const view = render(<Interests />);
  const time = () => view.container.querySelector('.cube-time')?.textContent;
  const scramble = () => view.container.querySelector('.cube-scramble')?.textContent;
  const stickers = () => [...view.container.querySelectorAll<HTMLElement>('.sticker')].map((s) => s.style.background);
  const toggle = () => view.container.querySelector('button.cube-toggle')!;
  const scrambleButton = () => screen.getByRole('button', { name: 'new scramble' });
  const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
  return { user, view, time, scramble, stickers, toggle, scrambleButton, advance };
}

/** A Math.random that walks a fixed list, so a scramble is predictable. */
function randomSequence(values: number[]) {
  let n = 0;
  return vi.spyOn(Math, 'random').mockImplementation(() => values[n++ % values.length]);
}

describe('Interests cube card', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('rendering draws no random numbers', () => {
    const random = vi.spyOn(Math, 'random');
    render(<Interests />);
    expect(random).not.toHaveBeenCalled();
  });

  it('new scramble replaces the scramble and the cube face with random ones', async () => {
    const { user, scramble, stickers, scrambleButton } = setup();
    // Faces step R, L, U, D, F, B, ... with no suffix; each sticker colour index 1 (#FFD84D).
    randomSequence([0, 0, 0.2, 0, 0.4, 0, 0.55, 0, 0.7, 0, 0.9, 0, 0, 0, 0.2, 0, 0.4, 0, 0.55, 0, 0.7, 0, 0.9, 0, ...Array(9).fill(0.2)]);
    await user.click(scrambleButton());
    expect(scramble()).toBe('R L U D F B R L U D F B');
    expect(stickers()).toEqual(Array(9).fill('rgb(255, 216, 77)'));
  });

  it('start timer counts up every 47ms and the button offers stop, pressed', async () => {
    const { user, time, toggle, advance } = setup();
    await user.click(screen.getByRole('button', { name: 'start timer' }));
    expect(toggle()).toHaveTextContent('stop');
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    expect(time()).toBe('0.00');

    advance(TICK_MS * 70);
    expect(time()).toBe('3.29');
  });

  it('stop keeps the elapsed time, offers start timer and stops counting', async () => {
    const { user, time, toggle, advance } = setup();
    await user.click(screen.getByRole('button', { name: 'start timer' }));
    advance(TICK_MS * 70 + 20);
    await user.click(screen.getByRole('button', { name: 'stop' }));

    expect(time()).toBe('3.31');
    expect(toggle()).toHaveTextContent('start timer');
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');

    advance(5000);
    expect(time()).toBe('3.31');
  });

  it('starting again after a stop counts from 0.00', async () => {
    const { user, time, advance } = setup();
    await user.click(screen.getByRole('button', { name: 'start timer' }));
    advance(2000);
    await user.click(screen.getByRole('button', { name: 'stop' }));
    await user.click(screen.getByRole('button', { name: 'start timer' }));
    expect(time()).toBe('0.00');
    advance(TICK_MS * 10);
    expect(time()).toBe('0.47');
  });

  it('new scramble while the timer runs stops it and resets it to 0.00', async () => {
    const { user, time, toggle, scrambleButton, advance } = setup();
    await user.click(screen.getByRole('button', { name: 'start timer' }));
    advance(1000);
    await user.click(scrambleButton());

    expect(time()).toBe('0.00');
    expect(toggle()).toHaveTextContent('start timer');
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    advance(1000);
    expect(time()).toBe('0.00');
  });

  it('unmounting while the timer runs clears its interval', async () => {
    const { user, view } = setup();
    await user.click(screen.getByRole('button', { name: 'start timer' }));
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
