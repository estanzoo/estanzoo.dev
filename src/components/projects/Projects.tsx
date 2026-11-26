// Projects container (owner decision 3): owns the filter and the single open card (none on
// load), builds the ProjectsVm from content.ts and hands it to the logic-free ProjectsView.
// Every decision about what the section shows is made here, in projectsVm(); the View only
// draws.
//
// Only App.tsx and containers import src/content.ts.
import { useState } from 'react';
import { otherRepos, projectFilters, projects, site } from '../../content';
import type { Project } from '../../content';
import { ProjectsView } from './ProjectsView';
import type { DetailsVm, ProjectCardVm, ProjectLinkVm, ProjectsVm } from './projectsVm';

type FilterId = (typeof projectFilters)[number]['id'];

const OPEN: DetailsVm = { kind: 'open', toggleLabel: '− less', expanded: true, dataOpen: '' };
const CLOSED: DetailsVm = { kind: 'closed', toggleLabel: '+ details', expanded: false, dataOpen: null };
const NO_LINK: ProjectLinkVm = { kind: 'placeholder', label: '[add link]' };

function cardVm(p: Project, filter: FilterId, openId: string): ProjectCardVm {
  const match = filter === 'all' || p.cats.includes(filter);
  return {
    id: p.id,
    name: p.name,
    date: p.date,
    desc: p.desc,
    tags: p.tags,
    ...(match ? {} : { dim: '' as const }),
    detailsId: `project-${p.id}-details`,
    points: p.points,
    details: p.id === openId ? OPEN : CLOSED,
    toggleContext: `about ${p.name}`,
    link: p.href ? { kind: 'link', href: p.href, label: p.linkText } : NO_LINK,
  };
}

/** The section's VM for one filter and one open card ('' for none). */
export function projectsVm(filter: FilterId, openId: string, list: Project[] = projects): ProjectsVm {
  return {
    heading: '# projects',
    filterGroupLabel: 'Filter projects',
    filters: projectFilters.map((f) => ({ id: f.id, label: f.label, pressed: f.id === filter })),
    cards: list.map((p) => cardVm(p, filter, openId)),
    more: {
      label: 'also on github:',
      repos: otherRepos.map((r) => ({ href: r.href, label: r.label })),
      all: { href: `${site.github}?tab=repositories`, label: 'all repositories' },
    },
  };
}

export function Projects() {
  const [filter, setFilter] = useState<FilterId>('all');
  const [openId, setOpenId] = useState<string>('');

  const onFilter = (id: string) => setFilter(id as FilterId);
  const onToggle = (id: string) => setOpenId((current) => (current === id ? '' : id));

  return <ProjectsView vm={projectsVm(filter, openId)} onFilter={onFilter} onToggle={onToggle} />;
}
