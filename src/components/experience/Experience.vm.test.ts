// L1 unit: proves the Experience container builds a schema-valid view model from content.ts
// for each open row (or none): only that row is open with sign '−' and aria-expanded, the
// others closed with '+', and the WER chart bar is at its reduced width only while its row
// is open.
// Leaves to other layers: the clicks that move the open row (Experience.behaviour.test.tsx)
// and the drawing (ExperienceView.test.tsx).
import { describe, expect, it } from 'vitest';
import { jobs, werChart } from '../../content';
import { experienceVm } from './Experience';
import { experienceVmSchema } from './experienceVm';

const openIds = (openId: string) =>
  experienceVmSchema
    .parse(experienceVm(openId))
    .rows.map((row) => [row.panel.id, row.panel.kind, row.sign, row.expanded]);

describe('experienceVm', () => {
  it.each(jobs.map((j) => j.id))('with %s open only that row is open', (openId) => {
    expect(openIds(openId)).toEqual(
      jobs.map((j) =>
        j.id === openId ? [`job-${j.id}-panel`, 'open', '−', true] : [`job-${j.id}-panel`, 'closed', '+', false],
      ),
    );
  });

  it('with no open id every row is closed', () => {
    expect(openIds('').map(([, kind]) => kind)).toEqual(jobs.map(() => 'closed'));
  });

  it('takes each row’s texts and points from content.ts', () => {
    const rows = experienceVm('').rows;
    expect(rows.map((r) => [r.when, r.role, r.org, r.panel.where, r.panel.points])).toEqual(
      jobs.map((j) => [j.when, j.role, j.org, j.where, j.points]),
    );
  });

  it('only rows with a chart in content.ts get the chart variant', () => {
    expect(experienceVm('').rows.map((r) => r.panel.chart.kind)).toEqual(jobs.map((j) => (j.chart ? 'chart' : 'none')));
  });

  it('the chart carries its labels and the reduced bar width while its row is open', () => {
    const chartJob = jobs.find((j) => j.chart)!;
    const open = experienceVm(chartJob.id).rows[jobs.indexOf(chartJob)].panel.chart;
    expect(open).toEqual({
      kind: 'chart',
      summary: werChart.summary,
      baselineLabel: werChart.baselineLabel,
      baselineValue: '100%',
      tunedLabel: werChart.tunedLabel,
      tunedValue: '−40.7%',
      barWidth: '59.3%',
    });
  });

  it('the chart bar is at full width while its row is closed', () => {
    const chartJob = jobs.find((j) => j.chart)!;
    const closed = experienceVm('').rows[jobs.indexOf(chartJob)].panel.chart;
    expect(closed).toMatchObject({ kind: 'chart', barWidth: '100%' });
  });
});
