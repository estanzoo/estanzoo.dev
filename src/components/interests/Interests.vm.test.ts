// L1 unit: proves the Interests container builds a schema-valid view model from content.ts
// and the cube state: the design's lights and rev bar, the timer readout in seconds with two
// decimals, and the label and aria-pressed of each timer state. Also proves the random
// scramble never turns the same face twice in a row.
// Leaves to other layers: the clicks and the interval that move between states
// (Interests.behaviour.test.tsx) and the drawing (InterestsView.test.tsx).
import { describe, expect, it } from 'vitest';
import { interests } from '../../content';
import { INITIAL_CUBE, interestsVm, randomScramble } from './Interests';
import { interestsVmSchema } from './interestsVm';

describe('interestsVm', () => {
  it('the initial cube is the design: fixed scramble and stickers, timer idle at 0.00', () => {
    const vm = interestsVmSchema.parse(interestsVm(INITIAL_CUBE));
    expect(vm.cubing.scramble).toBe("R U2 F' L D2 B' R2 U' F L' D B2");
    expect(vm.cubing.stickers.map((s) => s.colour)).toEqual([
      '#4D9BFF', '#F2F2F2', '#FF5A4D', '#FFD84D', '#5BD68A', '#F2F2F2', '#FF9F43', '#4D9BFF', '#FFD84D',
    ]);
    expect(vm.cubing.scrambleLabel).toBe('new scramble');
    expect(vm.cubing.timer).toEqual({ kind: 'idle', text: '0.00', label: 'start timer', pressed: false });
  });

  it('a running timer reads its seconds and offers stop, pressed', () => {
    const vm = interestsVmSchema.parse(interestsVm({ ...INITIAL_CUBE, timer: { kind: 'running', ms: 3274 } }));
    expect(vm.cubing.timer).toEqual({ kind: 'running', text: '3.27', label: 'stop', pressed: true });
  });

  it('a stopped timer keeps its time and offers start timer, not pressed', () => {
    const vm = interestsVmSchema.parse(interestsVm({ ...INITIAL_CUBE, timer: { kind: 'stopped', ms: 14825 } }));
    expect(vm.cubing.timer).toEqual({ kind: 'stopped', text: '14.82', label: 'start timer', pressed: false });
  });

  it('draws the cube state it is given', () => {
    const vm = interestsVm({ ...INITIAL_CUBE, scramble: 'U D', stickers: ['#5BD68A', '#FF9F43'] });
    expect(vm.cubing.scramble).toBe('U D');
    expect(vm.cubing.stickers).toEqual([{ colour: '#5BD68A' }, { colour: '#FF9F43' }]);
  });

  it('five start lights f1..f5 and twelve rev segments: 5 green, 4 amber, 3 red, 0.09s apart', () => {
    const vm = interestsVm(INITIAL_CUBE);
    expect(vm.f1.lights.map((l) => l.animation)).toEqual(['f1', 'f2', 'f3', 'f4', 'f5']);
    expect(vm.f1.revs.map((r) => r.colour)).toEqual([
      ...Array(5).fill('#7EE787'), ...Array(4).fill('#FFB454'), ...Array(3).fill('#FF5A4D'),
    ]);
    expect(vm.f1.revs.map((r) => r.delay)).toEqual([
      '0.00s', '0.09s', '0.18s', '0.27s', '0.36s', '0.45s', '0.54s', '0.63s', '0.72s', '0.81s', '0.90s', '0.99s',
    ]);
  });

  it('takes the intro and the card copy from content.ts', () => {
    const vm = interestsVm(INITIAL_CUBE);
    expect(vm.intro).toBe(interests.intro);
    expect([vm.f1.card, vm.films.card, vm.cubing.card]).toEqual([interests.f1, interests.films, interests.cubing]);
  });
});

describe('randomScramble', () => {
  it('is 12 moves of face plus suffix, never the same face twice in a row', () => {
    // A random source that keeps asking for face 0 must be skipped until another face comes.
    const draws = [0, 0, 0, 0.2, 0.2, 0.5, 0.9, 0.9];
    let n = 0;
    const random = () => draws[n++ % draws.length];
    const moves = randomScramble(random).split(' ');
    expect(moves).toHaveLength(12);
    for (const move of moves) expect(move).toMatch(/^[RLUDFB]['2]?$/);
    for (let i = 1; i < moves.length; i++) expect(moves[i][0]).not.toBe(moves[i - 1][0]);
  });
});
