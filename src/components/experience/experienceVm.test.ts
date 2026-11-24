// L1 unit: proves the Experience view model schema is strict - it accepts each panel
// variant (open, closed) and each chart variant (chart, none) and rejects unknown fields
// and unknown kinds, so a mock cannot drift from the type.
// Leaves to other layers: how the container builds the VM (Experience.vm.test.ts) and how
// the View draws it (ExperienceView.test.tsx).
import { describe, expect, it } from 'vitest';
import { experienceVmSchema } from './experienceVm';
import type { ChartVm, ExperienceVm, JobRowVm } from './experienceVm';

const chart: ChartVm = {
  kind: 'chart',
  summary: 'WER is 40.7% lower',
  baselineLabel: 'baseline',
  baselineValue: '100%',
  tunedLabel: 'tuned',
  tunedValue: '−40.7%',
  barWidth: '59.3%',
};

const row: JobRowVm = {
  when: 'Jan — Apr 2026',
  role: 'Engineer',
  org: 'Acme',
  sign: '−',
  expanded: true,
  panel: { kind: 'open', id: 'job-acme-panel', where: 'Toronto', points: ['a', 'b'], chart },
};

const valid: ExperienceVm = { rows: [row] };

const withPanel = (panel: unknown) => ({ rows: [{ ...row, panel }] });

describe('experienceVmSchema', () => {
  it.each(['open', 'closed'] as const)('accepts the %s panel variant', (kind) => {
    const vm = withPanel({ ...row.panel, kind });
    expect(experienceVmSchema.parse(vm)).toEqual(vm);
  });

  it('accepts the none chart variant', () => {
    const vm = withPanel({ ...row.panel, chart: { kind: 'none' } });
    expect(experienceVmSchema.parse(vm)).toEqual(vm);
  });

  it('rejects an unknown top-level field', () => {
    expect(experienceVmSchema.safeParse({ ...valid, extra: 1 }).success).toBe(false);
  });

  it('rejects an unknown field inside a row', () => {
    expect(experienceVmSchema.safeParse({ rows: [{ ...row, id: 'acme' }] }).success).toBe(false);
  });

  it('rejects an unknown panel kind', () => {
    expect(experienceVmSchema.safeParse(withPanel({ ...row.panel, kind: 'opening' })).success).toBe(false);
  });

  it('rejects an unknown field inside the panel variant', () => {
    expect(experienceVmSchema.safeParse(withPanel({ ...row.panel, rows: '1fr' })).success).toBe(false);
  });

  it('rejects an unknown chart kind', () => {
    expect(experienceVmSchema.safeParse(withPanel({ ...row.panel, chart: { kind: 'pie' } })).success).toBe(false);
  });

  it('rejects an unknown field inside the chart variants', () => {
    expect(experienceVmSchema.safeParse(withPanel({ ...row.panel, chart: { ...chart, open: true } })).success).toBe(false);
    expect(experienceVmSchema.safeParse(withPanel({ ...row.panel, chart: { kind: 'none', barWidth: '0%' } })).success).toBe(
      false,
    );
  });
});
