// L1 unit: proves the Interests view model schema is strict - it accepts each timer variant,
// takes only the sticker, rev and light values the stylesheet draws, and rejects unknown
// fields and unknown kinds, so a mock cannot drift from the type.
// Leaves to other layers: how the container builds the VM (Interests.vm.test.ts) and how the
// View draws it (InterestsView.test.tsx).
import { describe, expect, it } from 'vitest';
import { interestsVmSchema } from './interestsVm';
import type { InterestsVm } from './interestsVm';

const valid: InterestsVm = {
  intro: 'What I do',
  f1: {
    card: { kicker: '01', title: 'F1', body: 'cars' },
    lights: [{ animation: 'f1' }, { animation: 'f5' }],
    revs: [{ colour: '#7EE787', delay: '0.00s' }],
  },
  films: { card: { kicker: '02', title: 'Films', body: 'films' } },
  cubing: {
    card: { kicker: '03', title: 'Cubing', body: 'cubes' },
    stickers: [{ colour: '#4D9BFF' }, { colour: '#F2F2F2' }],
    scramble: "R U2 F'",
    scrambleLabel: 'new scramble',
    timer: { kind: 'idle', text: '0.00', label: 'start timer', pressed: false },
  },
};

describe('interestsVmSchema', () => {
  it('accepts a whole valid VM', () => {
    expect(interestsVmSchema.parse(valid)).toEqual(valid);
  });

  it.each([
    { kind: 'idle', text: '0.00', label: 'start timer', pressed: false },
    { kind: 'running', text: '3.27', label: 'stop', pressed: true },
    { kind: 'stopped', text: '12.04', label: 'start timer', pressed: false },
  ] as const)('accepts the $kind timer variant', (timer) => {
    const vm = { ...valid, cubing: { ...valid.cubing, timer } };
    expect(interestsVmSchema.parse(vm)).toEqual(vm);
  });

  it('rejects a running timer that is not pressed', () => {
    const timer = { kind: 'running', text: '1.00', label: 'stop', pressed: false };
    expect(interestsVmSchema.safeParse({ ...valid, cubing: { ...valid.cubing, timer } }).success).toBe(false);
  });

  it('rejects an unknown timer kind', () => {
    const timer = { kind: 'paused', text: '1.00', label: 'x', pressed: false };
    expect(interestsVmSchema.safeParse({ ...valid, cubing: { ...valid.cubing, timer } }).success).toBe(false);
  });

  it('rejects a sticker colour the cube does not use', () => {
    const stickers = [{ colour: 'red' }];
    expect(interestsVmSchema.safeParse({ ...valid, cubing: { ...valid.cubing, stickers } }).success).toBe(false);
  });

  it('rejects a rev colour the rev bar does not use', () => {
    const revs = [{ colour: '#000000', delay: '0.00s' }];
    expect(interestsVmSchema.safeParse({ ...valid, f1: { ...valid.f1, revs } }).success).toBe(false);
  });

  it('rejects a start light without a keyframes animation', () => {
    const lights = [{ animation: 'f6' }];
    expect(interestsVmSchema.safeParse({ ...valid, f1: { ...valid.f1, lights } }).success).toBe(false);
  });

  it.each([
    ['the root', { ...valid, extra: 1 }],
    ['a card', { ...valid, films: { card: { ...valid.films.card, href: 'x' } } }],
    ['the films card', { ...valid, films: { ...valid.films, strip: true } }],
    ['a sticker', { ...valid, cubing: { ...valid.cubing, stickers: [{ colour: '#4D9BFF', face: 'U' }] } }],
    ['the timer', { ...valid, cubing: { ...valid.cubing, timer: { ...valid.cubing.timer, ms: 0 } } }],
  ])('rejects an unknown field in %s', (_where, vm) => {
    expect(interestsVmSchema.safeParse(vm).success).toBe(false);
  });
});
