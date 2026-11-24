// Header view model (owner decision 3, the pattern of contact/contactVm.ts).
//
// Display-ready values only: the handle link at the top left and the section nav, in page
// order, each with its final href and text. The Header has no varying slot: one visual
// state. The View draws a VM; the container (Header.tsx) builds it; mocks
// (mocks/header/*.json) hold one VM per visual state under 'vm' and must parse with this
// schema. Every object is strict: an unknown field is an error.
import { z } from 'zod';

export type Link = { href: string; label: string };

export type HeaderVm = {
  /** The site handle, linking back to the top of the page. */
  handle: Link;
  /** The accessible name of the nav landmark. */
  navLabel: string;
  /** One link per section, in page order. */
  nav: Link[];
};

const linkSchema = z.strictObject({ href: z.string(), label: z.string() });

export const headerVmSchema: z.ZodType<HeaderVm> = z.strictObject({
  handle: linkSchema,
  navLabel: z.string(),
  nav: z.array(linkSchema),
});
