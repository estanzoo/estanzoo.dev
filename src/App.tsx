import { Header } from './components/header/Header';
import { Hero } from './components/hero/Hero';
import { About } from './components/about/About';
import { Projects } from './components/projects/Projects';
import { Experience } from './components/experience/Experience';
import { Interests } from './components/interests/Interests';
import { Contact } from './components/contact/Contact';

/** The whole page, in design order (docs/design/Panes.dc.html). */
export function App() {
  return (
    <div className="site">
      <Header />
      <main>
        <Hero />
        <About />
        <Projects />
        <Experience />
        <Interests />
        <Contact />
      </main>
    </div>
  );
}
