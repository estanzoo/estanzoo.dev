// Contact container (owner decision 3): owns the copy state, the timer and
// navigator.clipboard, builds the ContactVm from content.ts and hands it to the
// logic-free ContactView. Every decision about what the section shows is made here,
// in contactVm(); the View only draws.
//
// Only App.tsx and containers import src/content.ts.
import { useEffect, useRef, useState } from 'react';
import { contact, site } from '../../content';
import { ContactView } from './ContactView';
import type { ContactVm, CopyVm } from './contactVm';

type CopyKind = CopyVm['kind'];

const COPY_RESET_MS = 1800;

const COPY_LABELS: Record<CopyKind, string> = {
  idle: 'copy email',
  copied: 'copied',
  blocked: 'copy blocked',
};

/** The section's VM for one copy state. */
export function contactVm(copy: CopyKind): ContactVm {
  return {
    prompt: contact.prompt,
    heading: contact.heading,
    mail: { href: `mailto:${site.email}`, label: site.email },
    copy: { kind: copy, label: COPY_LABELS[copy] },
    links: [
      { href: site.github, label: 'GitHub' },
      { href: site.linkedin, label: 'LinkedIn' },
    ],
    footer: `© ${site.year} ${site.name}`,
  };
}

export function Contact() {
  const [copy, setCopy] = useState<CopyKind>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const done = (next: CopyKind) => {
    setCopy(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      setCopy('idle');
    }, COPY_RESET_MS);
  };

  const onCopy = () => {
    try {
      navigator.clipboard.writeText(site.email).then(
        () => done('copied'),
        () => done('blocked'),
      );
    } catch {
      done('blocked');
    }
  };

  return <ContactView vm={contactVm(copy)} onCopy={onCopy} />;
}
