// L1 unit: proves the Header container builds a schema-valid view model from content.ts -
// the handle links to the top of the page and the nav lists every section, in page order,
// with the section id as its label.
// Leaves to other layers: the drawing (HeaderView.test.tsx) and in-page navigation
// (Header.behaviour.test.tsx).
import { describe, expect, it } from 'vitest';
import { site } from '../../content';
import { headerVm } from './Header';
import { headerVmSchema } from './headerVm';

describe('headerVm', () => {
  it('fits the schema', () => {
    expect(() => headerVmSchema.parse(headerVm())).not.toThrow();
  });

  it('the handle shows site.handle and links to the top of the page', () => {
    expect(headerVm().handle).toEqual({ href: '#top', label: site.handle });
  });

  it('the nav is named Sections and links each section in page order', () => {
    expect(headerVm()).toMatchObject({
      navLabel: 'Sections',
      nav: ['about', 'projects', 'experience', 'interests', 'contact'].map((id) => ({ href: `#${id}`, label: id })),
    });
  });
});
