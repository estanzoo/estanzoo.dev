// Interests container (owner decision 3; the pattern of src/components/contact/Contact.tsx):
// owns the cube state, the randomness of a new scramble (only on click, so the pre-rendered
// markup is the design's fixed cube) and the timer interval, builds the InterestsVm from
// content.ts in interestsVm() and hands it to the logic-free InterestsView.
//
// Only App.tsx and containers import src/content.ts.
import { useEffect, useRef, useState } from 'react';
import { interests } from '../../content';
import { InterestsView } from './InterestsView';
import { LIGHT_ANIMATIONS, STICKER_COLOURS } from './interestsVm';
import type { InterestsVm, RevColour, StickerColour, TimerVm } from './interestsVm';

const FACES = 'RLUDFB';
const SUFFIXES = ['', "'", '2'];
const TICK_MS = 47;

/** The timer as state: idle at zero, running since a start, or stopped at a time. */
type TimerState = { kind: TimerVm['kind']; ms: number };

export type CubeState = { scramble: string; stickers: StickerColour[]; timer: TimerState };

/** The design's fixed cube, so the pre-rendered markup is deterministic. */
export const INITIAL_CUBE: CubeState = {
  scramble: "R U2 F' L D2 B' R2 U' F L' D B2",
  stickers: ['#4D9BFF', '#F2F2F2', '#FF5A4D', '#FFD84D', '#5BD68A', '#F2F2F2', '#FF9F43', '#4D9BFF', '#FFD84D'],
  timer: { kind: 'idle', ms: 0 },
};

const REVS = Array.from({ length: 12 }, (_, i) => ({
  colour: (i < 5 ? '#7EE787' : i < 9 ? '#FFB454' : '#FF5A4D') as RevColour,
  delay: (i * 0.09).toFixed(2) + 's',
}));

const pick = <T,>(list: readonly T[], random: () => number): T => list[Math.floor(random() * list.length)];

/** 12 random moves, never turning the same face twice in a row. */
export function randomScramble(random: () => number = Math.random): string {
  const moves: string[] = [];
  let last = -1;
  while (moves.length < 12) {
    const f = Math.floor(random() * FACES.length);
    if (f === last) continue;
    last = f;
    moves.push(FACES[f] + pick(SUFFIXES, random));
  }
  return moves.join(' ');
}

function timerVm({ kind, ms }: TimerState): TimerVm {
  const text = (ms / 1000).toFixed(2);
  if (kind === 'running') return { kind, text, label: 'stop', pressed: true };
  return { kind, text, label: 'start timer', pressed: false };
}

/** The section's VM for one cube state. */
export function interestsVm(cube: CubeState): InterestsVm {
  return {
    intro: interests.intro,
    f1: {
      card: interests.f1,
      lights: LIGHT_ANIMATIONS.map((animation) => ({ animation })),
      revs: REVS,
    },
    films: { card: interests.films },
    cubing: {
      card: interests.cubing,
      stickers: cube.stickers.map((colour) => ({ colour })),
      scramble: cube.scramble,
      scrambleLabel: 'new scramble',
      timer: timerVm(cube.timer),
    },
  };
}

export function Interests() {
  const [cube, setCube] = useState(INITIAL_CUBE);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef(0);

  const stopInterval = () => {
    if (interval.current !== null) {
      clearInterval(interval.current);
      interval.current = null;
    }
  };

  useEffect(() => stopInterval, []);

  const setTimer = (timer: TimerState) => setCube((c) => ({ ...c, timer }));

  const onScramble = () => {
    stopInterval();
    setCube({
      scramble: randomScramble(),
      stickers: Array.from({ length: 9 }, () => pick(STICKER_COLOURS, Math.random)),
      timer: { kind: 'idle', ms: 0 },
    });
  };

  const onToggleTimer = () => {
    if (interval.current !== null) {
      stopInterval();
      setTimer({ kind: 'stopped', ms: Date.now() - startedAt.current });
      return;
    }
    startedAt.current = Date.now();
    setTimer({ kind: 'running', ms: 0 });
    interval.current = setInterval(() => setTimer({ kind: 'running', ms: Date.now() - startedAt.current }), TICK_MS);
  };

  return <InterestsView vm={interestsVm(cube)} onScramble={onScramble} onToggleTimer={onToggleTimer} />;
}
