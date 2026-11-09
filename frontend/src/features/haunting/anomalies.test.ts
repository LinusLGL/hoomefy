import { describe, it, expect, vi } from 'vitest';
import { ANOMALIES, MIN_GAP_MS, WHISPERS, pendingDelay, pickAnomaly, type Anomaly } from './anomalies';

const mk = (id: string, at: number): Anomaly => ({ id, at, run: vi.fn() });
const list = [mk('a', 0.1), mk('b', 0.3), mk('c', 0.6)];

describe('pickAnomaly', () => {
  it('returns nothing before the first threshold', () => {
    expect(pickAnomaly(0.05, new Set(), -Infinity, 10_000, list)).toBeNull();
  });

  it('runs each anomaly at most once', () => {
    const shown = new Set<string>();
    expect(pickAnomaly(0.15, shown, -Infinity, 10_000, list)?.id).toBe('a');
    expect(pickAnomaly(0.15, shown, 0, 20_000, list)).toBeNull();
  });

  it('enforces the minimum gap between anomalies', () => {
    const shown = new Set<string>();
    const t0 = 10_000;
    expect(pickAnomaly(0.15, shown, -Infinity, t0, list)?.id).toBe('a');
    expect(pickAnomaly(0.35, shown, t0, t0 + MIN_GAP_MS - 1, list)).toBeNull();
    expect(pickAnomaly(0.35, shown, t0, t0 + MIN_GAP_MS, list)?.id).toBe('b');
  });

  it('on a big scroll jump runs only the latest due anomaly and skips the older ones', () => {
    const shown = new Set<string>();
    expect(pickAnomaly(0.9, shown, -Infinity, 10_000, list)?.id).toBe('c');
    expect(shown).toEqual(new Set(['a', 'b', 'c']));
    expect(pickAnomaly(0.95, shown, 0, 99_999, list)).toBeNull();
  });
});

describe('pendingDelay (a rate-limited anomaly is delayed, not lost)', () => {
  it('is null when nothing is due', () => {
    expect(pendingDelay(0.05, new Set(), 0, 100, list)).toBeNull();
  });

  it('is null when the spacing rule has already expired (it can simply run)', () => {
    expect(pendingDelay(0.15, new Set(), 0, MIN_GAP_MS, list)).toBeNull();
  });

  it('returns the remaining wait when an anomaly is due but too soon after the last', () => {
    expect(pendingDelay(0.15, new Set(), 1000, 1500, list)).toBe(MIN_GAP_MS - 500);
  });

  it('ignores anomalies that have already been shown', () => {
    expect(pendingDelay(0.15, new Set(['a']), 1000, 1500, list)).toBeNull();
  });

  it('after waiting the returned delay, pickAnomaly yields the anomaly that was held back', () => {
    const shown = new Set<string>();
    const last = 10_000;
    const now = last + 400;
    expect(pickAnomaly(0.15, shown, last, now, list)).toBeNull();
    const wait = pendingDelay(0.15, shown, last, now, list)!;
    expect(pickAnomaly(0.15, shown, last, now + wait, list)?.id).toBe('a');
  });
});

describe('ANOMALIES catalogue', () => {
  it('covers every anomaly type in the brief', () => {
    const ids = ANOMALIES.map((a) => a.id);
    for (const expected of ['text-shift', 'image-shadow', 'tear', 'photo-swap', 'bell', 'fluorescent', 'card-silhouette']) {
      expect(ids).toContain(expected);
    }
    expect(ids.filter((id) => id.startsWith('whisper')).length).toBe(3);
  });

  it('has unique ids and strictly increasing thresholds inside (0, 1)', () => {
    expect(new Set(ANOMALIES.map((a) => a.id)).size).toBe(ANOMALIES.length);
    ANOMALIES.forEach((a, i) => {
      expect(a.at).toBeGreaterThan(0);
      expect(a.at).toBeLessThan(1);
      if (i > 0) expect(a.at).toBeGreaterThan(ANOMALIES[i - 1].at);
    });
  });

  it('uses the mansion whisper messages', () => {
    expect([...WHISPERS]).toEqual(["Something isn't right.", "You're not alone.", 'The house remembers you.']);
  });
});
