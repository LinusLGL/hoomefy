/**
 * Stage Two anomalies: small, non-blocking signs that something is wrong.
 *
 * `ANOMALIES` is declarative (id + scroll progress + action). `pickAnomaly` is a
 * pure scheduler, so the rules can be tested without a DOM:
 *   - each anomaly runs at most once per page session,
 *   - at most one per call, never closer than MIN_GAP_MS to the previous one,
 *   - if the visitor jumps far down the page, older anomalies are marked as shown
 *     (skipped) rather than replayed in a burst.
 */

import { gsap } from 'gsap';
import { registry, selectDistortTargets } from './registry';
import { flashShadow } from './shadowEffects';
import { getScene } from './scenes';
import type { OverlayHandle } from './RealityDistortionOverlay';

export const MIN_GAP_MS = 1500;

export interface AnomalyContext {
  overlay: OverlayHandle;
  mobile: boolean;
}

export interface Anomaly {
  id: string;
  /** Scroll progress (0..1, toward the reveal section) at which it becomes due. */
  at: number;
  run: (ctx: AnomalyContext) => void;
}

export const WHISPERS = ["Something isn't right.", "You're not alone.", 'The house remembers you.'] as const;

function momentaryWarp(overlay: OverlayHandle, scale: number, ms: number, mobile: boolean) {
  const targets = selectDistortTargets(document, mobile ? 1 : 2);
  gsap.set(targets, { filter: 'url(#hf-warp) url(#hf-chromatic)' });
  overlay.setWarp(scale, 0.004, 0.04);
  overlay.setChroma(3);
  window.setTimeout(() => {
    overlay.setWarp(0);
    overlay.setChroma(0);
    gsap.set(targets, { clearProps: 'filter' });
  }, ms);
}

function shiftHeading() {
  const chars = Array.from(document.querySelectorAll<HTMLElement>('[data-hero-heading] .hf-ch, [data-hero-sub] .hf-ch')).slice(0, 80);
  if (!chars.length) return;
  gsap.set(chars, { x: () => gsap.utils.random(-3, 3), y: () => gsap.utils.random(-1, 1) });
  window.setTimeout(() => gsap.set(chars, { clearProps: 'transform' }), 130);
}

function photoSwap() {
  const hero = registry.scenes.get('hero');
  if (!hero) return;
  const canvasW = 1280;
  const canvasH = 800;
  // Keep whatever the Elegant hero really shows (the photo), so the anomaly never swaps it for a painting.
  const base = hero.getFrom?.() ?? getScene('room', canvasW, canvasH);
  hero.handle.setImages(base, getScene('abandoned', canvasW, canvasH));
  hero.handle.set({ progress: 0.94, distort: 0.35, split: 0.006 });
  window.setTimeout(() => {
    hero.handle.set({ progress: 0, distort: 0, split: 0 });
    hero.handle.setImages(base, getScene('mansion', canvasW, canvasH));
  }, 170);
}

export const ANOMALIES: Anomaly[] = [
  { id: 'text-shift', at: 0.08, run: () => shiftHeading() },
  {
    id: 'image-shadow',
    at: 0.16,
    run: () => {
      const s = document.querySelector<HTMLElement>('[data-hero-frame] [data-hf-shadow]');
      if (s) flashShadow(s, { peak: 0.62, ms: 240 });
    },
  },
  { id: 'whisper-1', at: 0.22, run: ({ overlay }) => overlay.whisper(WHISPERS[0]) },
  {
    id: 'tear',
    at: 0.3,
    run: ({ overlay, mobile }) => {
      overlay.tear.burst(3, 160, 0.4);
      momentaryWarp(overlay, 14, 240, mobile);
    },
  },
  { id: 'photo-swap', at: 0.38, run: () => photoSwap() },
  { id: 'bell', at: 0.46, run: ({ overlay }) => void overlay.bell(260) },
  { id: 'whisper-2', at: 0.52, run: ({ overlay }) => overlay.whisper(WHISPERS[1]) },
  { id: 'fluorescent', at: 0.6, run: ({ overlay }) => void overlay.fluorescent(260) },
  {
    id: 'card-silhouette',
    at: 0.68,
    run: () => {
      const s = document.querySelector<HTMLElement>('[data-card-shadow] [data-hf-shadow], [data-card-shadow][data-hf-shadow]');
      if (s) flashShadow(s, { peak: 0.5, ms: 300 });
    },
  },
  { id: 'whisper-3', at: 0.76, run: ({ overlay }) => overlay.whisper(WHISPERS[2]) },
];

/**
 * If an anomaly is due but the minimum gap has not elapsed, how many ms until it may run.
 * Null when nothing is waiting. Lets the director retry after the gap even if the visitor
 * stops scrolling, so a due anomaly is delayed rather than lost.
 */
export function pendingDelay(
  progress: number,
  shown: ReadonlySet<string>,
  lastRunAt: number,
  now: number,
  list: readonly Anomaly[] = ANOMALIES
): number | null {
  const elapsed = now - lastRunAt;
  if (elapsed >= MIN_GAP_MS) return null;
  const hasDue = list.some((a) => a.at <= progress && !shown.has(a.id));
  return hasDue ? MIN_GAP_MS - elapsed : null;
}

/**
 * Choose the anomaly to run now, or null. Mutates `shown` (adds ids).
 * `lastRunAt` is the timestamp of the previous anomaly (ms), `now` the current time.
 */
export function pickAnomaly(
  progress: number,
  shown: Set<string>,
  lastRunAt: number,
  now: number,
  list: readonly Anomaly[] = ANOMALIES
): Anomaly | null {
  if (now - lastRunAt < MIN_GAP_MS) return null;
  const due = list.filter((a) => a.at <= progress && !shown.has(a.id));
  if (!due.length) return null;
  // Latest due wins; anything older that was passed over is considered skipped.
  const chosen = due[due.length - 1];
  due.forEach((a) => shown.add(a.id));
  return chosen;
}
