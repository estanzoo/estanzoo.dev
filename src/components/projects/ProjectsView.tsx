// ProjectsView: the logic-free View of the Projects section, on the pattern of the Contact
// pilot (src/components/contact/ContactView.tsx, whose header states the rules).
//
// Props are the VM (projectsVm.ts) plus two callbacks that report an id back to the
// container: onFilter (a chip) and onToggle (a card's details toggle). The body only reads
// properties, maps over arrays, and branches through <Render> on a card's link slot (link,
// placeholder). A card's details slot (open, closed) needs no branch: both variants carry
// the same display fields (toggle label, aria-expanded, data-open), so the View reads them
// and the details panel stays one mounted element, which its CSS transition needs. Which
// chip is pressed, which card is dimmed and which is open are decided by the container.
//
// The screen renderer (npm run screens) draws this component from mocks/projects/*.json.
import type { Views } from '../../vm/primitives';
import { Render } from '../../vm/primitives';
import type { ProjectCardVm, ProjectLinkVm, ProjectsVm } from './projectsVm';
import './Projects.css';

const noop = () => {};

function ProjectLink({ vm }: { vm: Extract<ProjectLinkVm, { kind: 'link' }> }) {
  return (
    <a className="project-link" href={vm.href}>
      {vm.label} <span aria-hidden="true">↗</span>
    </a>
  );
}

function LinkPlaceholder({ vm }: { vm: Extract<ProjectLinkVm, { kind: 'placeholder' }> }) {
  return <span className="project-link project-nolink">{vm.label}</span>;
}

const linkViews: Views<ProjectLinkVm> = { link: ProjectLink, placeholder: LinkPlaceholder };

function Card({ card, onToggle }: { card: ProjectCardVm; onToggle: (id: string) => void }) {
  return (
    <article className="card project-card" data-dim={card.dim}>
      <div className="project-title">
        <h3>{card.name}</h3>
        <span className="project-date">{card.date}</span>
      </div>
      <p className="project-desc">{card.desc}</p>
      <div className="project-tags">{card.tags}</div>
      <div className="grow project-details" data-open={card.details.dataOpen} id={card.detailsId}>
        <div className="project-details-inner">
          <ul>
            {card.points.map((pt) => (
              <li key={pt}>{pt}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="project-foot">
        <button
          type="button"
          className="project-toggle"
          aria-expanded={card.details.expanded}
          aria-controls={card.detailsId}
          onClick={() => onToggle(card.id)}
        >
          {card.details.toggleLabel}
          <span className="sr-only"> {card.toggleContext}</span>
        </button>
        <Render vm={card.link} views={linkViews} />
      </div>
    </article>
  );
}

export function ProjectsView({
  vm,
  onFilter = noop,
  onToggle = noop,
}: {
  vm: ProjectsVm;
  onFilter?: (id: string) => void;
  onToggle?: (id: string) => void;
}) {
  return (
    <section id="projects" className="section rv">
      <div className="projects-head">
        <h2 className="section-label">{vm.heading}</h2>
        <div role="group" aria-label={vm.filterGroupLabel} className="projects-filters">
          {vm.filters.map((f) => (
            <button
              key={f.id}
              type="button"
              className="chip chip-pill"
              aria-pressed={f.pressed}
              onClick={() => onFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="projects-grid">
        {vm.cards.map((card) => (
          <Card key={card.id} card={card} onToggle={onToggle} />
        ))}
      </div>

      <div className="projects-more">
        <span>{vm.more.label}</span>
        {vm.more.repos.map((r) => (
          <a key={r.href} href={r.href}>
            {r.label}
          </a>
        ))}
        <a href={vm.more.all.href}>
          {vm.more.all.label} <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  );
}
