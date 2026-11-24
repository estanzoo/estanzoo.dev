// Header container (owner decision 3): builds the HeaderVm from content.ts and hands it to
// the logic-free HeaderView. The Header has no state and no browser APIs: its links are
// plain in-page anchors.
//
// Only App.tsx and containers import src/content.ts.
import { site } from '../../content';
import { HeaderView } from './HeaderView';
import type { HeaderVm } from './headerVm';

/** Section ids double as the nav labels, in page order. */
const SECTIONS = ['about', 'projects', 'experience', 'interests', 'contact'] as const;

/** The header's VM. */
export function headerVm(): HeaderVm {
  return {
    handle: { href: '#top', label: site.handle },
    navLabel: 'Sections',
    nav: SECTIONS.map((id) => ({ href: `#${id}`, label: id })),
  };
}

export function Header() {
  return <HeaderView vm={headerVm()} />;
}
