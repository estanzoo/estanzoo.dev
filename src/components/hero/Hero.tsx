// Hero container (owner decision 3): owns the boot intro, the name scramble, typed commands
// (runCommand from src/terminal.ts), pane focus, the sessionStorage intro-seen flag, the
// removal of the pre-hydration <html data-intro> guard and the pointer spotlight. It builds
// the HeroVm from its state and content.ts in heroVm() and hands it to the logic-free
// HeroView; every decision about what the section shows is made here.
//
// Only App.tsx and containers import src/content.ts.
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { jobs, projects, site, werChart } from '../../content';
import { runCommand, type LineSpec } from '../../terminal';
import { HeroView } from './HeroView';
import type { AgentLineVm, HeroVm, LeadLineVm, StatusVm } from './heroVm';

type Status = StatusVm['kind'];
type PaneIndex = 0 | 1 | 2;
/** A line before it gets its React key. */
type Spec<L> = L extends unknown ? Omit<L, 'id'> : never;

/** Everything the section shows; heroVm() turns it into the display-ready VM. */
export type HeroState = {
  /** The name as shown right now: empty before the intro's whoami, scrambled mid-scramble. */
  name: string;
  cmd: string;
  /** False while the intro plays. */
  booted: boolean;
  focus: PaneIndex;
  s1: Status;
  s2: Status;
  log: LeadLineVm[];
  a1: AgentLineVm[];
  a2: AgentLineVm[];
};

type Lines = Pick<HeroState, 'log' | 'a1' | 'a2'>;

const INTRO_KEY = 'intro-seen';
const SCRAMBLE_CHARS = '01<>/_#$%=+*';
const MAX_LINES: Record<keyof Lines, number> = { log: 6, a1: 5, a2: 5 };
const CHIPS = ['help', 'projects', 'experience', 'stack', 'contact'];

const projectNames = projects.map((p) => p.name).join(', ');
const orgNames = jobs.map((j) => j.org.split(',')[0].replace(/ Inc\.$/, '')).join(', ');

const AGENT_SCRIPT: Record<1 | 2, { at: number; line: Spec<AgentLineVm> }[]> = {
  1: [
    { at: 0, line: { kind: 'dim', text: '← lead: what has he shipped?' } },
    { at: 600, line: { kind: 'dim', text: 'reading github.com/estanzoo' } },
    { at: 1400, line: { kind: 'out', text: '→ lead: ' + projectNames } },
    { at: 2000, line: { kind: 'ok', text: `done · ${projects.length} projects`, link: { href: '#projects', label: 'open ↓' } } },
  ],
  2: [
    { at: 0, line: { kind: 'dim', text: '← lead: where has he worked?' } },
    { at: 900, line: { kind: 'out', text: '→ lead: ' + orgNames } },
    { at: 1600, line: { kind: 'out', text: `→ agent/projects: mention the ${werChart.reduction}% WER drop` } },
    { at: 2300, line: { kind: 'ok', text: `done · ${jobs.length} roles`, link: { href: '#experience', label: 'open ↓' } } },
  ],
};

const BOOT_LINES = {
  whoami: { kind: 'cmd', text: '$ whoami' },
  dispatch: { kind: 'cmd', text: '$ hq dispatch --team portfolio' },
  dispatched: { kind: 'out', text: 'dispatched 2 agents, 2 worktrees' },
  reported: { kind: 'ok', text: 'both agents reported. your turn: type help' },
} satisfies Record<string, Spec<LeadLineVm>>;

let seq = 0;
const nextId = () => 'l' + ++seq;
// Deterministic ids for the finished state so server and client markup match.
const fixed = <L,>(prefix: string, specs: Spec<L>[]): L[] => specs.map((s, i) => ({ ...s, id: prefix + i }) as L);

/** The terminal after the intro: what the server renders and a return visit shows. */
export function finishedState(): HeroState {
  return {
    name: site.name,
    cmd: '',
    booted: true,
    focus: 0,
    s1: 'done',
    s2: 'done',
    log: fixed<LeadLineVm>('fl', [BOOT_LINES.whoami, BOOT_LINES.dispatch, BOOT_LINES.dispatched, BOOT_LINES.reported]),
    a1: fixed<AgentLineVm>('fa', AGENT_SCRIPT[1].filter((_, i) => i !== 1).map((s) => s.line)),
    a2: fixed<AgentLineVm>('fb', AGENT_SCRIPT[2].map((s) => s.line)),
  };
}

/** A runCommand output line as a lead log line; a line with an href ends in a link. */
export function leadLine(spec: LineSpec, id: string): LeadLineVm {
  switch (spec.kind) {
    case 'out':
    case 'ok':
      return spec.href
        ? { kind: spec.kind, id, text: spec.text, link: { href: spec.href, label: spec.linkText ?? '' } }
        : { kind: spec.kind, id, text: spec.text };
    case 'cmd':
    case 'err':
      return { kind: spec.kind, id, text: spec.text };
    case 'dim':
      throw new Error('the lead log has no dim lines: runCommand never prints one');
  }
}

