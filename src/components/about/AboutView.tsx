// AboutView: the logic-free View of the About section (owner decision 3; the rules are in
// contact/ContactView.tsx). Props are the VM only: the section has no events of its own,
// its links are plain anchors. The body reads properties, maps the facts and the links
// row, and draws each links row item through <Render> on its kind.
//
// The screen renderer (npm run screens) draws this component from mocks/about/*.json.
import type { Views } from '../../vm/primitives';
import { Render } from '../../vm/primitives';
import type { AboutVm, LinksItemVm } from './aboutVm';
import './About.css';

function LinksRowLink({ vm }: { vm: Extract<LinksItemVm, { kind: 'link' }> }) {
  return <a href={vm.href}>{vm.label}</a>;
}

function LinksRowSeparator({ vm }: { vm: Extract<LinksItemVm, { kind: 'separator' }> }) {
  return <>{vm.text}</>;
}

const linksItemViews: Views<LinksItemVm> = { link: LinksRowLink, separator: LinksRowSeparator };

export function AboutView({ vm }: { vm: AboutVm }) {
  return (
    <section id="about" className="section rv about">
      <div className="about-text">
        <h2 className="section-label">{vm.label}</h2>
        <p className="about-lead">
          {vm.lead.before}
          <a href={vm.lead.org.href}>{vm.lead.org.label}</a>
          {vm.lead.after}
        </p>
        <p className="about-body">{vm.body}</p>
      </div>
      <dl className="about-facts mono">
        {vm.facts.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
        <div>
          <dt>{vm.links.label}</dt>
          <dd>
            {vm.links.items.map((item, i) => (
              <Render key={i} vm={item} views={linksItemViews} />
            ))}
          </dd>
        </div>
      </dl>
    </section>
  );
}
