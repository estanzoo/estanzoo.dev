import { useState } from 'react';
import { otherRepos, projectFilters, projects, site } from '../content';
import './Projects.css';

type FilterId = (typeof projectFilters)[number]['id'];

export function Projects() {
  const [filter, setFilter] = useState<FilterId>('all');
  const [openId, setOpenId] = useState<string>('hq');

  return (
    <section id="projects" className="section rv">
      <div className="projects-head">
        <h2 className="section-label"># projects</h2>
        <div role="group" aria-label="Filter projects" className="projects-filters">
          {projectFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              className="chip chip-pill"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="projects-grid">
        {projects.map((p) => {
          const open = openId === p.id;
          const match = filter === 'all' || p.cats.includes(filter);
          const detailsId = `project-${p.id}-details`;
          return (
            <article key={p.id} className="card project-card" data-dim={match ? undefined : ''}>
              <div className="project-title">
                <h3>{p.name}</h3>
                <span className="project-date">{p.date}</span>
              </div>
              <p className="project-desc">{p.desc}</p>
              <div className="project-tags">{p.tags}</div>
              <div className="grow project-details" data-open={open ? '' : undefined} id={detailsId}>
                <div className="project-details-inner">
                  <ul>
                    {p.points.map((pt) => (
                      <li key={pt}>{pt}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="project-foot">
                <button
                  type="button"
                  className="project-toggle"
                  aria-expanded={open}
                  aria-controls={detailsId}
                  onClick={() => setOpenId(open ? '' : p.id)}
                >
                  {open ? '− less' : '+ details'}
                  <span className="sr-only"> about {p.name}</span>
                </button>
                {p.href ? (
                  <a className="project-link" href={p.href}>
                    {p.linkText} <span aria-hidden="true">↗</span>
                  </a>
                ) : (
                  <span className="project-link project-nolink">[add link]</span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="projects-more">
        <span>also on github:</span>
        {otherRepos.map((r) => (
          <a key={r.href} href={r.href}>
            {r.label}
          </a>
        ))}
        <a href={`${site.github}?tab=repositories`}>
          all repositories <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  );
}