const pane = (base: string, index: PaneIndex, focus: PaneIndex) => ({
  className: base + (focus === index ? ' is-focus' : ''),
  pressed: focus === index,
});

/** The section's VM for one state. */
export function heroVm(s: HeroState): HeroVm {
  // Split on the space in the real name; the scramble keeps spaces in place.
  const split = site.name.indexOf(' ');
  const first = split < 0 ? s.name : s.name.slice(0, split);
  const last = split < 0 ? '' : s.name.slice(split + 1);
  return {
    bar: { panes: '3 panes', intro: s.booted ? { kind: 'replay', label: 'replay intro' } : { kind: 'skip', label: 'skip intro' } },
    lead: {
      index: 0,
      label: '[0] lead',
      ...pane('pane pane-lead', 0, s.focus),
      name: { label: site.name, first: first || ' ', last: last || ' ' },
      tagline: site.tagline,
      log: s.log,
    },
    prompt: s.cmd,
    chips: CHIPS,
    agents: [
      { index: 1, label: '[1] agent/projects', ...pane('pane pane-agent', 1, s.focus), status: { kind: s.s1, label: s.s1 }, lines: s.a1 },
      { index: 2, label: '[2] agent/experience', ...pane('pane pane-agent', 2, s.focus), status: { kind: s.s2, label: s.s2 }, lines: s.a2 },
    ],
  };
}

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
  const [focus, setFocus] = useState<PaneIndex>(0);
  const [s1, setS1] = useState<Status>(init.s1);
  const [s2, setS2] = useState<Status>(init.s2);
  const [lines, setLines] = useState<Lines>({ log: init.log, a1: init.a1, a2: init.a2 });
  // Flips true in the same batch as the intro's first state reset, so the
  // pre-hydration guard (<html data-intro>) is only lifted once the empty
  // boot state has committed and the finished SSR markup never flashes.
  const [mounted, setMounted] = useState(false);

  const timers = useRef<number[]>([]);
  const scrambleIv = useRef<number | null>(null);
  const reduce = useRef(false);
  // True while the boot sequence is running; survives StrictMode's simulated
  // unmount/remount so an interrupted intro is restarted rather than stalled.
  const playing = useRef(false);
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

  const push = <T extends keyof Lines>(target: T, line: Lines[T][number]) => {
    setLines((prev) => ({ ...prev, [target]: [...prev[target], line].slice(-MAX_LINES[target]) }));
  };
  const pushLead = (spec: Spec<LeadLineVm>) => push('log', { ...spec, id: nextId() } as LeadLineVm);

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
    const target = which === 1 ? 'a1' : 'a2';
    const setStatus = which === 1 ? setS1 : setS2;
    setLines((prev) => ({ ...prev, [target]: [] }));
    setStatus('working');
    const script = AGENT_SCRIPT[which];
    script.forEach((step, i) => {
      at(t0 + step.at, () => {
        push(target, { ...step.line, id: nextId() } as AgentLineVm);
        if (i === script.length - 1) setStatus('done');
      });
    });
  };

  const finish = () => {
    stopAll();
    playing.current = false;
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
    playing.current = true;
    setLines({ log: [], a1: [], a2: [] });
    setS1('idle');
    setS2('idle');
    setCmd('');
    setName('');
    setBooted(false);
    setFocus(0);
    const t = typeCmd('whoami', 500, () => {
      pushLead(BOOT_LINES.whoami);
      scramble();
    });
    typeCmd('hq dispatch --team portfolio', t + 1500, () => {
      pushLead(BOOT_LINES.dispatch);
      pushLead(BOOT_LINES.dispatched);
      runAgent(1, 300);
      runAgent(2, 500);
      at(3100, () => {
        pushLead(BOOT_LINES.reported);
        setBooted(true);
        playing.current = false;
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
    result.lines.forEach((l) => push('log', leadLine(l, nextId())));
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
    if (!reduce.current && (!seen || playing.current)) boot();
    setMounted(true);
    return () => {
      stopAll();
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mounted) delete document.documentElement.dataset.intro;
  }, [mounted]);

  const onFrameMove = (e: MouseEvent<HTMLDivElement>) => {
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

  const onPromptKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      run(cmd);
    }
  };

  const vm = heroVm({ name, cmd, booted, focus, s1, s2, ...lines });

  return (
    <HeroView
      vm={vm}
      frameRef={frameRef}
      onFrameMove={onFrameMove}
      onIntro={booted ? boot : finish}
      onFocusPane={setFocus}
      onNameEnter={() => booted && !scrambleIv.current && scramble()}
      onPromptChange={setCmd}
      onPromptKeyDown={onPromptKeyDown}
      onPromptFocus={() => setFocus(0)}
      onRun={() => run(cmd || 'help')}
      onChip={run}
    />
  );
}
