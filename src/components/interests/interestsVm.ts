// Interests view model (owner decision 3; the pattern of src/components/contact/contactVm.ts).
//
// Display-ready values only: every string is the final text, every colour a value the
// stylesheet already draws (the design's sticker and rev colours), every light the name of
// a keyframes rule in Interests.css. The one slot that looks different is the cube timer, a
// union on 'kind' (idle, running, stopped), each variant carrying its readout, button label
// and aria-pressed value. The container (Interests.tsx) builds the VM; mocks
// (mocks/interests/*.json) hold one VM per visual state under 'vm'.
//
// Every object is strict: an unknown field is an error.
import { z } from 'zod';

/** The text of one interest card. */
export type CardVm = { kicker: string; title: string; body: string };

/** The cube's sticker colours (the six faces). */
export const STICKER_COLOURS = ['#F2F2F2', '#FFD84D', '#FF5A4D', '#FF9F43', '#4D9BFF', '#5BD68A'] as const;
export type StickerColour = (typeof STICKER_COLOURS)[number];

/** The rev bar's colours: green, amber, red. */
export const REV_COLOURS = ['#7EE787', '#FFB454', '#FF5A4D'] as const;
export type RevColour = (typeof REV_COLOURS)[number];

/** The keyframes of the five start lights (Interests.css). */
export const LIGHT_ANIMATIONS = ['f1', 'f2', 'f3', 'f4', 'f5'] as const;
export type LightAnimation = (typeof LIGHT_ANIMATIONS)[number];

/**
 * The cube timer: the readout in seconds ('0.00'), the toggle button's label and its
 * aria-pressed value. idle: never started or reset by a new scramble; running: counting;
 * stopped: shows the last solve time.
 */
export type TimerVm =
  | { kind: 'idle'; text: string; label: string; pressed: false }
  | { kind: 'running'; text: string; label: string; pressed: true }
  | { kind: 'stopped'; text: string; label: string; pressed: false };

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
  cubing: {
    card: CardVm;
    /** The 3x3 face, row by row. */
    stickers: { colour: StickerColour }[];
    scramble: string;
    /** The new-scramble button's label. */
    scrambleLabel: string;
    timer: TimerVm;
  };
};

const cardSchema = z.strictObject({ kicker: z.string(), title: z.string(), body: z.string() });

const timerSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('idle'), text: z.string(), label: z.string(), pressed: z.literal(false) }),
  z.strictObject({ kind: z.literal('running'), text: z.string(), label: z.string(), pressed: z.literal(true) }),
  z.strictObject({ kind: z.literal('stopped'), text: z.string(), label: z.string(), pressed: z.literal(false) }),
]);

export const interestsVmSchema: z.ZodType<InterestsVm> = z.strictObject({
  intro: z.string(),
  f1: z.strictObject({
    card: cardSchema,
    lights: z.array(z.strictObject({ animation: z.enum(LIGHT_ANIMATIONS) })),
    revs: z.array(z.strictObject({ colour: z.enum(REV_COLOURS), delay: z.string() })),
  }),
  films: z.strictObject({ card: cardSchema }),
  cubing: z.strictObject({
    card: cardSchema,
    stickers: z.array(z.strictObject({ colour: z.enum(STICKER_COLOURS) })),
    scramble: z.string(),
    scrambleLabel: z.string(),
    timer: timerSchema,
  }),
});
