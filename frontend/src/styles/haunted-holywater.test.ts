import { describe, expect, it } from 'vitest';
import css from './haunted-holywater.css?raw';

/**
 * The holy-water stylesheet must never change the Elegant look: every rule is scoped to the Haunted
 * experience, and every looping animation is switched off for reduced motion.
 */
describe('haunted-holywater.css', () => {
  const HAUNTED_SCOPE = "html[data-experience='haunted']";
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const withoutKeyframes = withoutComments.replace(/@keyframes\s+[\w-]+\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  const selectors = withoutKeyframes
    .replace(/@media[^{]*\{/g, '')
    .split('}')
    .map((chunk) => chunk.split('{')[0])
    .flatMap((list) => list.split(','))
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('@'));

  it('finds the rules', () => {
    expect(selectors.length).toBeGreaterThan(40);
  });

  it('scopes every rule to the Haunted experience', () => {
    expect(selectors.filter((s) => !s.startsWith(HAUNTED_SCOPE))).toEqual([]);
  });

  it('gates every animation on reduced motion', () => {
    const animations = withoutKeyframes.match(/[^{}]*\{[^{}]*animation:[^{}]*\}/g) ?? [];
    expect(animations.length).toBeGreaterThan(0);
    for (const rule of animations) {
      expect(rule, rule).toContain(":not([data-motion='reduced'])");
    }
  });

  it('stacks the layers in the intended order', () => {
    const z = (selector: string): number => {
      const rule = withoutKeyframes.match(new RegExp(`${selector.replace(/[.[\]']/g, '\\$&')}\\s*\\{[^}]*z-index:\\s*(\\d+)`));
      expect(rule, selector).not.toBeNull();
      return Number(rule![1]);
    };
    const viewer = z(".hf-viewer");
    const ghost = z('.hf-avatar__ghost');
    const video = z('.hf-video');
    // above the candlelight (7500) and below the settings controls (9600), the ghost, the candle (9700) and the video
    expect(viewer).toBeGreaterThan(7500);
    expect(viewer).toBeLessThan(9600);
    expect(ghost).toBeGreaterThan(9600);
    expect(ghost).toBeLessThan(9700);
    expect(video).toBeGreaterThan(9700);
  });
});
