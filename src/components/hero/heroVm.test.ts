// L1 unit: proves the Hero view model schema is strict - it accepts every variant of its
// union slots (intro button, agent status, the line kinds of the lead log and of the agent
// panes) and rejects unknown fields, unknown kinds, a line kind a pane never prints and a
// link where a line never carries one, so a mock cannot drift from the type.
// Leaves to other layers: how the container builds the VM (Hero.vm.test.ts) and how the
// View draws it (HeroView.test.tsx).
import { describe, expect, it } from 'vitest';
import { heroVmSchema } from './heroVm';
import type { AgentVm, HeroVm } from './heroVm';

const agent: AgentVm = {
  index: 1,
  label: '[1] agent/projects',
  className: 'pane pane-agent',
  pressed: false,
  status: { kind: 'done', label: 'done' },
  lines: [{ kind: 'ok', id: 'a0', text: 'done · 4 projects', link: { href: '#projects', label: 'open ↓' } }],
};

const valid: HeroVm = {
  bar: { panes: '3 panes', intro: { kind: 'replay', label: 'replay intro' } },
  lead: {
    index: 0,
    label: '[0] lead',
    className: 'pane pane-lead is-focus',
    pressed: true,
    name: { label: 'A B', first: 'A', last: 'B' },
    tagline: 'tag',
    log: [{ kind: 'cmd', id: 'l0', text: '$ whoami' }],
  },
  prompt: '',
  chips: ['help'],
  agents: [agent, { ...agent, index: 2, label: '[2] agent/experience' }],
};

const withLeadLine = (line: unknown) => ({ ...valid, lead: { ...valid.lead, log: [line] } });
const withAgentLine = (line: unknown) => ({ ...valid, agents: [{ ...agent, lines: [line] }] });
const link = { href: '#a', label: 'a' };

describe('heroVmSchema', () => {
  it('accepts a finished terminal', () => {
    expect(heroVmSchema.parse(valid)).toEqual(valid);
  });

  it.each(['skip', 'replay'] as const)('accepts the %s intro button', (kind) => {
    const vm = { ...valid, bar: { ...valid.bar, intro: { kind, label: 'x' } } };
    expect(heroVmSchema.parse(vm)).toEqual(vm);
  });

  it.each(['idle', 'working', 'done'] as const)('accepts the %s agent status', (kind) => {
    const vm = { ...valid, agents: [{ ...agent, status: { kind, label: kind } }] };
    expect(heroVmSchema.parse(vm)).toEqual(vm);
  });

  it.each(['cmd', 'out', 'ok', 'err'] as const)('accepts a %s line in the lead log', (kind) => {
    const vm = withLeadLine({ kind, id: 'x', text: 't' });
    expect(heroVmSchema.parse(vm)).toEqual(vm);
  });

  it.each(['out', 'ok'] as const)('accepts a link on a %s line in the lead log', (kind) => {
    const vm = withLeadLine({ kind, id: 'x', text: 't', link });
    expect(heroVmSchema.parse(vm)).toEqual(vm);
  });

  it('rejects a dim line in the lead log (only agents print dim lines)', () => {
    expect(heroVmSchema.safeParse(withLeadLine({ kind: 'dim', id: 'x', text: 't' })).success).toBe(false);
  });

  it.each(['cmd', 'err'] as const)('rejects a link on a %s line in the lead log', (kind) => {
    expect(heroVmSchema.safeParse(withLeadLine({ kind, id: 'x', text: 't', link })).success).toBe(false);
  });

  it.each([
    ['dim', { kind: 'dim', id: 'x', text: 't' }],
    ['out', { kind: 'out', id: 'x', text: 't' }],
    ['ok', { kind: 'ok', id: 'x', text: 't', link }],
  ])('accepts a %s line in an agent pane', (_, line) => {
    const vm = withAgentLine(line);
    expect(heroVmSchema.parse(vm)).toEqual(vm);
  });

  it.each(['cmd', 'err'] as const)('rejects a %s line in an agent pane', (kind) => {
    expect(heroVmSchema.safeParse(withAgentLine({ kind, id: 'x', text: 't' })).success).toBe(false);
  });

  it('rejects an agent ok line without its link (every agent reports with one)', () => {
    expect(heroVmSchema.safeParse(withAgentLine({ kind: 'ok', id: 'x', text: 't' })).success).toBe(false);
  });

  it('rejects a link on an agent out line', () => {
    expect(heroVmSchema.safeParse(withAgentLine({ kind: 'out', id: 'x', text: 't', link })).success).toBe(false);
  });

  it('rejects an unknown top-level field', () => {
    expect(heroVmSchema.safeParse({ ...valid, extra: 1 }).success).toBe(false);
  });

  it('rejects an unknown field in the lead pane', () => {
    expect(heroVmSchema.safeParse({ ...valid, lead: { ...valid.lead, focus: 0 } }).success).toBe(false);
  });

  it('rejects an unknown intro kind', () => {
    expect(heroVmSchema.safeParse({ ...valid, bar: { ...valid.bar, intro: { kind: 'pause', label: 'x' } } }).success).toBe(false);
  });

  it('rejects an unknown status kind', () => {
    expect(heroVmSchema.safeParse({ ...valid, agents: [{ ...agent, status: { kind: 'failed', label: 'x' } }] }).success).toBe(false);
  });

  it('rejects an agent pane index other than 1 or 2', () => {
    expect(heroVmSchema.safeParse({ ...valid, agents: [{ ...agent, index: 3 }] }).success).toBe(false);
  });

  it('rejects an unknown field inside a link', () => {
    expect(heroVmSchema.safeParse(withLeadLine({ kind: 'out', id: 'x', text: 't', link: { ...link, target: '_blank' } })).success).toBe(false);
  });
});
