import { about, facts, site } from '../content';
import './About.css';

export function About() {
  const { before, org, after } = about.lead;
  return (
    <section id="about" className="section rv about">
      <div className="about-text">
        <h2 className="section-label"># about</h2>
        <p className="about-lead">
          {before}
          <a href="#experience">{org}</a>
          {after}
        </p>
        <p className="about-body">{about.body}</p>
      </div>
      <dl className="about-facts mono">
        {facts.map((f) => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
        <div>
          <dt>links</dt>
          <dd>
            <a href={site.github}>github</a> · <a href={site.linkedin}>linkedin</a>
          </dd>
        </div>
      </dl>
    </section>
  );
}
