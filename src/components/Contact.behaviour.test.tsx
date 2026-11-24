// L5 browser behaviour: proves Contact's copy button in a DOM emulator (jsdom) - it
// writes site.email to the clipboard, shows 'copied' or 'copy blocked', and returns to
// 'copy email' after 1.8s. The clipboard is a fake at the browser boundary.
// Leaves to other layers: the static markup (L4, Contact.render.test.tsx) and real
// browser clipboard permissions (manual check).
//
// Clicks use fireEvent, not user-event: user-event goes through Testing Library's async
// wrapper, which waits on setTimeout(0) and only auto-advances Jest fake timers, so it
// hangs under vitest fake timers.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { site } from '../content';
import { Contact } from './Contact';

const COPY_RESET_MS = 1800;

function renderWithClipboard(writeText: (text: string) => Promise<void>) {
  vi.useFakeTimers();
  const clipboard = { writeText: vi.fn(writeText) };
  Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true });
  render(<Contact />);
  return clipboard;
}

async function clickCopy() {
  fireEvent.click(screen.getByRole('button', { name: 'copy email' }));
  // Let the clipboard promise settle and React apply the state update.
  await act(async () => {});
}

describe('Contact copy button', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('clicking copy email writes the public email to the clipboard', async () => {
    const clipboard = renderWithClipboard(() => Promise.resolve());
    await clickCopy();
    expect(clipboard.writeText).toHaveBeenCalledExactlyOnceWith(site.email);
  });

  it('after a successful copy the label reads copied and returns to copy email after 1.8s', async () => {
    renderWithClipboard(() => Promise.resolve());
    await clickCopy();
    expect(screen.getByRole('button')).toHaveTextContent('copied');

    act(() => vi.advanceTimersByTime(COPY_RESET_MS - 1));
    expect(screen.getByRole('button')).toHaveTextContent('copied');

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole('button')).toHaveTextContent('copy email');
  });

  it('when the clipboard rejects the label reads copy blocked', async () => {
    renderWithClipboard(() => Promise.reject(new Error('denied')));
    await clickCopy();
    expect(screen.getByRole('button')).toHaveTextContent('copy blocked');
  });
});
