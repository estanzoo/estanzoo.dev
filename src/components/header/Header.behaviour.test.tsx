// L5 browser behaviour: proves the header's links navigate inside the page in a DOM
// emulator (jsdom) - the handle jumps to #top, each nav link jumps to its section, and
// every target exists on the real page (App).
// Leaves to other layers: the markup (HeaderView.test.tsx, markup pins) and smooth
// scrolling and hover styles (CSS, manual check).
//
// The header has no timers, so user-event runs on real timers.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../../App';
import { Header } from './Header';

const SECTIONS = ['about', 'projects', 'experience', 'interests', 'contact'];

describe('Header navigation', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('clicking the handle jumps to the top of the page', async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByRole('link', { name: '~/ethan-zhu' }));
    expect(window.location.hash).toBe('#top');
  });

  it.each(SECTIONS)('clicking the %s nav link jumps to that section', async (id) => {
    const user = userEvent.setup();
    render(<Header />);
    const nav = screen.getByRole('navigation', { name: 'Sections' });
    await user.click(within(nav).getByRole('link', { name: id }));
    expect(window.location.hash).toBe(`#${id}`);
  });

  it('every header link targets an element that exists on the page', () => {
    const { container } = render(<App />);
    const header = container.querySelector('header')!;
    const targets = [...header.querySelectorAll('a')].map((a) => a.getAttribute('href')!.slice(1));
    expect(targets.filter((id) => !document.getElementById(id))).toEqual([]);
  });
});
