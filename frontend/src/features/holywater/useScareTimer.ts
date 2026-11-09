/**
 * The jumpscare timer.
 *
 * When the candle has burned down to its lowest light and stayed there for SCARE_AFTER_MS, the
 * jumpscare plays. It plays once per tab session. The countdown only runs while:
 *   - the candle is actually in use (`enabled`: Haunted, candle cursor and darkness on, a mouse),
 *   - nothing is in flight (an upload or generation is never interrupted),
 *   - the visitor has not collected the holy water, and has not been cured.
 * Any click that lifts the light, or a collected holy water, cancels the countdown.
 *
 * With reduced motion the video is skipped, but the scare still counts as spent.
 */

import { useEffect } from 'react';
import { MIN_RADIUS, useLightStore } from '@/features/haunting/candleLight';
import { useHauntingStore } from '@/features/haunting/hauntingStore';
import { useHolyWaterStore } from './holyWaterStore';

export const SCARE_AFTER_MS = 12_000;

/** True once the candle has burned all the way down. */
export const isAtFloor = (radius: number): boolean => radius <= MIN_RADIUS + 1e-6;

export function useScareTimer(enabled: boolean, reducedMotion: boolean): void {
  const radius = useLightStore((s) => s.radius);
  const busy = useHauntingStore((s) => s.busy);
  const scared = useHolyWaterStore((s) => s.scared);
  const foundIn = useHolyWaterStore((s) => s.foundIn);
  const cured = useHolyWaterStore((s) => s.cured);
  const video = useHolyWaterStore((s) => s.video);

  const counting = enabled && isAtFloor(radius) && !busy && !scared && !foundIn && !cured && video === 'none';

  useEffect(() => {
    if (!counting) return undefined;
    let id = 0;
    const arm = () => {
      id = window.setTimeout(fire, SCARE_AFTER_MS);
    };
    const fire = () => {
      // Nobody is looking at a hidden tab: wait for them to come back, then give it the full time again.
      if (document.hidden) {
        arm();
        return;
      }
      const store = useHolyWaterStore.getState();
      if (reducedMotion) store.markScared();
      else store.startScare();
    };
    arm();
    return () => window.clearTimeout(id);
  }, [counting, reducedMotion]);
}
