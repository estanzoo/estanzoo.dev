// Setup for the 'dom' vitest project: jest-dom matchers, DOM cleanup between tests, and the
// `jest` clock that lets user-event run under vitest fake timers.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Testing Library's async wrapper around each user-event call waits on setTimeout(0) and,
// when fake timers are on, advances only a global `jest` clock; without one every click
// hangs. This `jest` advances vitest's clock instead, so a test needs only
// vi.useFakeTimers() and userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).
// Under real timers Testing Library ignores it (it checks setTimeout for a fake clock).
// A plain global, not vi.stubGlobal, so a test's vi.unstubAllGlobals() cannot remove it.
Object.assign(globalThis, { jest: { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) } });

afterEach(() => {
  cleanup();
});
