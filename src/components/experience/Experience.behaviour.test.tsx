// L5 browser behaviour: proves the Experience accordion in a DOM emulator (jsdom) - the
// Xplode row starts open, a click on a closed row opens it and closes the open one (one
// open row at a time), a click on the open row closes it, and the WER chart bar shrinks to
// its reduced width while the Xplode row is open and returns to full width when it closes
// (the CSS transition on width is the animation).
// Leaves to other layers: the static markup (markup pins, src/testing/pins.test.ts), the
// VM values (Experience.vm.test.ts) and the CSS transitions themselves (manual check).
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Experience } from './Experience';

const ROLES = { thri5: /Full Stack Developer/, xplode: /Machine Learning Engineer/, stepfun: /Backend Developer/ };

function setup() {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const { container } = render(<Experience />);
  const button = (role: keyof typeof ROLES) => screen.getByRole('button', { name: ROLES[role] });
  const expanded = () =>
    (Object.keys(ROLES) as (keyof typeof ROLES)[]).filter((r) => button(r).getAttribute('aria-expanded') === 'true');
  const bar = () => container.querySelector<HTMLElement>('.xp-chart-bar')!;
  return { user, button, expanded, bar };
}

describe('Experience accordion', () => {
  beforeEach(() => {
    // shouldAdvanceTime: Testing Library's async wrapper around each user-event call waits
    // on a real setTimeout(0) and only advances Jest's fake timers, so without it every
    // click hangs under vitest fake timers even with advanceTimers set.
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with only the Xplode row open and its chart bar at the reduced width', () => {
    const { expanded, bar } = setup();
    expect(expanded()).toEqual(['xplode']);
    expect(bar().style.width).toBe('59.3%');
  });

  it('clicking a closed row opens it and closes the open one', async () => {
    const { user, button, expanded } = setup();
    await user.click(button('thri5'));
    expect(expanded()).toEqual(['thri5']);
    expect(document.getElementById('job-thri5-panel')).toHaveClass('is-open');
    expect(document.getElementById('job-xplode-panel')).not.toHaveClass('is-open');
    expect(button('thri5')).toHaveTextContent('−');
    expect(button('xplode')).toHaveTextContent('+');

    await user.click(button('stepfun'));
    expect(expanded()).toEqual(['stepfun']);
  });

  it('clicking the open row closes it, leaving every row closed', async () => {
    const { user, button, expanded } = setup();
    await user.click(button('xplode'));
    expect(expanded()).toEqual([]);
    expect(document.getElementById('job-xplode-panel')).toHaveAttribute('aria-hidden', 'true');
  });

  it('the chart bar returns to full width when Xplode closes and shrinks again when it reopens', async () => {
    const { user, button, bar } = setup();
    await user.click(button('stepfun'));
    expect(bar().style.width).toBe('100%');
    await user.click(button('xplode'));
    expect(bar().style.width).toBe('59.3%');
  });
});
