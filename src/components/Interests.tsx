import { useEffect, useRef, useState } from 'react';
import { interests } from '../content';
import './Interests.css';

const FACES = 'RLUDFB';
const SUFFIXES = ['', "'", '2'];
const STICKER_COLOURS = ['#F2F2F2', '#FFD84D', '#FF5A4D', '#FF9F43', '#4D9BFF', '#5BD68A'];

// Fixed initial state from the design so the pre-rendered markup is deterministic.
const INITIAL_SCRAMBLE = "R U2 F' L D2 B' R2 U' F L' D B2";
const INITIAL_CUBE = ['#4D9BFF', '#F2F2F2', '#FF5A4D', '#FFD84D', '#5BD68A', '#F2F2F2', '#FF9F43', '#4D9BFF', '#FFD84D'];

const F1_LIGHTS = ['f1', 'f2', 'f3', 'f4', 'f5'];
const REV_SEGMENTS = Array.from({ length: 12 }, (_, i) => ({
  delay: (i * 0.09).toFixed(2) + 's',
  colour: i < 5 ? '#7EE787' : i < 9 ? '#FFB454' : '#FF5A4D',
}));

const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

/** 12 random moves, never turning the same face twice in a row. */
function randomScramble(): string {
  const moves: string[] = [];
  let last = -1;
  while (moves.length < 12) {
    const f = Math.floor(Math.random() * FACES.length);
    if (f === last) continue;
    last = f;
    moves.push(FACES[f] + pick(SUFFIXES));
  }
  return moves.join(' ');
}

function F1Card() {
  const { kicker, title, body } = interests.f1;
  return (
    <article className="card interest-card">
      <div className="interest-visual f1-visual" aria-hidden="true">
        <div className="f1-lights">
          {F1_LIGHTS.map((name) => (
            <span key={name} className="f1l" style={{ animationName: name }} />
          ))}
        </div>
        <div className="f1-revs">
          {REV_SEGMENTS.map((r, i) => (
            <span key={i} className="rev" style={{ background: r.colour, animationDelay: r.delay }} />
          ))}
        </div>
      </div>
      <span className="interest-kicker">{kicker}</span>
      <h3 className="interest-title">{title}</h3>
      <p className="interest-body">{body}</p>
    </article>
  );
}

function FilmsCard() {
  const { kicker, title, body } = interests.films;
  return (
    <article className="card interest-card">
      <div className="interest-visual film-visual" aria-hidden="true">
        <div className="film-window">
          <div className="film">
            <div className="film-holes" />
            <div className="film-frames" />
            <div className="film-holes" />
          </div>
        </div>
      </div>
      <span className="interest-kicker">{kicker}</span>
      <h3 className="interest-title">{title}</h3>
      <p className="interest-body">{body}</p>
    </article>
  );
}

function CubingCard() {
  const { kicker, title, body } = interests.cubing;
  const [scramble, setScramble] = useState(INITIAL_SCRAMBLE);
  const [cube, setCube] = useState(INITIAL_CUBE);
  const [running, setRunning] = useState(false);
  const [ms, setMs] = useState(0);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef(0);

  const stopInterval = () => {
    if (interval.current !== null) {
      clearInterval(interval.current);
      interval.current = null;
    }
  };

  useEffect(() => stopInterval, []);

  const newScramble = () => {
    stopInterval();
    setScramble(randomScramble());
    setCube(Array.from({ length: 9 }, () => pick(STICKER_COLOURS)));
    setRunning(false);
    setMs(0);
  };

  const toggleTimer = () => {
    if (interval.current !== null) {
      stopInterval();
      setRunning(false);
      setMs(Date.now() - startedAt.current);
      return;
    }
    startedAt.current = Date.now();
    setRunning(true);
    setMs(0);
    interval.current = setInterval(() => setMs(Date.now() - startedAt.current), 47);
  };

  return (
    <article className="card interest-card">
      <div className="cube-visual">
        <div className="cube-grid" aria-hidden="true">
          {cube.map((c, i) => (
            <span key={i} className="sticker" style={{ background: c }} />
          ))}
        </div>
        <div className="cube-readout">
          <span className="cube-time" aria-live="off">
            {(ms / 1000).toFixed(2)}
          </span>
          <span className="cube-scramble">{scramble}</span>
        </div>
      </div>
      <span className="interest-kicker">{kicker}</span>
      <h3 className="interest-title">{title}</h3>
      <p className="interest-body">{body}</p>
      <div className="cube-actions">
        <button type="button" className="chip cube-chip" onClick={newScramble}>
          new scramble
        </button>
        <button type="button" className="chip cube-chip cube-toggle" onClick={toggleTimer} aria-pressed={running}>
          {running ? 'stop' : 'start timer'}
        </button>
      </div>
    </article>
  );
}

export function Interests() {
  return (
    <section id="interests" className="section rv" aria-labelledby="interests-label">
      <h2 id="interests-label" className="section-label interests-label">
        # interests
      </h2>
      <p className="interests-intro">{interests.intro}</p>
      <div className="interests-grid">
        <F1Card />
        <FilmsCard />
        <CubingCard />
      </div>
    </section>
  );
}
