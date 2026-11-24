import { describe, expect, it } from 'vitest';
import { approvePage, DESIGN_URL, PROJECTS, screenshotName } from './shots';

describe('screenshotName', () => {
  it('joins section and state into one png name', () => {
    expect(screenshotName({ section: 'contact', state: 'idle' })).toBe('contact-idle.png');
  });
});

describe('PROJECTS', () => {
  it('is desktop at 1440 and phone at 390', () => {
    expect(PROJECTS.map((p) => [p.name, p.width])).toEqual([
      ['desktop', 1440],
      ['phone', 390],
    ]);
  });
});

describe('approvePage', () => {
  const entries = [
    { section: 'contact', state: 'idle', scenario: 'A visitor <reaches> the end.' },
    { section: 'contact', state: 'copied', scenario: undefined },
    { section: 'about', state: 'default', scenario: 'About.' },
  ];
  const html = approvePage({
    entries,
    src: (project, file) => `../../e2e/__screenshots__/${project}/${file}`,
  });

  it('links the design', () => {
    expect(html).toContain(`href="${DESIGN_URL}"`);
    expect(DESIGN_URL).toBe('https://claude.ai/artifact/7SEsxq1uao9KNBUy9PFZm9#artboard-Panes');
  });

  it('shows every baseline at both widths', () => {
    for (const project of ['desktop', 'phone']) {
      for (const file of ['contact-idle.png', 'contact-copied.png', 'about-default.png']) {
        expect(html).toContain(`src="../../e2e/__screenshots__/${project}/${file}"`);
      }
    }
    expect(html).toContain('1440');
    expect(html).toContain('390');
  });

  it('groups states by section in first-seen order', () => {
    const contact = html.indexOf('<h2 id="contact">');
    const about = html.indexOf('<h2 id="about">');
    expect(contact).toBeGreaterThan(-1);
    expect(about).toBeGreaterThan(contact);
    expect(html.indexOf('contact-copied.png')).toBeLessThan(about);
  });

  it('shows each state with its escaped scenario', () => {
    expect(html).toContain('A visitor &lt;reaches&gt; the end.');
    expect(html).toContain('>idle<');
    expect(html).toContain('>copied<');
  });
});
