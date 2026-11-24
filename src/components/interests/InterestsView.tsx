// InterestsView: the logic-free View of the Interests section (owner decision 3; the rules
// are in src/components/contact/ContactView.tsx). Props are the VM (interestsVm.ts) plus the
// two cube callbacks. The body reads properties, maps over arrays and branches only through
// <Render>. Every decision (which stickers, which scramble, the timer readout and label)
// lives in the container, Interests.tsx.
//
// The screen renderer (npm run screens) draws this component from mocks/interests/*.json.
import type { Views } from '../../vm/primitives';
import { Render } from '../../vm/primitives';
import type { CardVm, InterestsVm, TimerVm } from './interestsVm';
import './Interests.css';

function CardText({ card }: { card: CardVm }) {
  return (
    <>
      <span className="interest-kicker">{card.kicker}</span>
      <h3 className="interest-title">{card.title}</h3>
      <p className="interest-body">{card.body}</p>
    </>
  );
}

/** Every timer state draws its label; the variant only changes the text. */
function TimerLabel({ vm }: { vm: TimerVm }) {
  return <>{vm.label}</>;
}

const timerViews: Views<TimerVm> = { idle: TimerLabel, running: TimerLabel, stopped: TimerLabel };

export function InterestsView({
  vm,
  onScramble,
  onToggleTimer,
}: {
  vm: InterestsVm;
  onScramble?: () => void;
  onToggleTimer?: () => void;
}) {
  return (
    <section id="interests" className="section rv" aria-labelledby="interests-label">
      <h2 id="interests-label" className="section-label interests-label">
        # interests
      </h2>
      <p className="interests-intro">{vm.intro}</p>
      <div className="interests-grid">
        <article className="card interest-card">
          <div className="interest-visual f1-visual" aria-hidden="true">
            <div className="f1-lights">
              {vm.f1.lights.map((light, i) => (
                <span key={i} className="f1l" style={{ animationName: light.animation }} />
              ))}
            </div>
            <div className="f1-revs">
              {vm.f1.revs.map((rev, i) => (
                <span key={i} className="rev" style={{ background: rev.colour, animationDelay: rev.delay }} />
              ))}
            </div>
          </div>
          <CardText card={vm.f1.card} />
        </article>
        <article className="card interest-card">
          <div className="interest-visual film-visual" aria-hidden="true">
            <div className="film-window">
              <div className="film">
                <div className="film-holes" />
                <div className="film-frames" />
                <div className="film-holes" />
              </div>
            </div>
          </div>
          <CardText card={vm.films.card} />
        </article>
        <article className="card interest-card">
          <div className="cube-visual">
            <div className="cube-grid" aria-hidden="true">
              {vm.cubing.stickers.map((sticker, i) => (
                <span key={i} className="sticker" style={{ background: sticker.colour }} />
              ))}
            </div>
            <div className="cube-readout">
              <span className="cube-time" aria-live="off">
                {vm.cubing.timer.text}
              </span>
              <span className="cube-scramble">{vm.cubing.scramble}</span>
            </div>
          </div>
          <CardText card={vm.cubing.card} />
          <div className="cube-actions">
            <button type="button" className="chip cube-chip" onClick={onScramble}>
              {vm.cubing.scrambleLabel}
            </button>
            <button
              type="button"
              className="chip cube-chip cube-toggle"
              onClick={onToggleTimer}
              aria-pressed={vm.cubing.timer.pressed}
            >
              <Render vm={vm.cubing.timer} views={timerViews} />
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
