import { describe, expect, it } from 'vitest';
import hauntedLanding from './haunted-landing.css?raw';

/**
 * The Haunted landing stylesheet must never change the Elegant look. Every rule is scoped to the
 * Haunted experience, apart from a short list of classes that only exist in Haunted markup (or are
 * hidden until Haunted switches them on).
 */
describe('haunted-landing.css', () => {
  const HAUNTED_SCOPE = "html[data-experience='haunted']";
  const HAUNTED_ONLY_CLASSES = ['.hf-art', '.hf-bg__', '.hf-hero__ornament', '.hf-steps', '.hf-backdrop', '.hf-controls'];

  const withoutComments = hauntedLanding.replace(/\/\*[\s\S]*?\*\//g, '');
  const withoutKeyframes = withoutComments.replace(/@keyframes\s+[\w-]+\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  const selectors = withoutKeyframes
    .replace(/@media[^{]*\{/g, '')
    .split('}')
    .map((chunk) => chunk.split('{')[0])
    .flatMap((list) => list.split(','))
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('@'));

  it('finds the rules', () => {
    expect(selectors.length).toBeGreaterThan(50);
  });

  it('scopes every rule to the Haunted experience or to Haunted-only classes', () => {
    const unscoped = selectors.filter(
      (s) => !s.startsWith(HAUNTED_SCOPE) && !HAUNTED_ONLY_CLASSES.some((c) => s.startsWith(c))
    );
    expect(unscoped).toEqual([]);
  });

  it('hides the Haunted-only artwork and steps by default, so Elegant never shows them', () => {
    expect(withoutComments).toMatch(/\.hf-art\s*\{\s*display:\s*none/);
    expect(withoutComments).toMatch(/\.hf-steps\s*\{\s*display:\s*none/);
    expect(withoutComments).toMatch(/\.hf-hero__ornament\s*\{\s*display:\s*none/);
  });

  it('switches the looping lights and push-in off for reduced motion', () => {
    // every animated rule is gated by :not([data-motion='reduced'])
    const animations = withoutKeyframes.match(/[^{}]*\{[^{}]*animation:[^{}]*\}/g) ?? [];
    expect(animations.length).toBeGreaterThan(0);
    for (const rule of animations) {
      expect(rule, rule).toContain(":not([data-motion='reduced'])");
    }
  });
});
