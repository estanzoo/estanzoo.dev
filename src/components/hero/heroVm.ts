// Hero view model (owner decision 3; the pattern of contact/contactVm.ts).
//
// Display-ready values only: every string is the final text, every class list and
// aria-pressed value is final. Slots that look different are unions on 'kind': the intro
// button (skip while the intro plays, replay after), each agent's status (idle, working,
// done) and each terminal line. The lead log and the agent panes print different lines, so
// each has its own union: the lead echoes commands (cmd) and prints their output (out, ok,
// err; out and ok may end in a link), an agent prints its script (dim, out, and an ok
// report that always links to its section). The View (HeroView.tsx) draws a VM; the
// container (Hero.tsx) builds it; mocks (mocks/hero/*.json) hold one VM per visual state
// and must parse with this schema.
//
// The TypeScript types are written out for readers; the schema is annotated with them so
// the two cannot drift. Every object is strict: an unknown field is an error.
import { z } from 'zod';

export type LinkVm = { href: string; label: string };

/** A line of the lead log. `id` is the React key; `link` is drawn after the text. */
export type LeadLineVm =
  | { kind: 'cmd'; id: string; text: string }
  | { kind: 'out'; id: string; text: string; link?: LinkVm }
  | { kind: 'ok'; id: string; text: string; link?: LinkVm }
  | { kind: 'err'; id: string; text: string };

/** A line of an agent pane. `id` is the React key; `link` is drawn after the text. */
export type AgentLineVm =
  | { kind: 'dim'; id: string; text: string }
  | { kind: 'out'; id: string; text: string }
  | { kind: 'ok'; id: string; text: string; link: LinkVm };

/** The window bar button: skip while the intro plays, replay once it has finished. */
export type IntroVm = { kind: 'skip'; label: string } | { kind: 'replay'; label: string };

/** An agent's status badge; the label is the badge text. */
export type StatusVm =
  | { kind: 'idle'; label: string }
  | { kind: 'working'; label: string }
  | { kind: 'done'; label: string };

/**
 * What every pane shares: the label button's text, the pane's class list (with is-focus
 * when focused) and the label's aria-pressed value. Each pane adds its index, which the
 * View hands back to onFocusPane.
 */
type PaneVm = { label: string; className: string; pressed: boolean };

/** The name as drawn: the accessible full name and the two visible lines (mid-scramble too). */
export type NameVm = { label: string; first: string; last: string };

export type LeadVm = PaneVm & { index: 0; name: NameVm; tagline: string; log: LeadLineVm[] };

export type AgentVm = PaneVm & { index: 1 | 2; status: StatusVm; lines: AgentLineVm[] };

export type HeroVm = {
  bar: { panes: string; intro: IntroVm };
  lead: LeadVm;
  /** The current text of the command input. */
  prompt: string;
  /** The command chips under the prompt, in order; a click runs that command. */
  chips: string[];
  agents: AgentVm[];
};

const linkSchema = z.strictObject({ href: z.string(), label: z.string() });

const line = <K extends string>(kind: K) => ({ kind: z.literal(kind), id: z.string(), text: z.string() });

const leadLineSchema = z.discriminatedUnion('kind', [
  z.strictObject(line('cmd')),
  z.strictObject({ ...line('out'), link: linkSchema.optional() }),
  z.strictObject({ ...line('ok'), link: linkSchema.optional() }),
  z.strictObject(line('err')),
]);

const agentLineSchema = z.discriminatedUnion('kind', [
  z.strictObject(line('dim')),
  z.strictObject(line('out')),
  z.strictObject({ ...line('ok'), link: linkSchema }),
]);

const introSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('skip'), label: z.string() }),
  z.strictObject({ kind: z.literal('replay'), label: z.string() }),
]);

const statusSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('idle'), label: z.string() }),
  z.strictObject({ kind: z.literal('working'), label: z.string() }),
  z.strictObject({ kind: z.literal('done'), label: z.string() }),
]);

const pane = { label: z.string(), className: z.string(), pressed: z.boolean() };

export const heroVmSchema: z.ZodType<HeroVm> = z.strictObject({
  bar: z.strictObject({ panes: z.string(), intro: introSchema }),
  lead: z.strictObject({
    ...pane,
    index: z.literal(0),
    name: z.strictObject({ label: z.string(), first: z.string(), last: z.string() }),
    tagline: z.string(),
    log: z.array(leadLineSchema),
  }),
  prompt: z.string(),
  chips: z.array(z.string()),
  agents: z.array(z.strictObject({ ...pane, index: z.literal([1, 2]), status: statusSchema, lines: z.array(agentLineSchema) })),
});
