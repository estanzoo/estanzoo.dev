// Contact view model: the pilot of the View + container pattern (owner decision 3).
//
// A view model holds display-ready values only: every string is the final text, every
// href the final URL. A slot that can look different is a union on 'kind' (here the copy
// button: idle, copied, blocked), each variant carrying its own display values. The View
// draws a VM; the container (Contact.tsx) builds it; mocks (mocks/contact/*.json) hold one
// VM per visual state under 'vm' and must parse with this schema.
//
// The TypeScript types are written out for readers; the schema is annotated with them so
// the two cannot drift. Every object is strict: an unknown field is an error.
import { z } from 'zod';

export type Link = { href: string; label: string };

/** The copy-email button. The label is the button's text in that state. */
export type CopyVm =
  | { kind: 'idle'; label: string }
  | { kind: 'copied'; label: string }
  | { kind: 'blocked'; label: string };

export type ContactVm = {
  /** The terminal line above the heading, without the `$` sigil (the View draws it). */
  prompt: string;
  heading: string;
  mail: Link;
  copy: CopyVm;
  /** The chip links after the copy button, in order. */
  links: Link[];
  /** The footer line, e.g. '© 2026 Ethan Zhu'. */
  footer: string;
};

const linkSchema = z.strictObject({ href: z.string(), label: z.string() });

const copyVmSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('idle'), label: z.string() }),
  z.strictObject({ kind: z.literal('copied'), label: z.string() }),
  z.strictObject({ kind: z.literal('blocked'), label: z.string() }),
]);

export const contactVmSchema: z.ZodType<ContactVm> = z.strictObject({
  prompt: z.string(),
  heading: z.string(),
  mail: linkSchema,
  copy: copyVmSchema,
  links: z.array(linkSchema),
  footer: z.string(),
});
