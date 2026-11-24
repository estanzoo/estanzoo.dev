// ExperienceView: the logic-free View of the Experience section (owner decision 3), drawn
// the way ContactView is:
//
// - Props are the VM (experienceVm.ts) plus the onToggle callback. No content.ts, no
//   browser APIs, no hooks.
// - The body only reads properties, maps over arrays, and branches through <Render> (the
//   panel and chart slots). Which row is open, its sign and the bar width are decided by
//   the container (Experience.tsx) that builds the VM.
//
// The screen renderer (npm run screens) draws this component from mocks/experience/*.json.
import type { Views } from '../../vm/primitives';
import { Render } from '../../vm/primitives';
import type { ChartVm, ExperienceVm, PanelVm } from './experienceVm';
import './Experience.css';

type ChartOf<K extends ChartVm['kind']> = Extract<ChartVm, { kind: K }>;
type PanelOf<K extends PanelVm['kind']> = Extract<PanelVm, { kind: K }>;

function WerChart({ vm }: { vm: ChartOf<'chart'> }) {
  return (
    <div className="xp-chart" role="img" aria-label={vm.summary}>
      <div className="xp-chart-row" aria-hidden="true">
        <span>{vm.baselineLabel}</span>
        <span>{vm.baselineValue}</span>
      </div>
      <div className="xp-chart-base" aria-hidden="true" />
      <div className="xp-chart-row xp-chart-row-hi" aria-hidden="true">
        <span>{vm.tunedLabel}</span>
        <span>{vm.tunedValue}</span>
      </div>
      <div className="xp-chart-track" aria-hidden="true">
        <div className="bar xp-chart-bar" style={{ width: vm.barWidth }} />
      </div>
    </div>
  );
}

function NoChart(_props: { vm: ChartOf<'none'> }) {
  return null;
}

const chartViews: Views<ChartVm> = { chart: WerChart, none: NoChart };

/** The panel content; both panel variants draw the same body. */
function PanelBody({ vm }: { vm: PanelVm }) {
  return (
    <div className="xp-clip">
      <div className="xp-body">
        <div className="xp-where">{vm.where}</div>
        <div className="xp-main">
          <ul className="xp-points">
            {vm.points.map((pt) => (
              <li key={pt}>{pt}</li>
            ))}
          </ul>
          <Render vm={vm.chart} views={chartViews} />
        </div>
      </div>
    </div>
  );
}

function OpenPanel({ vm }: { vm: PanelOf<'open'> }) {
  return (
    <div id={vm.id} className="grow xp-grow is-open" aria-hidden={false}>
      <PanelBody vm={vm} />
    </div>
  );
}

function ClosedPanel({ vm }: { vm: PanelOf<'closed'> }) {
  return (
    <div id={vm.id} className="grow xp-grow" aria-hidden={true}>
      <PanelBody vm={vm} />
    </div>
  );
}

const panelViews: Views<PanelVm> = { open: OpenPanel, closed: ClosedPanel };

const ignore = () => {};

export function ExperienceView({
  vm,
  onToggle = ignore,
}: {
  vm: ExperienceVm;
  /** Called with the panel id of the row whose button was clicked. */
  onToggle?: (panelId: string) => void;
}) {
  return (
    <section id="experience" className="section rv xp" aria-labelledby="experience-label">
      <h2 id="experience-label" className="section-label xp-label">
        # experience
      </h2>
      {vm.rows.map((row) => (
        <article key={row.panel.id} className="xp-job">
          <button
            type="button"
            className="xp-head"
            aria-expanded={row.expanded}
            aria-controls={row.panel.id}
            onClick={() => onToggle(row.panel.id)}
          >
            <span className="xp-when">{row.when}</span>
            <span className="xp-title">
              {row.role} <span className="xp-org">· {row.org}</span>
            </span>
            <span className="xp-sign" aria-hidden="true">
              {row.sign}
            </span>
          </button>
          <Render vm={row.panel} views={panelViews} />
        </article>
      ))}
    </section>
  );
}
