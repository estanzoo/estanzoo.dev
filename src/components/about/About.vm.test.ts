// L1 unit: proves the About container builds a schema-valid view model from content.ts -
// the lead parts with the organisation linking to the experience section, the body, the
// facts in order, and the links row with GitHub and LinkedIn joined by one separator.
// Leaves to other layers: the drawing (AboutView.test.tsx) and navigation
// (About.behaviour.test.tsx).
import { describe, expect, it } from 'vitest';
import { about, facts, site } from '../../content';
import { aboutVm } from './About';
import { aboutVmSchema } from './aboutVm';

describe('aboutVm', () => {
  it('fits the schema', () => {
    expect(() => aboutVmSchema.parse(aboutVm())).not.toThrow();
  });

  it('takes the label, lead, body and facts from content.ts', () => {
    expect(aboutVm()).toMatchObject({
      label: '# about',
      lead: { before: about.lead.before, org: { href: '#experience', label: about.lead.org }, after: about.lead.after },
      body: about.body,
      facts,
    });
  });

  it('the links row joins the GitHub and LinkedIn links with one separator', () => {
    expect(aboutVm().links).toEqual({
      label: 'links',
      items: [
        { kind: 'link', href: site.github, label: 'github' },
        { kind: 'separator', text: ' · ' },
        { kind: 'link', href: site.linkedin, label: 'linkedin' },
      ],
    });
  });
});
