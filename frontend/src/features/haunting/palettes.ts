/**
 * Palettes: the single source of truth for both experiences.
 *
 * Every themeable colour is a CSS variable holding space-separated RGB
 * channels ("245 241 232"). Tailwind reads them as
 * `rgb(var(--c-navy-900) / <alpha-value>)`, so existing utilities such as
 * `bg-navy-900` or `text-ivory/80` re-skin automatically. Because the values are
 * plain channels, GSAP can tween them during the possession phase.
 *
 * Semantics (kept identical in both themes):
 *  - navy-*   surface scale. 900 = page, 800 = panel, 700 = border, 400 = placeholder.
 *             Low numbers are the most prominent tone (ink in Elegant, pale in Haunted).
 *  - ivory    primary text colour.
 *  - amber-*  accent surfaces / borders / focus (bronze in Elegant, emergency red in Haunted).
 *  - accent   accent used as TEXT (bronze in Elegant, pale green in Haunted).
 *  - on-accent text drawn on an amber-600 surface.
 *  - paper/ink  light "paper" cards and the ink printed on them.
 */

export type ExperienceName = 'elegant' | 'haunted';
export type Rgb = readonly [number, number, number];

const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

function scale(prefix: string, values: readonly string[], extra: Record<string, string> = {}) {
  const out: Record<string, string> = {};
  SCALE_STEPS.forEach((step, i) => {
    out[`${prefix}-${step}`] = values[i];
  });
  return { ...out, ...extra };
}

/**
 * Elegant = the "Scandinavian Dreams" design: warm-grey paper, deep teal-black ink, sage and
 * forest green. Every value was measured from the design file.
 */
export const ELEGANT: Record<string, string> = {
  ...scale(
    'navy',
    ['#0B2124', '#16302F', '#2A4642', '#4B625C', '#5D6E68', '#93A29B', '#BBC5BF', '#D3D8D2', '#E4E3DF', '#F0EEEB'],
    { 'navy-950': '#E8E6E1' }
  ),
  // Sage tints (the wave and the swoosh live around step 600).
  ...scale('purple', ['#1E2E2A', '#2F443E', '#43594F', '#5C7266', '#7A8F83', '#9CAEA3', '#B7C2BA', '#CFD7D1', '#E0E6E1', '#EEF1EE']),
  // Forest green: primary buttons are step 600 (#4A6F57).
  ...scale('amber', ['#F1F5F2', '#E1EAE4', '#C7D6CC', '#A4BCAB', '#7F9F8B', '#5F836D', '#4A6F57', '#3B5C47', '#2C4A3D', '#1F3529']),
  ivory: '#0B2124',
  accent: '#2C4A3D',
  'accent-hover': '#1B3329',
  'on-accent': '#FFFFFF',
  paper: '#FBFAF7',
  ink: '#0B2124',
  success: '#2F6B3A',
  danger: '#A02830',
  info: '#2B5C86',
  warning: '#8A5A12',
  // Header call to action (darker than the hero buttons) and the header surface.
  cta: '#2C4A3D',
  'cta-hover': '#213A30',
  header: '#F5F3F1',
};

export const HAUNTED: Record<string, string> = {
  ...scale(
    'navy',
    ['#EFE6DA', '#E3D8CA', '#BDB0A2', '#948779', '#756B64', '#54494A', '#3A2E30', '#2A1F21', '#17100F', '#0B0809'],
    { 'navy-950': '#060405' }
  ),
  // Secondary scale: muted sage, used sparingly (gradients, tints).
  ...scale('purple', ['#E7EDE4', '#CBD7C7', '#A9BBA5', '#869C84', '#667B67', '#4A5C4D', '#34433A', '#222D27', '#161D1A', '#0F1413']),
  // Accent surfaces: crimson velvet.
  ...scale('amber', ['#F7E6E8', '#EDC9CE', '#DDA1AA', '#C97885', '#B04F60', '#9E3446', '#8E1B2C', '#6F1523', '#4F0F19', '#340A11']),
  ivory: '#E6DCCF',
  accent: '#9DB59A',
  'accent-hover': '#BFD2BC',
  'on-accent': '#F3EBE0',
  paper: '#E3D8CA',
  ink: '#17100F',
  success: '#9DB59A',
  danger: '#E5707A',
  info: '#9FB2C6',
  warning: '#E0A850',
  cta: '#8E1B2C',
  'cta-hover': '#6F1523',
  header: '#0B0809',
};
export const TOKEN_NAMES = Object.keys(ELEGANT);

export const PALETTES: Record<ExperienceName, Record<string, string>> = {
  elegant: ELEGANT,
  haunted: HAUNTED,
};

/** Mansion brand colours, exported for canvases, shaders and tests. */
export const HORROR = {
  ink: '#0B0809',
  panel: '#17100F',
  bone: '#E6DCCF',
  crimson: '#8E1B2C',
  sage: '#9DB59A',
  candleGold: '#E8B76A',
  moonlight: '#9FB2C6',
} as const;

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const channels = (hex: string): string => hexToRgb(hex).join(' ');

export const varName = (token: string): string => `--c-${token}`;

/** WCAG 2.x relative luminance / contrast ratio. */
export function luminance([r, g, b]: Rgb): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(hexToRgb(a));
  const lb = luminance(hexToRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Linear blend between two palettes for a given token. */
export function mixToken(token: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(ELEGANT[token]);
  const [r2, g2, b2] = hexToRgb(HAUNTED[token]);
  const k = Math.min(1, Math.max(0, t));
  return [r1 + (r2 - r1) * k, g1 + (g2 - g1) * k, b1 + (b2 - b1) * k].map(Math.round).join(' ');
}

/** Static stylesheet: Elegant on :root, Haunted under the experience attribute. */
export function buildThemeCss(): string {
  const block = (p: Record<string, string>) =>
    TOKEN_NAMES.map((t) => `${varName(t)}:${channels(p[t])};`).join('');
  return `:root{${block(ELEGANT)}color-scheme:light;}html[data-experience="haunted"]{${block(HAUNTED)}color-scheme:dark;}`;
}

const STYLE_ID = 'hf-theme-vars';

export function injectThemeStyles(doc: Document = document): void {
  let el = doc.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = doc.createElement('style');
    el.id = STYLE_ID;
    doc.head.prepend(el);
  }
  el.textContent = buildThemeCss();
}

/** Write an interpolated palette as inline variables (used by the GSAP tween). */
export function applyMixedPalette(t: number, root: HTMLElement = document.documentElement): void {
  for (const token of TOKEN_NAMES) {
    root.style.setProperty(varName(token), mixToken(token, t));
  }
}

export function clearInlinePalette(root: HTMLElement = document.documentElement): void {
  for (const token of TOKEN_NAMES) {
    root.style.removeProperty(varName(token));
  }
}
