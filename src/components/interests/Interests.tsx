// Interests container (owner decision 3; the pattern of src/components/contact/Contact.tsx):
// builds the InterestsView's VM from content.ts in interestsVm(). The section has no state
// and no browser APIs: every animation is CSS.
//
// Only App.tsx and containers import src/content.ts.
import { interests } from '../../content';
import { InterestsView } from './InterestsView';
import { LIGHT_ANIMATIONS } from './interestsVm';
import type { InterestsVm, RevColour } from './interestsVm';

const REVS = Array.from({ length: 12 }, (_, i) => ({
  colour: (i < 5 ? '#7EE787' : i < 9 ? '#FFB454' : '#FF5A4D') as RevColour,
  delay: (i * 0.09).toFixed(2) + 's',
}));

/** The section's VM. */
export function interestsVm(): InterestsVm {
  return {
    intro: interests.intro,
    f1: {
      card: interests.f1,
      lights: LIGHT_ANIMATIONS.map((animation) => ({ animation })),
      revs: REVS,
    },
    films: { card: interests.films },
    fashion: { card: interests.fashion },
  };
}

export function Interests() {
  return <InterestsView vm={interestsVm()} />;
}
