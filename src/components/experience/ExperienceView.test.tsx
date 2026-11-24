// L4 render: proves ExperienceView draws only what its view model says - one row per VM
// row with its texts, sign and aria-expanded; the panel variant decides the open class and
// aria-hidden; the chart variant draws the chart with its labels and bar width, or nothing;
// a click on a row's button calls onToggle with that row's panel id. No content.ts, no state.
// Leaves to other layers: building the VM and the single-open-row state (the container,
// Experience.behaviour.test.tsx) and the schema (experienceVm.test.ts).
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExperienceView } from './ExperienceView';
import type { ExperienceVm } from './experienceVm';

const vm: ExperienceVm = {
  rows: [
    {
      when: 'then',
      role: 'Cook',
      org: 'Diner',
      sign: 'plus',
      expanded: false,
      panel: { kind: 'closed', id: 'p-diner', where: 'Here', points: ['fried eggs'], chart: { kind: 'none' } },
    },
    {
      when: 'now',
      role: 'Pilot',
      org: 'Airline',
      sign: 'minus',
      expanded: true,
      panel: {
        kind: 'open',
        id: 'p-air',
        where: 'There',
        points: ['flew', 'landed'],
        chart: {
          kind: 'chart',
          summary: 'chart summary',
          baselineLabel: 'before',
          baselineValue: 'all',
          tunedLabel: 'after',
          tunedValue: 'less',
          barWidth: '12.5%',
        },
      },
    },
  ],
};

function draw(onToggle = vi.fn()) {
  const { container } = render(<ExperienceView vm={vm} onToggle={onToggle} />);
  const rows = [...container.querySelectorAll('article.xp-job')];
  return { container, rows, onToggle };
}

describe('ExperienceView', () => {
  it('draws one row per VM row with its when, role, org and sign', () => {
    const { rows } = draw();
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector('.xp-when')).toHaveTextContent('then');
    expect(rows[0].querySelector('.xp-title')).toHaveTextContent('Cook · Diner');
    expect(rows[0].querySelector('.xp-org')).toHaveTextContent('· Diner');
    expect(rows[0].querySelector('.xp-sign')).toHaveTextContent('plus');
    expect(rows[1].querySelector('.xp-sign')).toHaveTextContent('minus');
  });

  it('the button carries aria-expanded from the VM and controls its panel', () => {
    draw();
    const [closed, open] = screen.getAllByRole('button', { hidden: true });
    expect(closed).toHaveAttribute('aria-expanded', 'false');
    expect(closed).toHaveAttribute('aria-controls', 'p-diner');
    expect(open).toHaveAttribute('aria-expanded', 'true');
    expect(open).toHaveAttribute('aria-controls', 'p-air');
  });

  it('the open panel variant has is-open and is not hidden; the closed one is hidden', () => {
    const { container } = draw();
    const closed = container.querySelector('#p-diner');
    const open = container.querySelector('#p-air');
    expect(closed).toHaveClass('grow', 'xp-grow');
    expect(closed).not.toHaveClass('is-open');
    expect(closed).toHaveAttribute('aria-hidden', 'true');
    expect(open).toHaveClass('grow', 'xp-grow', 'is-open');
    expect(open).toHaveAttribute('aria-hidden', 'false');
  });

  it('the panel draws where and one list item per point', () => {
    const { container } = draw();
    const open = container.querySelector('#p-air')!;
    expect(open.querySelector('.xp-where')).toHaveTextContent('There');
    expect([...open.querySelectorAll('.xp-points li')].map((li) => li.textContent)).toEqual(['flew', 'landed']);
  });

  it('the chart variant draws its summary, labels, values and bar width', () => {
    const { container } = draw();
    const chart = container.querySelector('#p-air .xp-chart')!;
    expect(chart).toHaveAttribute('role', 'img');
    expect(chart).toHaveAttribute('aria-label', 'chart summary');
    expect([...chart.querySelectorAll('.xp-chart-row span')].map((s) => s.textContent)).toEqual([
      'before',
      'all',
      'after',
      'less',
    ]);
    expect(chart.querySelector<HTMLElement>('.xp-chart-bar')?.style.width).toBe('12.5%');
  });

  it('the none chart variant draws no chart', () => {
    const { container } = draw();
    expect(container.querySelector('#p-diner .xp-chart')).toBeNull();
  });

  it("a click on a row's button calls onToggle with that row's panel id", () => {
    const { onToggle } = draw();
    fireEvent.click(screen.getAllByRole('button', { hidden: true })[0]);
    expect(onToggle).toHaveBeenCalledExactlyOnceWith('p-diner');
  });
});
