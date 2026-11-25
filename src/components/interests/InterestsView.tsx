// InterestsView: the logic-free View of the Interests section (owner decision 3; the rules
// are in src/components/contact/ContactView.tsx). The only prop is the VM (interestsVm.ts).
// The body reads properties and maps over arrays. The film strip and the fashion swatch
// rail are fixed markup; their motion is CSS (Interests.css).
//
// The screen renderer (npm run screens) draws this component from mocks/interests/*.json.
import type { CardVm, InterestsVm } from './interestsVm';
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

export function InterestsView({ vm }: { vm: InterestsVm }) {
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
          <div className="interest-visual fashion-visual" aria-hidden="true">
            <div className="fashion-rail" />
            <div className="fashion-swatches">
              <span className="swatch" />
              <span className="swatch" />
              <span className="swatch" />
              <span className="swatch" />
              <span className="swatch" />
              <span className="swatch" />
            </div>
          </div>
          <CardText card={vm.fashion.card} />
        </article>
      </div>
    </section>
  );
}
