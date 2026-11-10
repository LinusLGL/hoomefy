/**
 * Candlelight: the dark room and the circle of light around the candle.
 *
 * The page is dimmed to DARKNESS_ALPHA (80% dark). Around the flame there is a circle that is
 * 100% clear in the middle and fades to the full darkness at its edge. Its radius is a
 * percentage of the SHORTER side of the window, so it looks the same on a wide or a tall screen.
 *
 *   - It starts at 30%.
 *   - Every click lifts it one step: 30% -> 50% -> 80% -> 100%. At 100% the whole room is lit.
 *     Driving a spirit out of a room (a completed generation) lifts it one step as well.
 *   - Every DECAY_INTERVAL_MS (3.3 seconds) the candle burns lower: the radius shrinks by 10% of itself, but never
 *     below MIN_RADIUS so the page always stays usable. A lift starts the wait over. From the first light
 *     (30%) the floor is reached after nine steps, about 30 seconds; the jumpscare follows 12 seconds later.
 *
 * Everything here is pure so it can be tuned and unit tested without a browser.
 */

import { create } from 'zustand';

/** Radius steps, in percent of the shorter window side. */
export const LIGHT_LEVELS = [30, 50, 80, 100] as const;
/** At or above this radius the whole room is lit (no darkness at all). */
export const FULL_LIGHT = 100;
/** The candle never burns lower than this, so the interface stays reachable. A very dim, small circle. */
export const MIN_RADIUS = 12;
/** Each tick the radius becomes this fraction of itself (a 10% reduction). */
export const DECAY_FACTOR = 0.9;
/** One tick of burning down. It was 5000 ms; the candle now dims 50% faster (5000 / 1.5). */
export const DECAY_INTERVAL_MS = 3333;
/** How dark the room is outside the light (0.8 = 80% dark). */
export const DARKNESS_ALPHA = 0.8;
/** Smallest radius in pixels, for very small windows. */
export const MIN_RADIUS_PX = 72;

/** Two clicks closer together than this count as one, so a double-click cannot skip a step. */
export const CLICK_THROTTLE_MS = 250;

export const clampLevel = (level: number): number => Math.max(0, Math.min(LIGHT_LEVELS.length - 1, level));

/**
 * The step the light is on, or burning down from: the first step at or above the radius.
 * 30 and 27 are step 0, 50 and 45 are step 1, 100 and 90 are step 3.
 */
export function levelOf(radius: number): number {
  const index = LIGHT_LEVELS.findIndex((step) => step >= radius - 1e-6);
  return index === -1 ? LIGHT_LEVELS.length - 1 : index;
}

/** The radius after one burn-down step. */
export function decayedRadius(radius: number): number {
  return Math.max(MIN_RADIUS, radius * DECAY_FACTOR);
}

/** The flame's glow grows with the light: 15% -> 0.88, 30% -> 1, 100% -> 1.6. */
export function glowScale(radius: number): number {
  return 0.75 + (radius / 100) * 0.85;
}

/** Radius in pixels for a percentage of the shorter window side. */
export function lightRadiusPx(percent: number, width: number, height: number): number {
  return Math.max(MIN_RADIUS_PX, (percent / 100) * Math.min(width, height));
}

interface LightState {
  /** Current radius in percent; falls as the candle burns, jumps up a step on a click or a clear. */
  radius: number;
  /** Counts lifts, so the burn-down timer can start over after each one. */
  lifts: number;
  lift: () => void;
  decay: () => void;
  reset: () => void;
}

export const useLightStore = create<LightState>()((set, get) => ({
  radius: LIGHT_LEVELS[0],
  lifts: 0,

  lift: () => {
    const level = clampLevel(levelOf(get().radius) + 1);
    set({ radius: LIGHT_LEVELS[level], lifts: get().lifts + 1 });
  },

  decay: () => set({ radius: decayedRadius(get().radius) }),

  reset: () => set({ radius: LIGHT_LEVELS[0], lifts: get().lifts + 1 }),
}));
