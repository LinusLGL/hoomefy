/**
 * Environment helpers shared by the haunting engine.
 */

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
export const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';
export const COARSE_POINTER_QUERY = '(pointer: coarse), (max-width: 767px)';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.(REDUCED_MOTION_QUERY).matches;
}

export function isMobileLike(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.(COARSE_POINTER_QUERY).matches;
}

/**
 * Flash budget: no more than 3 full-screen flashes in any rolling second,
 * and never above `maxAlpha`. Keeps the sequence clear of photosensitivity
 * thresholds. Pure and clock-injectable so it can be unit tested.
 */
export class FlashBudget {
  private stamps: number[] = [];

  constructor(
    private readonly now: () => number = () => performance.now(),
    readonly maxPerSecond = 3,
    readonly maxAlpha = 0.28
  ) {}

  /** Returns the alpha to use (clamped), or 0 when the budget is spent. */
  request(alpha: number): number {
    const t = this.now();
    this.stamps = this.stamps.filter((s) => t - s < 1000);
    if (this.stamps.length >= this.maxPerSecond) return 0;
    this.stamps.push(t);
    return Math.min(alpha, this.maxAlpha);
  }
}

export const flashBudget = new FlashBudget();

/** Deterministic PRNG (mulberry32) so generated art and tests are repeatable. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
