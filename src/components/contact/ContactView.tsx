// ContactView: the logic-free View of the Contact section (owner decision 3). The pattern
// every section copies:
//
// - Props are the VM (contactVm.ts) plus event callbacks. Nothing else: no content.ts,
//   no browser APIs, no hooks.
// - The body only reads properties, maps over arrays, and branches through <Render>
//   (a union slot) and <Optional> (a nullable value) from src/vm/primitives. No &&, ||,
//   ?:, if or switch. Every decision lives in the container that builds the VM.
// - Each union slot gets a Views map, kind -> component, next to the View that uses it.
//
// The screen renderer (npm run screens) draws this component from mocks/contact/*.json.
import type { Views } from '../../vm/primitives';
import { Render } from '../../vm/primitives';
import type { ContactVm, CopyVm } from './contactVm';
import './Contact.css';

/** Every copy state draws the same live label; the variant only changes the text. */
function CopyLabel({ vm }: { vm: CopyVm }) {
  return <span aria-live="polite">{vm.label}</span>;
}

const copyViews: Views<CopyVm> = { idle: CopyLabel, copied: CopyLabel, blocked: CopyLabel };

export function ContactView({ vm, onCopy }: { vm: ContactVm; onCopy?: () => void }) {
  return (
    <section id="contact" className="section rv contact">
      <div className="contact-box">
        <div className="contact-cmd mono">
          <span className="accent" aria-hidden="true">
            $
          </span>{' '}
          {vm.prompt}
        </div>
        <h2 className="contact-title">{vm.heading}</h2>
        <div className="contact-actions">
          <a className="contact-btn contact-mail" href={vm.mail.href}>
            {vm.mail.label}
          </a>
          <button type="button" className="chip contact-btn contact-copy" onClick={onCopy}>
            <Render vm={vm.copy} views={copyViews} />
          </button>
          {vm.links.map((link) => (
            <a key={link.href} className="chip contact-btn" href={link.href}>
              {link.label}
            </a>
          ))}
        </div>
      </div>
      <p className="contact-foot mono">{vm.footer}</p>
    </section>
  );
}
