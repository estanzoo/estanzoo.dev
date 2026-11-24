// L4 render: proves Contact renders to the expected server markup - the heading copy,
// a mailto link to site.email and the copy button in its idle 'copy email' state.
// Leaves to other layers: clipboard behaviour and label changes after a click (L5,
// Contact.behaviour.test.tsx), and where the copy comes from (content.ts).
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { contact, site } from '../../content';
import { Contact } from './Contact';

function renderContact(): Document {
  const html = renderToString(<Contact />);
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('Contact server markup', () => {
  it('the heading shows the contact heading copy', () => {
    const doc = renderContact();
    expect(doc.querySelector('section#contact h2')?.textContent).toBe(contact.heading);
  });

  it('the mail link points to mailto with the public email and shows the address', () => {
    const doc = renderContact();
    const mail = doc.querySelector<HTMLAnchorElement>('a.contact-mail');
    expect(mail?.getAttribute('href')).toBe(`mailto:${site.email}`);
    expect(mail?.textContent).toBe(site.email);
  });

  it('the copy button starts with the label copy email', () => {
    const doc = renderContact();
    expect(doc.querySelector('button.contact-copy')?.textContent).toBe('copy email');
  });
});
