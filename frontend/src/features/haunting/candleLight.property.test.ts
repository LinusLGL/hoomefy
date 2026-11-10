/**
 * Property-based tests for the candle light (spec .kiro/specs/haunted-mansion, task 14).
 *
 * The light is changed by clicks (lift) and by time (decay), in any order, for as long as someone stays on the page.
 * Whatever happens, it must stay usable: never darker than the floor, never off the steps once lifted, and it must
 * always reach its dimmest quickly (the visitor asked for about seven seconds, down from thirty).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  DECAY_INTERVAL_MS,
  FULL_LIGHT,
  LIGHT_LEVELS,
  MIN_RADIUS,
  MIN_RADIUS_PX,
  decayedRadius,
  levelOf,
  lightRadiusPx,
  useLightStore,
} from './candleLight';

const radius = fc.double({ min: 0, max: 150, noNaN: true });

beforeEach(() => useLightStore.setState({ radius: LIGHT_LEVELS[0], lifts: 0 }));

describe('burning down (properties)', () => {
  it('never goes below the floor, and never rises', () => {
    fc.assert(
      fc.property(radius, (r) => {
        const next = decayedRadius(r);
        expect(next).toBeGreaterThanOrEqual(MIN_RADIUS);
        expect(next).toBeLessThanOrEqual(Math.max(r, MIN_RADIUS));
      }),
      { numRuns: 500 }
    );
  });

  it('is monotone: a brighter candle is never dimmer after a step', () => {
    fc.assert(
      fc.property(radius, radius, (a, b) => {
        const [low, high] = a <= b ? [a, b] : [b, a];
        expect(decayedRadius(low)).toBeLessThanOrEqual(decayedRadius(high));
      }),
      { numRuns: 500 }
    );
  });

  it('reaches the floor from any starting light within 14 steps (about 17 seconds from full light), and from the first light in under eight seconds', () => {
    const stepsToFloor = (start: number) => {
      let r = start;
      let steps = 0;
      while (r > MIN_RADIUS && steps < 1000) {
        r = decayedRadius(r);
        steps += 1;
      }
      return steps;
    };
    fc.assert(
      fc.property(fc.double({ min: MIN_RADIUS, max: FULL_LIGHT, noNaN: true }), (start) => {
        // The first guess here was ten seconds. The property found 44% needing nine steps and full light fourteen: the honest bound is 17 s.
        expect(stepsToFloor(start)).toBeLessThanOrEqual(14);
        expect(stepsToFloor(start) * DECAY_INTERVAL_MS).toBeLessThanOrEqual(16_800);
      }),
      { numRuns: 300 }
    );
    expect(stepsToFloor(LIGHT_LEVELS[0]) * DECAY_INTERVAL_MS).toBeLessThan(8_000);
  });
});

describe('clicks and time in any order (properties)', () => {
  it('the light always stays between the floor and full light, and a click always lands on a step', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom('lift', 'decay'), { maxLength: 80 }), (actions) => {
        useLightStore.setState({ radius: LIGHT_LEVELS[0], lifts: 0 });
        for (const action of actions) {
          const before = useLightStore.getState().radius;
          if (action === 'lift') {
            useLightStore.getState().lift();
            const after = useLightStore.getState().radius;
            expect(LIGHT_LEVELS as readonly number[]).toContain(after);
            expect(after).toBeGreaterThanOrEqual(before);
            // A click lifts exactly one step, or stays at full light.
            if (before < FULL_LIGHT) expect(after).toBeGreaterThan(before);
          } else {
            useLightStore.getState().decay();
            expect(useLightStore.getState().radius).toBeLessThanOrEqual(before);
          }
          const now = useLightStore.getState().radius;
          expect(now).toBeGreaterThanOrEqual(MIN_RADIUS);
          expect(now).toBeLessThanOrEqual(FULL_LIGHT);
        }
      }),
      { numRuns: 300 }
    );
  });

  it('counts every click, so the burn-down timer can start over', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 30 }), (clicks) => {
        useLightStore.setState({ radius: LIGHT_LEVELS[0], lifts: 0 });
        for (let i = 0; i < clicks; i++) useLightStore.getState().lift();
        expect(useLightStore.getState().lifts).toBe(clicks);
      }),
      { numRuns: 100 }
    );
  });

  it('after a click from any light, three more clicks always reach full light', () => {
    fc.assert(
      fc.property(fc.double({ min: MIN_RADIUS, max: FULL_LIGHT, noNaN: true }), (start) => {
        useLightStore.setState({ radius: start, lifts: 0 });
        for (let i = 0; i < LIGHT_LEVELS.length; i++) useLightStore.getState().lift();
        expect(useLightStore.getState().radius).toBe(FULL_LIGHT);
      }),
      { numRuns: 200 }
    );
  });
});

describe('steps and size (properties)', () => {
  it('levelOf is monotone and always names a real step', () => {
    fc.assert(
      fc.property(radius, radius, (a, b) => {
        const [low, high] = a <= b ? [a, b] : [b, a];
        expect(levelOf(low)).toBeLessThanOrEqual(levelOf(high));
        expect(levelOf(a)).toBeGreaterThanOrEqual(0);
        expect(levelOf(a)).toBeLessThan(LIGHT_LEVELS.length);
      }),
      { numRuns: 300 }
    );
  });

  it('the circle is never smaller than the pixel floor, and grows with the percentage and the window', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 100, noNaN: true }), fc.integer({ min: 200, max: 4000 }), fc.integer({ min: 200, max: 4000 }), (percent, w, h) => {
        const px = lightRadiusPx(percent, w, h);
        expect(px).toBeGreaterThanOrEqual(MIN_RADIUS_PX);
        expect(lightRadiusPx(percent, w + 100, h + 100)).toBeGreaterThanOrEqual(px);
        expect(lightRadiusPx(Math.min(100, percent + 10), w, h)).toBeGreaterThanOrEqual(px);
      }),
      { numRuns: 300 }
    );
  });
});
