// L1 unit: proves the Interests view model schema is strict - it takes only the rev and
// light values the stylesheet draws, and rejects unknown fields, so a mock cannot drift
// from the type.
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
  fashion: { card: { kicker: '03', title: 'Fashion', body: 'clothes' } },
};

describe('interestsVmSchema', () => {
  it('accepts a whole valid VM', () => {
    expect(interestsVmSchema.parse(valid)).toEqual(valid);
  });

  it('rejects a rev colour the rev bar does not use', () => {
    const revs = [{ colour: '#000000', delay: '0.00s' }];
    expect(interestsVmSchema.safeParse({ ...valid, f1: { ...valid.f1, revs } }).success).toBe(false);
  });

  it('rejects a start light without a keyframes animation', () => {
    const lights = [{ animation: 'f6' }];
    expect(interestsVmSchema.safeParse({ ...valid, f1: { ...valid.f1, lights } }).success).toBe(false);
  });

  it('rejects a VM without the fashion card', () => {
    const { fashion: _fashion, ...rest } = valid;
    expect(interestsVmSchema.safeParse(rest).success).toBe(false);
  });

  it.each([
    ['the root', { ...valid, extra: 1 }],
    ['a card', { ...valid, films: { card: { ...valid.films.card, href: 'x' } } }],
    ['the films card', { ...valid, films: { ...valid.films, strip: true } }],
    ['the fashion card', { ...valid, fashion: { ...valid.fashion, swatches: [] } }],
    ['the old cubing card', { ...valid, cubing: { card: valid.fashion.card } }],
  ])('rejects an unknown field in %s', (_where, vm) => {
    expect(interestsVmSchema.safeParse(vm).success).toBe(false);
  });
});
