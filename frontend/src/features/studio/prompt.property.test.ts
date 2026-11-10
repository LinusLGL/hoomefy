/**
 * Property-based tests for the prompt builder (requirement R1 of .kiro/specs/studio-items).
 *
 * The visitor's wishes are free text, so the builder has to hold for ANY string: quotes, control characters, emoji,
 * very long text, only punctuation. These tests generate hundreds of them instead of the handful an example test names.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { buildEditPrompt, cleanText, hasStyleText, MAX_FREE_TEXT } from './prompt';
import { STYLE_ORDER } from './styles';
import { MAX_PROMPT_LENGTH } from '../../../worker/redesign';
import type { DesignStyle } from '@/types';

const wishText = fc.string({ unit: 'binary', maxLength: 900 });
const style = fc.constantFrom<DesignStyle>(...STYLE_ORDER);
// "custom" needs words of its own; give every run some.
const customStyle = fc.string({ unit: 'binary', maxLength: 700 });
const intensity = fc.oneof(fc.double({ min: -10, max: 10, noNaN: true }), fc.constantFrom(NaN, Infinity, -Infinity, 0, 1), fc.constant(undefined));

const QUOTE_START = 'must be clearly visible in the result: "';
const QUOTE_END = '". For everything the request does not mention';

/** The wishes as they appear inside the prompt, or null when the prompt has no wishes section. */
const quotedWishes = (prompt: string): string | null => {
  const start = prompt.indexOf(QUOTE_START);
  if (start === -1) return null;
  const from = start + QUOTE_START.length;
  const end = prompt.indexOf(QUOTE_END, from);
  return end === -1 ? null : prompt.slice(from, end);
};

describe('buildEditPrompt (properties)', () => {
  it('never throws, and always starts the same way and fits the Worker limit', () => {
    fc.assert(
      fc.property(style, customStyle, intensity, wishText, (s, cs, i, w) => {
        const prompt = buildEditPrompt({ style: s, customStyle: cs, intensity: i, instructions: w });
        expect(prompt.startsWith('Edit this photograph of a room.')).toBe(true);
        expect(prompt.length).toBeLessThanOrEqual(MAX_PROMPT_LENGTH);
      }),
      { numRuns: 300 }
    );
  });

  it('puts the cleaned wishes first, once, inside one pair of quotes, ahead of the style', () => {
    fc.assert(
      fc.property(style, wishText, (s, w) => {
        const prompt = buildEditPrompt({ style: s, customStyle: 'a calm cabin with oak beams', instructions: w });
        const wishes = quotedWishes(prompt);
        if (wishes === null) return; // the wishes were empty once cleaned: covered by the next property
        // What the model is shown as the visitor's request is tidy: no stray quote, no control characters, no padding.
        expect(wishes).not.toMatch(/["\u201c\u201d]/);
        expect(wishes).not.toMatch(/\p{Cc}/u);
        expect(wishes).toBe(wishes.trim());
        expect(wishes).not.toMatch(/\s{2,}/);
        expect(wishes.length).toBeGreaterThan(0);
        expect(wishes.length).toBeLessThanOrEqual(MAX_FREE_TEXT);
        // It comes before the style and the layout rules, and only once.
        expect(prompt.split(QUOTE_START)).toHaveLength(2);
        expect(prompt.indexOf(QUOTE_START)).toBeLessThan(prompt.indexOf('restyle the interior in this look'));
        expect(prompt).toContain('Change those only where the request above asks for it');
        expect(prompt).not.toContain('Change only the furniture design');
      }),
      { numRuns: 300 }
    );
  });

  it('uses the strict layout rules, and mentions no request, exactly when there are no usable wishes', () => {
    fc.assert(
      fc.property(style, wishText, (s, w) => {
        const prompt = buildEditPrompt({ style: s, customStyle: 'a calm cabin with oak beams', instructions: w });
        const hasWishes = quotedWishes(prompt) !== null;
        expect(prompt.includes('Change only the furniture design')).toBe(!hasWishes);
        expect(prompt.includes("The owner's request comes first")).toBe(hasWishes);
      }),
      { numRuns: 300 }
    );
  });

  it('is the same prompt for the same input', () => {
    fc.assert(
      fc.property(style, customStyle, intensity, wishText, (s, cs, i, w) => {
        const input = { style: s, customStyle: cs, intensity: i, instructions: w };
        expect(buildEditPrompt(input)).toBe(buildEditPrompt(input));
      }),
      { numRuns: 100 }
    );
  });

  it('says how bold to be in step with the intensity, however wild the number', () => {
    fc.assert(
      fc.property(fc.double({ min: -50, max: 50, noNaN: true }), (i) => {
        const prompt = buildEditPrompt({ style: 'japandi', intensity: i });
        const clamped = Math.min(1, Math.max(0, i));
        if (clamped < 0.35) expect(prompt).toContain('subtle makeover');
        else if (clamped < 0.7) expect(prompt).toContain('clear makeover');
        else expect(prompt).toContain('dramatic redesign');
      }),
      { numRuns: 300 }
    );
  });
});

describe('cleanText and hasStyleText (properties)', () => {
  it('returns trimmed, single-spaced text with no control characters, within the limit', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary', maxLength: 1500 }), fc.integer({ min: 1, max: 600 }), (text, max) => {
        const out = cleanText(text, max);
        expect(out.length).toBeLessThanOrEqual(max);
        expect(out).toBe(out.trim());
        expect(out).not.toMatch(/\s{2,}/);
        expect(out).not.toMatch(/\p{Cc}/u);
      }),
      { numRuns: 300 }
    );
  });

  it('cleaning twice changes nothing', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary', maxLength: 900 }), (text) => {
        expect(cleanText(cleanText(text))).toBe(cleanText(text));
      }),
      { numRuns: 300 }
    );
  });

  it('accepts a custom style only when it has at least three characters of words', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary', maxLength: 200 }), (text) => {
        expect(hasStyleText('custom', text)).toBe(cleanText(text).length >= 3);
        expect(hasStyleText('japandi', text)).toBe(true);
      }),
      { numRuns: 300 }
    );
  });
});
