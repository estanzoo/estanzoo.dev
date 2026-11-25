// Interests view model (owner decision 3; the pattern of src/components/contact/contactVm.ts).
//
// Display-ready values only: every string is the final text, every colour a value the
// stylesheet already draws (the design's rev colours), every light the name of a keyframes
// rule in Interests.css. The film strip and the fashion swatches are fixed markup, so those
// two cards carry only their text. The section has one visual state. The container
// (Interests.tsx) builds the VM; mocks (mocks/interests/*.json) hold it under 'vm'.
//
// Every object is strict: an unknown field is an error.
import { z } from 'zod';

/** The text of one interest card. */
export type CardVm = { kicker: string; title: string; body: string };

/** The rev bar's colours: green, amber, red. */
export const REV_COLOURS = ['#7EE787', '#FFB454', '#FF5A4D'] as const;
export type RevColour = (typeof REV_COLOURS)[number];

/** The keyframes of the five start lights (Interests.css). */
export const LIGHT_ANIMATIONS = ['f1', 'f2', 'f3', 'f4', 'f5'] as const;
export type LightAnimation = (typeof LIGHT_ANIMATIONS)[number];

export type InterestsVm = {
  intro: string;
  f1: {
    card: CardVm;
    /** The start lights, left to right. */
    lights: { animation: LightAnimation }[];
    /** The rev bar segments, left to right; delay is a CSS time, e.g. '0.09s'. */
    revs: { colour: RevColour; delay: string }[];
  };
  /** The film strip is fixed markup; only the card text varies. */
  films: { card: CardVm };
  /** The swatch rail is fixed markup; only the card text varies. */
  fashion: { card: CardVm };
};

const cardSchema = z.strictObject({ kicker: z.string(), title: z.string(), body: z.string() });

export const interestsVmSchema: z.ZodType<InterestsVm> = z.strictObject({
  intro: z.string(),
  f1: z.strictObject({
    card: cardSchema,
    lights: z.array(z.strictObject({ animation: z.enum(LIGHT_ANIMATIONS) })),
    revs: z.array(z.strictObject({ colour: z.enum(REV_COLOURS), delay: z.string() })),
  }),
  films: z.strictObject({ card: cardSchema }),
  fashion: z.strictObject({ card: cardSchema }),
});
