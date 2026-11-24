import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { jobs, projects, site, werChart } from '../content';
import { runCommand, type LineKind, type LineSpec } from '../terminal';
import './Hero.css';

interface Line extends LineSpec {
  id: string;
}

type Status = 'idle' | 'working' | 'done';
type LogTarget = 'log' | 'a1' | 'a2';

const INTRO_KEY = 'intro-seen';
const SCRAMBLE_CHARS = '01<>/_#$%=+*';
const MAX_LINES: Record<LogTarget, number> = { log: 6, a1: 5, a2: 5 };

const projectNames = projects.map((p) => p.name).join(', ');
const orgNames = jobs.map((j) => j.org.split(',')[0].replace(/ Inc\.$/, '')).join(', ');

const AGENT_SCRIPT: Record<1 | 2, { at: number; kind: LineKind; text: string; href?: string; linkText?: string }[]> = {
  1: [
    { at: 0, kind: 'dim', text: '← lead: what has he shipped?' },
    { at: 600, kind: 'dim', text: 'reading github.com/estanzoo' },
    { at: 1400, kind: 'out', text: '→ lead: ' + projectNames },
    { at: 2000, kind: 'ok', text: `done · ${projects.length} projects`, href: '#projects', linkText: 'open ↓' },
  ],
  2: [
    { at: 0, kind: 'dim', text: '← lead: where has he worked?' },
    { at: 900, kind: 'out', text: '→ lead: ' + orgNames },
    { at: 1600, kind: 'out', text: `→ agent/projects: mention the ${werChart.reduction}% WER drop` },
    { at: 2300, kind: 'ok', text: `done · ${jobs.length} roles`, href: '#experience', linkText: 'open ↓' },
  ],
};

let seq = 0;
const mk = (spec: LineSpec): Line => ({ ...spec, id: 'l' + ++seq });
// Deterministic ids for the finished state so server and client markup match.
const fixed = (prefix: string, specs: LineSpec[]): Line[] => specs.map((s, i) => ({ ...s, id: prefix + i }));

const finishedState = () => ({
  name: site.name,
  cmd: '',
  booted: true,
  s1: 'done' as Status,
  s2: 'done' as Status,
  log: fixed('fl', [
    { kind: 'cmd', text: '$ whoami' },
    { kind: 'cmd', text: '$ hq dispatch --team portfolio' },
    { kind: 'out', text: 'dispatched 2 agents, 2 worktrees' },
    { kind: 'ok', text: 'both agents reported. your turn: type help' },
  ]),
  a1: fixed('fa', AGENT_SCRIPT[1].filter((_, i) => i !== 1)),
  a2: fixed('fb', AGENT_SCRIPT[2]),
});

