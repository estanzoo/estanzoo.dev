// Experience container (owner decision 3): owns which row is open (one at a time, Xplode
// by default), builds the ExperienceVm from content.ts and hands it to the logic-free
// ExperienceView. Every decision about what the section shows is made here, in
// experienceVm(): the open/closed panel, the sign, aria-expanded, and the chart bar width
// (reduced while its row is open, full while closed; the CSS width transition animates it).
//
// Only App.tsx and containers import src/content.ts.
import { useState } from 'react';
import { jobs, werChart } from '../../content';
import type { Job } from '../../content';
import { ExperienceView } from './ExperienceView';
import type { ChartVm, ExperienceVm, JobRowVm } from './experienceVm';

const DEFAULT_OPEN = 'xplode';

const panelId = (id: string) => `job-${id}-panel`;

function chartVm(job: Job, open: boolean): ChartVm {
  if (!job.chart) return { kind: 'none' };
  return {
    kind: 'chart',
    summary: werChart.summary,
    baselineLabel: werChart.baselineLabel,
    baselineValue: '100%',
    tunedLabel: werChart.tunedLabel,
    tunedValue: `−${werChart.reduction}%`,
    barWidth: open ? `${+(100 - werChart.reduction).toFixed(2)}%` : '100%',
  };
}

function rowVm(job: Job, open: boolean): JobRowVm {
  return {
    when: job.when,
    role: job.role,
    org: job.org,
    sign: open ? '−' : '+',
    expanded: open,
    panel: {
      kind: open ? 'open' : 'closed',
      id: panelId(job.id),
      where: job.where,
      points: job.points,
      chart: chartVm(job, open),
    },
  };
}

/** The section's VM with the row of `openId` open ('' or an unknown id: all closed). */
export function experienceVm(openId: string): ExperienceVm {
  return { rows: jobs.map((job) => rowVm(job, job.id === openId)) };
}

export function Experience() {
  const [openId, setOpenId] = useState<string>(DEFAULT_OPEN);

  const onToggle = (toggled: string) => {
    const job = jobs.find((j) => panelId(j.id) === toggled);
    if (!job) return;
    setOpenId((current) => (current === job.id ? '' : job.id));
  };

  return <ExperienceView vm={experienceVm(openId)} onToggle={onToggle} />;
}
