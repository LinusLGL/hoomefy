import { describe, it, expect } from 'vitest';
import tailwindSource from '../../../tailwind.config.js?raw';
import {
  ELEGANT,
  HAUNTED,
  HORROR,
  TOKEN_NAMES,
  buildThemeCss,
  channels,
  contrastRatio,
  hexToRgb,
  mixToken,
  varName,
} from './palettes';

describe('palettes', () => {
  it('defines exactly the same tokens for both experiences', () => {
    expect(Object.keys(HAUNTED).sort()).toEqual(Object.keys(ELEGANT).sort());
  });

  it('uses valid 6-digit hex for every value', () => {
    for (const palette of [ELEGANT, HAUNTED]) {
      for (const [token, hex] of Object.entries(palette)) {
        expect(hex, token).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });

  it('is wired into tailwind.config.js (no token missing from the config)', () => {
    const scales = new Set(TOKEN_NAMES.filter((t) => /-\d+$/.test(t)).map((t) => t.replace(/-\d+$/, '')));
    for (const prefix of scales) {
      expect(tailwindSource, `scale ${prefix}`).toContain(`scale('${prefix}'`);
    }
    // navy has the extra 950 step
    expect(tailwindSource).toContain("v('navy-950')");
    for (const token of TOKEN_NAMES.filter((t) => !/-\d+$/.test(t))) {
      expect(tailwindSource, token).toContain(`v('${token}')`);
    }
  });

  it('emits both palettes as CSS variables', () => {
    const css = buildThemeCss();
    expect(css).toContain(':root{');
    expect(css).toContain('html[data-experience="haunted"]{');
    expect(css).toContain(`${varName('navy-900')}:${channels(ELEGANT['navy-900'])};`);
    expect(css).toContain(`${varName('navy-900')}:${channels(HAUNTED['navy-900'])};`);
  });

  it('interpolates tokens linearly and clamps t', () => {
    expect(mixToken('navy-900', 0)).toBe(channels(ELEGANT['navy-900']));
    expect(mixToken('navy-900', 1)).toBe(channels(HAUNTED['navy-900']));
    expect(mixToken('navy-900', -3)).toBe(mixToken('navy-900', 0));
    expect(mixToken('navy-900', 9)).toBe(mixToken('navy-900', 1));
    const mid = mixToken('ivory', 0.5).split(' ').map(Number);
    const a = hexToRgb(ELEGANT.ivory);
    const b = hexToRgb(HAUNTED.ivory);
    expect(mid[0]).toBe(Math.round((a[0] + b[0]) / 2));
  });

  it('uses the mansion palette in the Haunted theme (warm near-black, crimson, bone, sage)', () => {
    const eq = (a: string, b: string) => expect(a.toLowerCase()).toBe(b.toLowerCase());
    eq(HAUNTED['navy-900'], HORROR.ink);
    eq(HAUNTED['navy-800'], HORROR.panel);
    eq(HAUNTED['amber-600'], HORROR.crimson);
    eq(HAUNTED.ivory, HORROR.bone);
    eq(HAUNTED.accent, HORROR.sage);
  });

  it('keeps the Haunted surfaces warm, not cold (red channel >= blue channel)', () => {
    for (const token of ['navy-900', 'navy-800', 'navy-700', 'navy-950']) {
      const [r, , b] = hexToRgb(HAUNTED[token]);
      expect(r, token).toBeGreaterThanOrEqual(b);
    }
  });
});

describe('contrast (WCAG AA, 4.5:1) in both experiences', () => {
  const themes = { elegant: ELEGANT, haunted: HAUNTED } as const;

  for (const [name, p] of Object.entries(themes)) {
    describe(name, () => {
      const pairs: Array<[string, string, string]> = [
        ['body text on page', p.ivory, p['navy-900']],
        ['body text on panel', p.ivory, p['navy-800']],
        ['accent text on page', p.accent, p['navy-900']],
        ['accent text on panel', p.accent, p['navy-800']],
        ['accent hover text on page', p['accent-hover'], p['navy-900']],
        ['button label on accent surface', p['on-accent'], p['amber-600']],
        ['button label on accent hover', p['on-accent'], p['amber-700']],
        ['ink on paper card', p.ink, p.paper],
        ['success text on page', p.success, p['navy-900']],
        ['danger text on page', p.danger, p['navy-900']],
        ['info text on page', p.info, p['navy-900']],
        ['warning text on page', p.warning, p['navy-900']],
        ['danger text on panel', p.danger, p['navy-800']],
      ];
      for (const [label, fg, bg] of pairs) {
        it(`${label} \u2265 4.5:1`, () => {
          expect(contrastRatio(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
        });
      }
    });
  }

  it('secondary body text (ivory at 70% alpha) stays \u2265 4.5:1 on the page in both themes', () => {
    for (const p of [ELEGANT, HAUNTED]) {
      const [fr, fg, fb] = hexToRgb(p.ivory);
      const [br, bg, bb] = hexToRgb(p['navy-900']);
      const mix = (f: number, b: number) => Math.round(f * 0.7 + b * 0.3);
      const hex = '#' + [mix(fr, br), mix(fg, bg), mix(fb, bb)].map((v) => v.toString(16).padStart(2, '0')).join('');
      expect(contrastRatio(hex, p['navy-900'])).toBeGreaterThanOrEqual(4.5);
    }
  });
});
