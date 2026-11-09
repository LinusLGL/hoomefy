/**
 * useCandleLight
 *
 * Drives the dark room while it is enabled:
 *   - every click lifts the light one step (a keyboard activation counts too, so people who
 *     do not use a mouse can brighten it); clicks closer than CLICK_THROTTLE_MS count once,
 *   - burns the candle down every DECAY_INTERVAL_MS (paused while the tab is hidden); each lift
 *     starts those seconds over, so a click is never followed by an instant shrink,
 *   - lifts the light one step each time a clear drives a spirit out of the active house,
 *   - starts again from the first step when a new house is begun.
 * Returns what the overlay needs to render.
 */

import { useEffect, useState } from 'react';
import { activeHouse, isHouseBuilt, useMansionStore, type House } from '@/features/mansion/mansionStore';
import { CLICK_THROTTLE_MS, DECAY_INTERVAL_MS, FULL_LIGHT, glowScale, levelOf, lightRadiusPx, useLightStore } from './candleLight';

/** Spirits still lingering across the whole house. */
export function lingeringSpirits(house: House): number {
  return Object.values(house.rooms).reduce((sum, room) => sum + (room?.spirits.length ?? 0), 0);
}

const readViewport = () => ({
  width: typeof window === 'undefined' ? 1280 : window.innerWidth,
  height: typeof window === 'undefined' ? 800 : window.innerHeight,
});

export interface CandleLightView {
  /** The step the light is on (0 = 30%, 3 = 100%). */
  level: number;
  /** Radius in percent of the shorter window side. */
  radius: number;
  radiusPx: number;
  /** How much the flame's glow is scaled; grows with the light. */
  glow: number;
  /** True when the room is fully lit (radius at 100%, or the house is built). */
  lit: boolean;
}

export function useCandleLight(enabled: boolean): CandleLightView {
  const radius = useLightStore((s) => s.radius);
  const lifts = useLightStore((s) => s.lifts);
  const houseBuilt = useMansionStore((s) => isHouseBuilt(activeHouse(s)));
  const [viewport, setViewport] = useState(readViewport);

  useEffect(() => {
    if (!enabled) return undefined;
    const onResize = () => setViewport(readViewport());
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [enabled]);

  // Burn down. `lifts` is a dependency on purpose: every lift restarts the interval.
  useEffect(() => {
    if (!enabled) return undefined;
    const id = window.setInterval(() => {
      if (!document.hidden) useLightStore.getState().decay();
    }, DECAY_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [enabled, lifts]);

  // A click brightens the light. Captured on the document so no handler can swallow it.
  useEffect(() => {
    if (!enabled) return undefined;
    let last = Number.NEGATIVE_INFINITY;
    const onClick = () => {
      const now = Date.now();
      if (now - last < CLICK_THROTTLE_MS) return;
      last = now;
      useLightStore.getState().lift();
    };
    document.addEventListener('click', onClick, { capture: true, passive: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    return useMansionStore.subscribe((state, previous) => {
      const house = activeHouse(state);
      const before = activeHouse(previous);
      if (house.id !== before.id) {
        useLightStore.getState().reset();
      } else if (lingeringSpirits(house) < lingeringSpirits(before)) {
        useLightStore.getState().lift();
      }
    });
  }, [enabled]);

  return {
    level: levelOf(radius),
    radius,
    radiusPx: lightRadiusPx(radius, viewport.width, viewport.height),
    glow: glowScale(radius),
    lit: houseBuilt || radius >= FULL_LIGHT,
  };
}
