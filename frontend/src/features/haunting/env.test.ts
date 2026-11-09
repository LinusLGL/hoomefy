import { describe, it, expect } from 'vitest';
import { FlashBudget, seeded } from './env';

describe('FlashBudget', () => {
  const make = () => {
    let t = 0;
    const budget = new FlashBudget(() => t);
    return { budget, advance: (ms: number) => (t += ms) };
  };

  it('allows at most 3 flashes in any rolling second', () => {
    const { budget, advance } = make();
    expect(budget.request(0.2)).toBeGreaterThan(0);
    advance(100);
    expect(budget.request(0.2)).toBeGreaterThan(0);
    advance(100);
    expect(budget.request(0.2)).toBeGreaterThan(0);
    advance(100);
    expect(budget.request(0.2)).toBe(0);
  });

  it('refills once the oldest flash leaves the 1 s window', () => {
    const { budget, advance } = make();
    budget.request(0.2);
    advance(300);
    budget.request(0.2);
    advance(300);
    budget.request(0.2);
    advance(100);
    expect(budget.request(0.2)).toBe(0);
    advance(301); // first flash is now > 1000 ms old
    expect(budget.request(0.2)).toBeGreaterThan(0);
  });

  it('never exceeds the alpha cap', () => {
    const { budget } = make();
    expect(budget.request(1)).toBe(budget.maxAlpha);
    expect(budget.maxAlpha).toBeLessThanOrEqual(0.3);
  });

  it('does not spend budget when rejecting', () => {
    const { budget, advance } = make();
    for (let i = 0; i < 3; i++) {
      budget.request(0.1);
      advance(10);
    }
    for (let i = 0; i < 5; i++) expect(budget.request(0.1)).toBe(0);
    advance(1000);
    expect(budget.request(0.1)).toBeGreaterThan(0);
  });
});

describe('seeded', () => {
  it('is deterministic and within [0, 1)', () => {
    const a = seeded(42);
    const b = seeded(42);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
    seqA.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    });
    expect(seeded(43)()).not.toBe(seqA[0]);
  });
});
