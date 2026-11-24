import { useState } from 'react';
import { jobs, werChart } from '../content';
import './Experience.css';

const DEFAULT_OPEN = 'xplode';

function WerChart({ open }: { open: boolean }) {
  return (
    <div className="xp-chart" role="img" aria-label={werChart.summary}>
      <div className="xp-chart-row" aria-hidden="true">
        <span>{werChart.baselineLabel}</span>
        <span>100%</span>
      </div>
      <div className="xp-chart-base" aria-hidden="true" />
      <div className="xp-chart-row xp-chart-row-hi" aria-hidden="true">
        <span>{werChart.tunedLabel}</span>
        <span>−{werChart.reduction}%</span>
      </div>
      <div className="xp-chart-track" aria-hidden="true">
        <div className="bar xp-chart-bar" style={{ width: open ? `${+(100 - werChart.reduction).toFixed(2)}%` : '100%' }} />
      </div>
    </div>
  );
}

export function Experience() {
  const [openId, setOpenId] = useState<string>(DEFAULT_OPEN);

  return (
    <section id="experience" className="section rv xp" aria-labelledby="experience-label">
      <h2 id="experience-label" className="section-label xp-label">
        # experience
      </h2>
      {jobs.map((j) => {
        const open = openId === j.id;
        const panelId = `job-${j.id}-panel`;
        return (
          <article key={j.id} className="xp-job">
            <button
              type="button"
              className="xp-head"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenId(open ? '' : j.id)}
            >
              <span className="xp-when">{j.when}</span>
              <span className="xp-title">
                {j.role} <span className="xp-org">· {j.org}</span>
              </span>
              <span className="xp-sign" aria-hidden="true">
                {open ? '−' : '+'}
              </span>
            </button>
            <div id={panelId} className={'grow xp-grow' + (open ? ' is-open' : '')} aria-hidden={!open}>
              <div className="xp-clip">
                <div className="xp-body">
                  <div className="xp-where">{j.where}</div>
                  <div className="xp-main">
                    <ul className="xp-points">
                      {j.points.map((pt) => (
                        <li key={pt}>{pt}</li>
                      ))}
                    </ul>
                    {j.chart && <WerChart open={open} />}
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
