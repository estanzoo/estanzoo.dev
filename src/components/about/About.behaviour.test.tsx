// L5 browser behaviour: proves the About section's in-page link works in a DOM emulator
// (jsdom) - clicking the organisation in the lead jumps to #experience, which exists on
// the real page (App).
// Leaves to other layers: the markup and the external GitHub/LinkedIn hrefs
// (AboutView.test.tsx, About.vm.test.ts, markup pins); leaving the site is a manual check.
//
// The section has no timers, so user-event runs on real timers.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { about } from '../../content';
import { App } from '../../App';
import { About } from './About';

describe('About lead link', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('clicking the organisation in the lead jumps to the experience section', async () => {
    const user = userEvent.setup();
    render(<About />);
    await user.click(screen.getByRole('link', { name: about.lead.org }));
    expect(window.location.hash).toBe('#experience');
  });

  it('the experience section the lead links to exists on the page', () => {
    render(<App />);
    expect(document.getElementById('experience')).not.toBeNull();
  });
});
