// About view model (owner decision 3, the pattern of contact/contactVm.ts).
//
// Display-ready values only. The lead paragraph comes in three parts so the View can draw
// the organisation as a link inside the sentence. The links row is a list of items on
// 'kind': a link or the separator text between two links, so the View never decides where
// a separator goes. The About section has one visual state. The View draws a VM; the
// container (About.tsx) builds it; mocks (mocks/about/*.json) hold one VM per visual state
// under 'vm' and must parse with this schema. Every object is strict: an unknown field is
// an error.
import { z } from 'zod';

export type Link = { href: string; label: string };

/** One fact row of the list: a term and its value. */
export type Fact = { label: string; value: string };

/** One item of the links row. */
export type LinksItemVm = { kind: 'link'; href: string; label: string } | { kind: 'separator'; text: string };

export type AboutVm = {
  /** The section label, e.g. '# about'. */
  label: string;
  /** The lead sentence: text before the linked organisation, the link, text after it. */
  lead: { before: string; org: Link; after: string };
  body: string;
  /** The fact rows above the links row, in order. */
  facts: Fact[];
  /** The last fact row: its term and the links with their separators, in order. */
  links: { label: string; items: LinksItemVm[] };
};

const linkSchema = z.strictObject({ href: z.string(), label: z.string() });

const linksItemSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('link'), href: z.string(), label: z.string() }),
  z.strictObject({ kind: z.literal('separator'), text: z.string() }),
]);

export const aboutVmSchema: z.ZodType<AboutVm> = z.strictObject({
  label: z.string(),
  lead: z.strictObject({ before: z.string(), org: linkSchema, after: z.string() }),
  body: z.string(),
  facts: z.array(z.strictObject({ label: z.string(), value: z.string() })),
  links: z.strictObject({ label: z.string(), items: z.array(linksItemSchema) }),
});