const chips = ['help', 'projects', 'experience', 'stack', 'contact'];

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function Hero() {
  const init = finishedState();
  const [name, setName] = useState(init.name);
  const [cmd, setCmd] = useState('');
  const [booted, setBooted] = useState(true);
  const [focus, setFocus] = useState(0);
  const [s1, setS1] = useState<Status>(init.s1);
  const [s2, setS2] = useState<Status>(init.s2);
  const [lines, setLines] = useState<Record<LogTarget, Line[]>>({ log: init.log, a1: init.a1, a2: init.a2 });

  const timers = useRef<number[]>([]);
  const scrambleIv = useRef<number | null>(null);
  const reduce = useRef(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);
  const pointer = useRef({ x: 0, y: 0 });

  const at = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const stopAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (scrambleIv.current) {
      clearInterval(scrambleIv.current);
      scrambleIv.current = null;
    }
  };

  const push = (target: LogTarget, spec: LineSpec) => {
    const line = mk(spec);
    setLines((prev) => ({ ...prev, [target]: [...prev[target], line].slice(-MAX_LINES[target]) }));
  };

  const scramble = () => {
    const target = site.name;
    if (scrambleIv.current) clearInterval(scrambleIv.current);
    if (reduce.current) {
      setName(target);
      return;
    }
    let i = 0;
    scrambleIv.current = window.setInterval(() => {
      i++;
      const shown = Math.floor(i / 3);
      let out = '';
      for (let c = 0; c < target.length; c++) {
        out += c < shown || target[c] === ' ' ? target[c] : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      }
      setName(out);
      if (shown >= target.length && scrambleIv.current) {
        clearInterval(scrambleIv.current);
        scrambleIv.current = null;
      }
    }, 40);
  };

  const typeCmd = (text: string, t0: number, then: () => void) => {
    for (let i = 1; i <= text.length; i++) at(t0 + i * 55, () => setCmd(text.slice(0, i)));
    const end = t0 + text.length * 55 + 280;
    at(end, () => {
      setCmd('');
      then();
    });
    return end;
  };

  const runAgent = (which: 1 | 2, t0: number) => {
    const target: LogTarget = which === 1 ? 'a1' : 'a2';
    const setStatus = which === 1 ? setS1 : setS2;
    setLines((prev) => ({ ...prev, [target]: [] }));
    setStatus('working');
    const script = AGENT_SCRIPT[which];
    script.forEach((step, i) => {
      at(t0 + step.at, () => {
        push(target, step);
        if (i === script.length - 1) setStatus('done');
      });
    });
  };

  const finish = () => {
    stopAll();
    const f = finishedState();
    setName(f.name);
    setCmd('');
    setBooted(true);
    setS1(f.s1);
    setS2(f.s2);
    setFocus(0);
    setLines({ log: f.log, a1: f.a1, a2: f.a2 });
  };

  const boot = () => {
    stopAll();
    setLines({ log: [], a1: [], a2: [] });
    setS1('idle');
    setS2('idle');
    setCmd('');
    setName('');
    setBooted(false);
    setFocus(0);
    const t = typeCmd('whoami', 500, () => {
      push('log', { kind: 'cmd', text: '$ whoami' });
      scramble();
    });
    typeCmd('hq dispatch --team portfolio', t + 1500, () => {
      push('log', { kind: 'cmd', text: '$ hq dispatch --team portfolio' });
      push('log', { kind: 'out', text: 'dispatched 2 agents, 2 worktrees' });
      runAgent(1, 300);
      runAgent(2, 500);
      at(3100, () => {
        push('log', { kind: 'ok', text: 'both agents reported. your turn: type help' });
        setBooted(true);
      });
    });
  };

  const run = (raw: string) => {
    const result = runCommand(raw);
    if (!result) return;
    if (!booted) finish();
    setCmd('');
    for (const e of result.effects) {
      if (e.type === 'clear') setLines((prev) => ({ ...prev, log: [] }));
      if (e.type === 'replay') return boot();
    }
    result.lines.forEach((l) => push('log', l));
    for (const e of result.effects) {
      if (e.type === 'scramble') scramble();
      if (e.type === 'dispatch') {
        setFocus(e.agent);
        runAgent(e.agent, 300);
      }
    }
  };

  useEffect(() => {
    reduce.current = prefersReducedMotion();
    let seen = false;
    try {
      seen = sessionStorage.getItem(INTRO_KEY) === '1';
      sessionStorage.setItem(INTRO_KEY, '1');
    } catch {
      /* storage unavailable: play the intro */
    }
    if (!reduce.current && !seen) boot();
    delete document.documentElement.dataset.intro;
    return () => {
      stopAll();
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = frameRef.current;
    if (!el || reduce.current) return;
    const r = el.getBoundingClientRect();
    pointer.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      el.style.setProperty('--mx', Math.round(pointer.current.x) + 'px');
      el.style.setProperty('--my', Math.round(pointer.current.y) + 'px');
    });
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      run(cmd);
    }
  };

  const n1 = name.slice(0, 5);
  const n2 = name.slice(6);

  return (
    <section id="top" className="section hero">
      <div className="hero-frame" ref={frameRef} onMouseMove={onMove}>
        <div className="hero-dots" aria-hidden="true" />

        <div className="hero-bar">
          <span>hq · session: portfolio</span>
          <div className="hero-bar-right">
            <span className="hero-panes">
              <span className="dot live" aria-hidden="true" />3 panes
            </span>
            {booted ? (
              <button className="chip chip-ghost" onClick={boot}>
                replay intro
              </button>
            ) : (
              <button className="chip chip-ghost" onClick={finish}>
                skip intro
              </button>
            )}
          </div>
        </div>

        <div className="hero-panes-row">
          <div className={'pane pane-lead' + (focus === 0 ? ' is-focus' : '')}>
            <PaneLabel index={0} label="lead" focus={focus} setFocus={setFocus} />
            <h1 className="hero-name" aria-label={site.name} onMouseEnter={() => booted && !scrambleIv.current && scramble()}>
              <span aria-hidden="true">{n1 || ' '}</span>
              <span aria-hidden="true" className="accent">
                {n2 || ' '}
              </span>
            </h1>
            <p className="hero-tagline">{site.tagline}</p>

            <div className="hero-log intro-hide" aria-live="polite">
              {lines.log.map((l) => (
                <LogLine key={l.id} line={l} />
              ))}
            </div>

            <div className="prompt">
              <label htmlFor="cmdin" className="prompt-sigil">
                $
              </label>
              <input
                id="cmdin"
                className="prompt-input"
                type="text"
                value={cmd}
                onChange={(e) => setCmd(e.target.value)}
                onKeyDown={onKey}
                onFocus={() => setFocus(0)}
                maxLength={60}
                autoComplete="off"
                spellCheck={false}
                aria-label="Type a command and press Enter"
                placeholder="type help and press enter"
              />
              <button className="prompt-run" onClick={() => run(cmd || 'help')} aria-label="Run command">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 5v8H6" />
                  <path d="M10 9l-4 4 4 4" />
                </svg>
              </button>
            </div>
            <div className="hero-chips">
              {chips.map((c) => (
                <button key={c} className="chip" onClick={() => run(c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="hero-agents">
            <AgentPane index={1} label="agent/projects" status={s1} lines={lines.a1} focus={focus} setFocus={setFocus} />
            <AgentPane index={2} label="agent/experience" status={s2} lines={lines.a2} focus={focus} setFocus={setFocus} />
          </div>
        </div>
      </div>
    </section>
  );
}

function PaneLabel({ index, label, focus, setFocus }: { index: number; label: string; focus: number; setFocus: (i: number) => void }) {
  return (
    <button className="pane-label" aria-pressed={focus === index} onClick={() => setFocus(index)}>
      [{index}] {label}
    </button>
  );
}

function AgentPane(props: { index: 1 | 2; label: string; status: Status; lines: Line[]; focus: number; setFocus: (i: number) => void }) {
  const { index, label, status, lines, focus, setFocus } = props;
  return (
    <div className={'pane pane-agent' + (focus === index ? ' is-focus' : '')}>
      <div className="pane-head">
        <PaneLabel index={index} label={label} focus={focus} setFocus={setFocus} />
        <span className="pane-status">
          <span className={'dot status-' + status + (status === 'working' ? ' live' : '')} aria-hidden="true" />
          {status}
        </span>
      </div>
      <div className="pane-lines intro-hide" aria-live="polite">
        {lines.map((l) => (
          <LogLine key={l.id} line={l} />
        ))}
      </div>
    </div>
  );
}

function LogLine({ line }: { line: Line }) {
  return (
    <div className={'ln ln-' + line.kind}>
      {line.text}
      {line.href ? (
        <>
          {' '}
          <a href={line.href}>{line.linkText}</a>
        </>
      ) : null}
    </div>
  );
}
