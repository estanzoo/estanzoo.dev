// L1 unit: proves the Interests container builds a schema-valid view model from content.ts:
// the design's start lights and rev bar, and the copy of the three cards.
// Leaves to other layers: the drawing (InterestsView.test.tsx) and the CSS animations
// (screenshots, manual check).
import { describe, expect, it } from 'vitest';
import { interests } from '../../content';
import { interestsVm } from './Interests';
import { interestsVmSchema } from './interestsVm';

describe('interestsVm', () => {
  it('is schema-valid', () => {
    expect(() => interestsVmSchema.parse(interestsVm())).not.toThrow();
  });

  it('five start lights f1..f5 and twelve rev segments: 5 green, 4 amber, 3 red, 0.09s apart', () => {
    const vm = interestsVm();
    expect(vm.f1.lights.map((l) => l.animation)).toEqual(['f1', 'f2', 'f3', 'f4', 'f5']);
    expect(vm.f1.revs.map((r) => r.colour)).toEqual([
      ...Array(5).fill('#7EE787'), ...Array(4).fill('#FFB454'), ...Array(3).fill('#FF5A4D'),
    ]);
    expect(vm.f1.revs.map((r) => r.delay)).toEqual([
      '0.00s', '0.09s', '0.18s', '0.27s', '0.36s', '0.45s', '0.54s', '0.63s', '0.72s', '0.81s', '0.90s', '0.99s',
    ]);
  });

  it('takes the intro and the card copy from content.ts', () => {
    const vm = interestsVm();
    expect(vm.intro).toBe(interests.intro);
    expect([vm.f1.card, vm.films.card, vm.fashion.card]).toEqual([interests.f1, interests.films, interests.fashion]);
  });

  it('the fashion card is 03 · wearing, Fashion, with the owner placeholder', () => {
    expect(interestsVm().fashion.card).toEqual({
      kicker: '03 · wearing',
      title: 'Fashion',
      body: '[Designers, brands or pieces you’re into]',
    });
  });
});
