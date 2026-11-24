import { site, stack } from './content';

export type LineKind = 'cmd' | 'dim' | 'out' | 'ok' | 'err';

export interface LineSpec {
  kind: LineKind;
  text: string;
  href?: string;
  linkText?: string;
}

export type Effect =
  | { type: 'clear' }
  | { type: 'replay' }
  | { type: 'scramble' }
  | { type: 'dispatch'; agent: 1 | 2 };

export interface CommandResult {
  lines: LineSpec[];
  effects: Effect[];
}

export const COMMANDS = ['whoami', 'projects', 'experience', 'interests', 'stack', 'contact', 'clear', 'replay'];

/** Pure command handler for the hero terminal. Returns null for empty input. */
export function runCommand(raw: string): CommandResult | null {
  const text = String(raw ?? '').trim();
  const c = text.toLowerCase();
  if (!c) return null;

  if (c === 'clear') return { lines: [], effects: [{ type: 'clear' }] };
  if (c === 'replay') return { lines: [], effects: [{ type: 'replay' }] };

  const lines: LineSpec[] = [{ kind: 'cmd', text: '$ ' + text }];
  const effects: Effect[] = [];
  const mail = 'mailto:' + site.email;

  if (c === 'help') {
    lines.push({ kind: 'out', text: COMMANDS.join(' · ') });
  } else if (c === 'whoami') {
    effects.push({ type: 'scramble' });
    lines.push({ kind: 'out', text: 'ethan zhu · software engineering, uwaterloo ’29' });
  } else if (c === 'projects') {
    lines.push({ kind: 'out', text: '→ agent/projects: report' });
    effects.push({ type: 'dispatch', agent: 1 });
  } else if (c === 'experience') {
    lines.push({ kind: 'out', text: '→ agent/experience: report' });
    effects.push({ type: 'dispatch', agent: 2 });
  } else if (c === 'stack') {
    lines.push({ kind: 'out', text: stack.map((s) => s.toLowerCase()).join(' · ') });
  } else if (c === 'interests') {
    lines.push({ kind: 'out', text: 'f1 + sim racing · films · speed cubing', href: '#interests', linkText: 'open ↓' });
  } else if (c === 'contact') {
    lines.push({ kind: 'out', text: 'mail:', href: mail, linkText: site.email });
  } else if (c.startsWith('sudo')) {
    lines.push({ kind: 'ok', text: 'permission granted.', href: mail, linkText: 'hire ethan →' });
  } else {
    lines.push({ kind: 'err', text: 'command not found: ' + text.slice(0, 24) + ' · try help' });
  }
  return { lines, effects };
}
