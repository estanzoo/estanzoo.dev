// HeroView: the logic-free View of the Hero terminal (owner decision 3; the rules are the
// ones in contact/ContactView.tsx). Props are the VM (heroVm.ts), event callbacks and the
// ref of the spotlight frame. The body reads properties, maps arrays and branches only
// through <Render> (intro button, agent status, line kinds) and <Optional> (a line's
// link). Every decision - what the panes show, which pane has focus, what a key or a click
// does - lives in the container (Hero.tsx). A missing callback falls back to `ignore`, so
// the screen renderer can draw a mock with the VM alone.
import type { ChangeEvent, KeyboardEvent, MouseEvent, Ref } from 'react';
import type { Views } from '../../vm/primitives';
import { Optional, Render } from '../../vm/primitives';
import type { AgentLineVm, AgentVm, HeroVm, IntroVm, LeadLineVm, LinkVm, StatusVm } from './heroVm';
import './Hero.css';

type PaneIndex = 0 | 1 | 2;

export type HeroViewProps = {
  vm: HeroVm;
  /** The spotlight frame; the container moves the spotlight through it. */
  frameRef?: Ref<HTMLDivElement>;
  onFrameMove?: (e: MouseEvent<HTMLDivElement>) => void;
  /** The window bar button: skip or replay, as the VM's intro variant says. */
  onIntro?: () => void;
  onFocusPane?: (index: PaneIndex) => void;
  onNameEnter?: () => void;
  onPromptChange?: (value: string) => void;
  onPromptKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  onPromptFocus?: () => void;
  onRun?: () => void;
  onChip?: (command: string) => void;
};

const ignore = () => {};

function IntroLabel({ vm }: { vm: IntroVm }) {
  return <>{vm.label}</>;
}

const introViews: Views<IntroVm> = { skip: IntroLabel, replay: IntroLabel };

/** A status badge: its dot class (a working agent's dot pulses) and the VM's label. */
const statusBadge = (dotClass: string) =>
  function StatusBadge({ vm }: { vm: StatusVm }) {
    return (
      <>
        <span className={dotClass} aria-hidden="true" />
        {vm.label}
      </>
    );
  };

const statusViews: Views<StatusVm> = {
  idle: statusBadge('dot status-idle'),
  working: statusBadge('dot status-working live'),
  done: statusBadge('dot status-done'),
};

/** A terminal line of one kind; a present link is drawn after the text. */
const line = (className: string) =>
  function Line({ vm }: { vm: { text: string; link?: LinkVm } }) {
    return (
      <div className={className}>
        {vm.text}
        <Optional value={vm.link}>
          {(link) => (
            <>
              {' '}
              <a href={link.href}>{link.label}</a>
            </>
          )}
        </Optional>
      </div>
    );
  };

const leadLineViews: Views<LeadLineVm> = {
  cmd: line('ln ln-cmd'),
  out: line('ln ln-out'),
  ok: line('ln ln-ok'),
  err: line('ln ln-err'),
};

const agentLineViews: Views<AgentLineVm> = {
  dim: line('ln ln-dim'),
  out: line('ln ln-out'),
  ok: line('ln ln-ok'),
};

function PaneLabel({ vm, onFocusPane }: { vm: { index: PaneIndex; label: string; pressed: boolean }; onFocusPane: (i: PaneIndex) => void }) {
  return (
    <button className="pane-label" aria-pressed={vm.pressed} onClick={() => onFocusPane(vm.index)}>
      {vm.label}
    </button>
  );
}

function AgentPane({ vm, onFocusPane }: { vm: AgentVm; onFocusPane: (i: PaneIndex) => void }) {
  return (
    <div className={vm.className}>
      <div className="pane-head">
        <PaneLabel vm={vm} onFocusPane={onFocusPane} />
        <span className="pane-status">
          <Render vm={vm.status} views={statusViews} />
        </span>
      </div>
      <div className="pane-lines intro-hide" aria-live="polite">
        {vm.lines.map((l) => (
          <Render key={l.id} vm={l} views={agentLineViews} />
        ))}
      </div>
    </div>
  );
}

export function HeroView({
  vm,
  frameRef,
  onFrameMove = ignore,
  onIntro = ignore,
  onFocusPane = ignore,
  onNameEnter = ignore,
  onPromptChange = ignore,
  onPromptKeyDown = ignore,
  onPromptFocus = ignore,
  onRun = ignore,
  onChip = ignore,
}: HeroViewProps) {
  const onChange = (e: ChangeEvent<HTMLInputElement>) => onPromptChange(e.target.value);
  return (
    <section id="top" className="section hero">
      <div className="hero-frame" ref={frameRef} onMouseMove={onFrameMove}>
        <div className="hero-dots" aria-hidden="true" />

        <div className="hero-bar">
          <span>hq · session: portfolio</span>
          <div className="hero-bar-right">
            <span className="hero-panes">
              <span className="dot live" aria-hidden="true" />
              {vm.bar.panes}
            </span>
            <button className="chip chip-ghost" onClick={onIntro}>
              <Render vm={vm.bar.intro} views={introViews} />
            </button>
          </div>
        </div>

        <div className="hero-panes-row">
          <div className={vm.lead.className}>
            <PaneLabel vm={vm.lead} onFocusPane={onFocusPane} />
            <h1 className="hero-name" aria-label={vm.lead.name.label} onMouseEnter={onNameEnter}>
              <span aria-hidden="true">{vm.lead.name.first}</span>
              <span aria-hidden="true" className="accent">
                {vm.lead.name.last}
              </span>
            </h1>
            <p className="hero-tagline">{vm.lead.tagline}</p>

            <div className="hero-log intro-hide" aria-live="polite">
              {vm.lead.log.map((l) => (
                <Render key={l.id} vm={l} views={leadLineViews} />
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
                value={vm.prompt}
                onChange={onChange}
                onKeyDown={onPromptKeyDown}
                onFocus={onPromptFocus}
                maxLength={60}
                autoComplete="off"
                spellCheck={false}
                aria-label="Type a command and press Enter"
                placeholder="type help and press enter"
              />
              <button className="prompt-run" onClick={onRun} aria-label="Run command">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 5v8H6" />
                  <path d="M10 9l-4 4 4 4" />
                </svg>
              </button>
            </div>
            <div className="hero-chips">
              {vm.chips.map((c) => (
                <button key={c} className="chip" onClick={() => onChip(c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="hero-agents">
            {vm.agents.map((agent) => (
              <AgentPane key={agent.index} vm={agent} onFocusPane={onFocusPane} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
