// Experience view model (owner decision 3, after the Contact pilot).
//
// A view model holds display-ready values only. The section is an accordion of job rows;
// each row is a header button and a panel. The panel is a union on 'kind' (open, closed):
// the variant decides the panel's open class and aria-hidden, and carries the panel body.
// The chart slot inside the panel is a union too (chart, none); the chart variant carries
// its labels and the bar width as final CSS text ('59.3%' while the panel is open, '100%'
// while it is closed, so the bar animates on open through the CSS transition).
//
// The View (ExperienceView.tsx) draws a VM; the container (Experience.tsx) builds it;
// mocks (mocks/experience/*.json) hold one VM per visual state under 'vm' and must parse
// with this schema. Every object is strict: an unknown field is an error.
import { z } from 'zod';

/** The WER bar chart under a role, or nothing. */
export type ChartVm =
  | {
      kind: 'chart';
      /** Screen-reader description of the whole chart (aria-label). */
      summary: string;
      baselineLabel: string;
      /** The baseline row's value, e.g. '100%'. */
      baselineValue: string;
      tunedLabel: string;
      /** The tuned row's value, e.g. '−40.7%'. */
      tunedValue: string;
      /** CSS width of the tuned bar, e.g. '59.3%'. */
      barWidth: string;
    }
  | { kind: 'none' };

type PanelBody = {
  /** The panel element id; the row's button points at it with aria-controls. */
  id: string;
  where: string;
  points: string[];
  chart: ChartVm;
};

/** A row's collapsible panel: open shows the body, closed collapses and hides it. */
export type PanelVm = ({ kind: 'open' } & PanelBody) | ({ kind: 'closed' } & PanelBody);

export type JobRowVm = {
  when: string;
  role: string;
  /** The organisation name; the View draws the '· ' before it. */
  org: string;
  /** The toggle sign: '−' while open, '+' while closed. */
  sign: string;
  /** aria-expanded of the row's button. */
  expanded: boolean;
  panel: PanelVm;
};

export type ExperienceVm = {
  /** The job rows, in page order. */
  rows: JobRowVm[];
};

const chartVmSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('chart'),
    summary: z.string(),
    baselineLabel: z.string(),
    baselineValue: z.string(),
    tunedLabel: z.string(),
    tunedValue: z.string(),
    barWidth: z.string(),
  }),
  z.strictObject({ kind: z.literal('none') }),
]);

const panelBody = { id: z.string(), where: z.string(), points: z.array(z.string()), chart: chartVmSchema };

const panelVmSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('open'), ...panelBody }),
  z.strictObject({ kind: z.literal('closed'), ...panelBody }),
]);

const jobRowVmSchema = z.strictObject({
  when: z.string(),
  role: z.string(),
  org: z.string(),
  sign: z.string(),
  expanded: z.boolean(),
  panel: panelVmSchema,
});

export const experienceVmSchema: z.ZodType<ExperienceVm> = z.strictObject({
  rows: z.array(jobRowVmSchema),
});
