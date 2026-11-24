// HeaderView: the logic-free View of the site header (owner decision 3; the rules are in
// contact/ContactView.tsx). Props are the VM only: the Header has no events of its own,
// its links are plain in-page anchors. The body reads properties and maps the nav.
//
// The screen renderer (npm run screens) draws this component from mocks/header/*.json.
import type { HeaderVm } from './headerVm';
import './Header.css';

export function HeaderView({ vm }: { vm: HeaderVm }) {
  return (
    <header className="site-header">
      <a className="site-handle mono" href={vm.handle.href}>
        {vm.handle.label}
      </a>
      <nav className="site-nav mono" aria-label={vm.navLabel}>
        {vm.nav.map((link) => (
          <a key={link.href} className="nl" href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
