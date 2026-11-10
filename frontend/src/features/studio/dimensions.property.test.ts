/**
 * Property-based tests for the sizes sent to the image model (spec .kiro/specs/hoomefy, generation requirements).
 *
 * The model (and the Worker in front of it) refuses any width or height that is not a multiple of 8 between 256 and
 * 1024, and a photograph can have any size at all, including a broken one. These must hold for every size.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { MODEL_MAX, MODEL_MIN, MODEL_STEP, fitToModelSize } from './dimensions';
import { MAX_SIDE, MIN_SIDE } from '../../../worker/redesign';

const side = fc.oneof(fc.integer({ min: 1, max: 20_000 }), fc.double({ min: 0.01, max: 20_000, noNaN: true }));
const anything = fc.oneof(side, fc.constantFrom(0, -1, NaN, Infinity, -Infinity));

describe('fitToModelSize (properties)', () => {
  it('always returns sides the model and the Worker accept, whatever size comes in', () => {
    fc.assert(
      fc.property(anything, anything, (w, h) => {
        const size = fitToModelSize(w, h);
        for (const value of [size.width, size.height]) {
          expect(Number.isInteger(value)).toBe(true);
          expect(value % MODEL_STEP).toBe(0);
          expect(value).toBeGreaterThanOrEqual(MODEL_MIN);
          expect(value).toBeLessThanOrEqual(MODEL_MAX);
          // The same limits the Worker enforces on the backup route.
          expect(value).toBeGreaterThanOrEqual(MIN_SIDE);
          expect(value).toBeLessThanOrEqual(MAX_SIDE);
        }
      }),
      { numRuns: 1000 }
    );
  });

  it('never makes a photograph bigger than it is', () => {
    fc.assert(
      fc.property(fc.integer({ min: MODEL_MIN, max: MODEL_MAX }), fc.integer({ min: MODEL_MIN, max: MODEL_MAX }), (w, h) => {
        const size = fitToModelSize(w, h);
        // Rounding to a multiple of 8 can add at most 4 pixels.
        expect(size.width).toBeLessThanOrEqual(w + MODEL_STEP / 2);
        expect(size.height).toBeLessThanOrEqual(h + MODEL_STEP / 2);
      }),
      { numRuns: 500 }
    );
  });

  it('keeps the proportions of a large photograph to within the rounding', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1100, max: 12_000 }), fc.integer({ min: 1100, max: 12_000 }).filter((h) => h > 0), (w, h) => {
        // Beyond about 4:1 the short side would drop under the 256 pixel minimum and the model size can no longer keep
        // the proportions (the property found 4590 x 1100 turning into 1024 x 256). That limit is by design, so skip it.
        fc.pre(Math.max(w, h) / Math.min(w, h) <= 3.5);
        const size = fitToModelSize(w, h);
        // Both sides stay above the minimum here, so only rounding (4 px of 1024 at most) can change the ratio.
        const tolerance = 8 / Math.min(size.width, size.height) + 0.01;
        expect(Math.abs(size.width / size.height - w / h) / (w / h)).toBeLessThanOrEqual(tolerance);
      }),
      { numRuns: 500 }
    );
  });

  it('treats a size that is not a finite positive number as unknown, and gives the largest square', () => {
    fc.assert(
      fc.property(fc.constantFrom(0, -5, NaN, Infinity, -Infinity), side, (bad, ok) => {
        expect(fitToModelSize(bad, ok)).toEqual({ width: MODEL_MAX, height: MODEL_MAX });
        expect(fitToModelSize(ok, bad)).toEqual({ width: MODEL_MAX, height: MODEL_MAX });
      }),
      { numRuns: 100 }
    );
  });

  it('is the same for the same size', () => {
    fc.assert(fc.property(anything, anything, (w, h) => { expect(fitToModelSize(w, h)).toEqual(fitToModelSize(w, h)); }), { numRuns: 100 });
  });
});
