import { site } from '../content';
import './Header.css';

/** Section ids double as the nav labels, in page order. */
const SECTIONS = ['about', 'projects', 'experience', 'interests', 'contact'] as const;

export function Header() {
  return (
    <header className="site-header">
      <a className="site-handle mono" href="#top">
        {site.handle}
      </a>
      <nav className="site-nav mono" aria-label="Sections">
        {SECTIONS.map((id) => (
          <a key={id} className="nl" href={`#${id}`}>
            {id}
          </a>
        ))}
      </nav>
    </header>
  );
}
