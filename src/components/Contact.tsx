import { useEffect, useRef, useState } from 'react';
import { contact, site } from '../content';
import './Contact.css';

type CopyState = '' | 'ok' | 'fail';

const COPY_RESET_MS = 1800;

export function Contact() {
  const [copied, setCopied] = useState<CopyState>('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const done = (v: CopyState) => {
    setCopied(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      setCopied('');
    }, COPY_RESET_MS);
  };

  const copy = () => {
    try {
      navigator.clipboard.writeText(site.email).then(
        () => done('ok'),
        () => done('fail'),
      );
    } catch {
      done('fail');
    }
  };

  const copyLabel = copied === 'ok' ? 'copied' : copied === 'fail' ? 'copy blocked' : 'copy email';

  return (
    <section id="contact" className="section rv contact">
      <div className="contact-box">
        <div className="contact-cmd mono">
          <span className="accent" aria-hidden="true">
            $
          </span>{' '}
          {contact.prompt}
        </div>
        <h2 className="contact-title">{contact.heading}</h2>
        <div className="contact-actions">
          <a className="contact-btn contact-mail" href={`mailto:${site.email}`}>
            {site.email}
          </a>
          <button type="button" className="chip contact-btn contact-copy" onClick={copy}>
            <span aria-live="polite">{copyLabel}</span>
          </button>
          <a className="chip contact-btn" href={site.github}>
            GitHub
          </a>
          <a className="chip contact-btn" href={site.linkedin}>
            LinkedIn
          </a>
        </div>
      </div>
      <p className="contact-foot mono">
        © {site.year} {site.name}
      </p>
    </section>
  );
}
