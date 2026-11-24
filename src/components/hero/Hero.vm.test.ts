// L1 unit: proves the Hero container builds a schema-valid view model from its state and
// content.ts - the finished terminal is exactly mocks/hero/booted.json, and that mock drawn
// by HeroView reproduces the committed #top markup pin; focus, intro variant, the name
// split and the mapping of runCommand output to lead log lines are decided here.
// Leaves to other layers: the timers, storage and events that move between states
// (Hero.behaviour.test.tsx) and the drawing of each VM (HeroView.test.tsx).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { site } from '../../content';
import { runCommand } from '../../terminal';
import { normalizeMarkup } from '../../testing/markupPin';
import { finishedState, heroVm, leadLine } from './Hero';
import { HeroView } from './HeroView';
import { heroVmSchema } from './heroVm';

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
const bootedMock = JSON.parse(read('../../../mocks/hero/booted.json')) as { vm: unknown };

describe('heroVm', () => {
  it('the finished terminal fits the schema and is the booted mock', () => {
    expect(heroVmSchema.parse(heroVm(finishedState()))).toEqual(bootedMock.vm);
  });

  it('the booted mock drawn by HeroView is the committed #top markup pin', () => {
    const vm = heroVmSchema.parse(bootedMock.vm);
    const html = renderToString(createElement(HeroView, { vm }));
    expect(normalizeMarkup(html)).toBe(read('../../testing/pins/top.txt').replace(/\n$/, ''));
  });

  it('while the intro plays the bar offers skip intro', () => {
    expect(heroVm({ ...finishedState(), booted: false }).bar.intro).toEqual({ kind: 'skip', label: 'skip intro' });
  });

  it('the focused pane gets is-focus and the only pressed label', () => {
    const vm = heroVm({ ...finishedState(), focus: 2 });
    expect([vm.lead, ...vm.agents].map((p) => [p.className, p.pressed])).toEqual([
      ['pane pane-lead', false],
      ['pane pane-agent', false],
      ['pane pane-agent is-focus', true],
    ]);
  });

  it('each agent shows its status as kind and label', () => {
    const vm = heroVm({ ...finishedState(), s1: 'working', s2: 'idle' });
    expect(vm.agents.map((a) => a.status)).toEqual([
      { kind: 'working', label: 'working' },
      { kind: 'idle', label: 'idle' },
    ]);
  });

  it('splits the shown name on the space of the real name, mid-scramble too', () => {
    const vm = heroVm({ ...finishedState(), name: 'E#h%n Z<u' });
    expect(vm.lead.name).toEqual({ label: site.name, first: 'E#h%n', last: 'Z<u' });
  });

  it('an empty name keeps both name lines open with a space', () => {
    const vm = heroVm({ ...finishedState(), name: '' });
    expect(vm.lead.name).toMatchObject({ first: ' ', last: ' ' });
  });

  it('carries the typed prompt value', () => {
    expect(heroVm({ ...finishedState(), cmd: 'sta' }).prompt).toBe('sta');
  });
});

describe('leadLine', () => {
  it('turns a command output link into the line link', () => {
    const [, mail] = runCommand('contact')!.lines;
    expect(leadLine(mail, 'x')).toEqual({ kind: 'out', id: 'x', text: 'mail:', link: { href: `mailto:${site.email}`, label: site.email } });
  });

  it('keeps a line without a link plain', () => {
    const [echo, err] = runCommand('nope')!.lines;
    expect([leadLine(echo, 'a'), leadLine(err, 'b')]).toEqual([
      { kind: 'cmd', id: 'a', text: '$ nope' },
      { kind: 'err', id: 'b', text: 'command not found: nope · try help' },
    ]);
  });
});
