import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { Projects } from './components/projects/Projects';
import { Experience } from './components/Experience';
import { Interests } from './components/Interests';
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
