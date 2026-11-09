import { describe, it, expect } from 'vitest';
import elegantCss from './elegant.css?raw';
import { ELEGANT, HAUNTED, contrastRatio } from '../features/haunting/palettes';

/** Every selector in elegant.css, with the @media nesting stripped. */
function selectors(css: string): string[] {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: string[] = [];
  let buf = '';
  for (const ch of clean) {
    if (ch === '{') {
      const text = buf.trim();
      if (text && !text.startsWith('@')) out.push(...text.split(',').map((s) => s.trim()));
      buf = '';
    } else if (ch === '}' || ch === ';') {
      buf = '';
    } else {
      buf += ch;
    }
  }
  return out;
}

describe('elegant.css (the "Scandinavian Dreams" look)', () => {
  const ELEGANT_SCOPE = "html:not([data-experience='haunted'])";
  const HAUNTED_SCOPE = "html[data-experience='haunted']";
  // Elements that exist only for the Elegant experience are hidden by default, which keeps them out of Haunted.
  const HIDDEN_BY_DEFAULT = ['.hf-hero__art', '.hf-hero__leaves', '.hf-hero__card'];

  it('only ever styles the Elegant experience, so the Haunted look cannot change', () => {
    const loose = selectors(elegantCss).filter(
      (s) => !s.startsWith(ELEGANT_SCOPE) && !s.startsWith(HAUNTED_SCOPE) && !HIDDEN_BY_DEFAULT.includes(s)
    );
    expect(loose).toEqual([]);
  });

  it('hides the Elegant-only artwork in Haunted', () => {
    const block = elegantCss.match(/\.hf-hero__art,\s*\.hf-hero__leaves,\s*\.hf-hero__card\s*\{[^}]*\}/)?.[0] ?? '';
    expect(block).toMatch(/display:\s*none/);
  });

  it('switches to the stacked layout below 1180px and the design-proportioned layout above it', () => {
    expect(elegantCss).toMatch(/@media \(max-width: 1179\.98px\)/);
    expect(elegantCss).toMatch(/@media \(min-width: 1180px\)/);
    // the wide layout is measured in container units of the 1780px design
    expect(elegantCss).toMatch(/--k:\s*calc\(100cqw \/ 1780\)/);
  });

  it('uses the colours measured from the design', () => {
    expect(ELEGANT['navy-900'].toLowerCase()).toBe('#f0eeeb'); // page
    expect(ELEGANT.ivory.toLowerCase()).toBe('#0b2124'); // headline ink
    expect(ELEGANT['amber-600'].toLowerCase()).toBe('#4a6f57'); // "Design My Room"
    expect(ELEGANT.cta.toLowerCase()).toBe('#2c4a3d'); // "Get Started"
  });

  it('keeps the new call-to-action and header tokens accessible in both experiences', () => {
    for (const p of [ELEGANT, HAUNTED]) {
      expect(contrastRatio(p['on-accent'], p.cta)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p['on-accent'], p['cta-hover'])).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.ivory, p.header)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
