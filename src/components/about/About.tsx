// About container (owner decision 3): builds the AboutVm from content.ts and hands it to
// the logic-free AboutView. The section has no state and no browser APIs: its links are
// plain anchors.
//
// Only App.tsx and containers import src/content.ts.
import { about, facts, site } from '../../content';
import { AboutView } from './AboutView';
import type { AboutVm } from './aboutVm';

/** The section's VM. */
export function aboutVm(): AboutVm {
  const { before, org, after } = about.lead;
  return {
    label: '# about',
    lead: { before, org: { href: '#experience', label: org }, after },
    body: about.body,
    facts: facts.map(({ label, value }) => ({ label, value })),
    links: {
      label: 'links',
      items: [
        { kind: 'link', href: site.github, label: 'github' },
        { kind: 'separator', text: ' · ' },
        { kind: 'link', href: site.linkedin, label: 'linkedin' },
      ],
    },
  };
}

export function About() {
  return <AboutView vm={aboutVm()} />;
}
