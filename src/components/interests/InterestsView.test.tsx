// L4 render: proves InterestsView draws only what its view model says - every text, light
// and rev segment comes from the VM; the film strip and the fashion swatches are fixed
// markup; the section has no controls. No content.ts, no timers, no randomness.
// Leaves to other layers: building the VM (Interests.vm.test.ts), the schema
// (interestsVm.test.ts) and the CSS animations (screenshots, manual check).
import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InterestsView } from './InterestsView';
import type { InterestsVm } from './interestsVm';

const vm: InterestsVm = {
  intro: 'Things I like',
  f1: {
    card: { kicker: 'k1', title: 'Racing', body: 'b1' },
    lights: [{ animation: 'f3' }, { animation: 'f1' }],
    revs: [
      { colour: '#FFB454', delay: '0.50s' },
      { colour: '#FF5A4D', delay: '0.70s' },
    ],
  },
  films: { card: { kicker: 'k2', title: 'Movies', body: 'b2' } },
  fashion: { card: { kicker: 'k3', title: 'Clothes', body: 'b3' } },
};

const draw = () => render(<InterestsView vm={vm} />);

describe('InterestsView', () => {
  it('draws the intro and the kicker, title and body of each card in order', () => {
    const { container } = draw();
    expect(container.querySelector('.interests-intro')).toHaveTextContent('Things I like');
    const cards = [...container.querySelectorAll('article.interest-card')].map((card) => [
      card.querySelector('.interest-kicker')?.textContent,
      card.querySelector('.interest-title')?.textContent,
      card.querySelector('.interest-body')?.textContent,
    ]);
    expect(cards).toEqual([
      ['k1', 'Racing', 'b1'],
      ['k2', 'Movies', 'b2'],
      ['k3', 'Clothes', 'b3'],
    ]);
  });

  it('draws one start light per VM light with its animation', () => {
    const { container } = draw();
    const lights = [...container.querySelectorAll<HTMLElement>('.f1l')].map((l) => l.style.animationName);
    expect(lights).toEqual(['f3', 'f1']);
  });

  it('draws one rev segment per VM rev with its colour and delay', () => {
    // Server markup, not the jsdom DOM: jsdom rewrites '0.50s' to '0.5s'.
    const html = renderToStaticMarkup(<InterestsView vm={vm} />);
    expect(html.match(/<span class="rev"[^>]*>/g)).toEqual([
      '<span class="rev" style="background:#FFB454;animation-delay:0.50s">',
      '<span class="rev" style="background:#FF5A4D;animation-delay:0.70s">',
    ]);
  });

  it('draws the film strip', () => {
    const { container } = draw();
    expect(container.querySelectorAll('.film .film-holes')).toHaveLength(2);
    expect(container.querySelectorAll('.film .film-frames')).toHaveLength(1);
  });

  it('the fashion card draws a hidden rail of six fabric swatches', () => {
    const { container } = draw();
    const visual = container.querySelectorAll('article.interest-card')[2].querySelector('.fashion-visual');
    expect(visual).toHaveAttribute('aria-hidden', 'true');
    expect(visual?.querySelector('.fashion-rail')).not.toBeNull();
    expect(visual?.querySelectorAll('.swatch')).toHaveLength(6);
  });

  it('the section has no buttons and no cube', () => {
    const { container } = draw();
    expect(container.querySelectorAll('button')).toHaveLength(0);
    expect(container.querySelector('.cube-visual, .sticker, .cube-time')).toBeNull();
  });
});
