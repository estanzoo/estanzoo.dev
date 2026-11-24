// Projects view model (owner decision 3), on the pattern of the Contact pilot
// (src/components/contact/contactVm.ts).
//
// Display-ready values only: every string is the final text, every href the final URL.
// Slots that look different are unions on 'kind': a card's details (open, closed) and its
// link (link, placeholder). The container (Projects.tsx) makes every decision - which filter
// is pressed, which cards are dimmed, which card is open - and writes the result here; the
// View (ProjectsView.tsx) only draws. Mocks (mocks/projects/*.json) hold one VM per visual
// state under 'vm' and must parse with this schema.
//
// The TypeScript types are written out for readers; the schema is annotated with them so
// the two cannot drift. Every object is strict: an unknown field is an error.
import { z } from 'zod';

export type Link = { href: string; label: string };

/** One filter chip. `pressed` is the chip's aria-pressed value. */
export type FilterChipVm = { id: string; label: string; pressed: boolean };

/**
 * A card's details panel and the toggle below it. `toggleLabel` is the toggle's visible
 * text in that state, `expanded` its aria-expanded value, and `dataOpen` the panel's
 * data-open attribute value (null leaves the attribute out). Both variants carry the same
 * fields, so the View reads them as plain properties and keeps one panel element across
 * states: its open/close CSS transition needs the element to stay mounted.
 */
export type DetailsVm =
  | { kind: 'open'; toggleLabel: string; expanded: true; dataOpen: '' }
  | { kind: 'closed'; toggleLabel: string; expanded: false; dataOpen: null };

/** The link at the foot of a card, or the muted placeholder when the project has none. */
export type ProjectLinkVm =
  | { kind: 'link'; href: string; label: string }
  | { kind: 'placeholder'; label: string };

export type ProjectCardVm = {
  /** The project id the toggle reports back to the container. */
  id: string;
  name: string;
  date: string;
  desc: string;
  tags: string;
  /**
   * Present, as the empty data-dim attribute value, when the active filter excludes this
   * card. Absent when the card matches.
   */
  dim?: '';
  /** The id of the details panel, which the toggle names in aria-controls. */
  detailsId: string;
  points: string[];
  details: DetailsVm;
  /** The screen-reader-only words after the toggle label, e.g. 'about hq'. */
  toggleContext: string;
  link: ProjectLinkVm;
};

export type ProjectsVm = {
  heading: string;
  /** The aria-label of the filter chip group. */
  filterGroupLabel: string;
  filters: FilterChipVm[];
  cards: ProjectCardVm[];
  /** The also-on-github row: its lead-in, the listed repos, then the all-repositories link. */
  more: { label: string; repos: Link[]; all: Link };
};

const linkSchema = z.strictObject({ href: z.string(), label: z.string() });

const detailsVmSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('open'), toggleLabel: z.string(), expanded: z.literal(true), dataOpen: z.literal('') }),
  z.strictObject({ kind: z.literal('closed'), toggleLabel: z.string(), expanded: z.literal(false), dataOpen: z.null() }),
]);

const projectLinkVmSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('link'), href: z.string(), label: z.string() }),
  z.strictObject({ kind: z.literal('placeholder'), label: z.string() }),
]);

const projectCardVmSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  date: z.string(),
  desc: z.string(),
  tags: z.string(),
  dim: z.literal('').optional(),
  detailsId: z.string(),
  points: z.array(z.string()),
  details: detailsVmSchema,
  toggleContext: z.string(),
  link: projectLinkVmSchema,
});

export const projectsVmSchema: z.ZodType<ProjectsVm> = z.strictObject({
  heading: z.string(),
  filterGroupLabel: z.string(),
  filters: z.array(z.strictObject({ id: z.string(), label: z.string(), pressed: z.boolean() })),
  cards: z.array(projectCardVmSchema),
  more: z.strictObject({ label: z.string(), repos: z.array(linkSchema), all: linkSchema }),
});
