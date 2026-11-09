/**
 * ScrollHauntingDirector
 *
 * Rendered inside the home page. Uses GSAP ScrollTrigger to
 *  1. turn scroll progress toward the reveal section into Stage Two anomalies, and
 *  2. request the full takeover when the designated `[data-haunt-trigger]` section
 *     reaches the trigger line.
 *
 * Anomalies are skipped when horror is off, the site is already Haunted,
 * `prefers-reduced-motion` is set, the tab is hidden, or an upload / generation is
 * in flight. Every ScrollTrigger and timer is released on unmount.
 */

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useHauntingStore } from './hauntingStore';
import { registry, TRIGGER_ATTR } from './registry';
import { pendingDelay, pickAnomaly } from './anomalies';
import { isMobileLike, prefersReducedMotion } from './env';

gsap.registerPlugin(ScrollTrigger);

export function ScrollHauntingDirector() {
  useEffect(() => {
    const trigger = document.querySelector<HTMLElement>(`[${TRIGGER_ATTR}]`);
    if (!trigger) return undefined;

    const shown = new Set<string>();
    let lastRunAt = -Infinity;
    const mobile = isMobileLike();

    const canAnimate = () => {
      const s = useHauntingStore.getState();
      return s.horrorEnabled && s.experience === 'elegant' && s.sequence === 'idle' && !s.busy && !document.hidden && !prefersReducedMotion();
    };

    let progress = 0;
    let retry = 0;

    // Evaluate what (if anything) should run now; if one is due but rate-limited, retry once the
    // spacing rule expires so a visitor who pauses scrolling does not lose it.
    const attempt = () => {
      window.clearTimeout(retry);
      retry = 0;
      if (!canAnimate()) return;
      const overlay = registry.overlay;
      if (!overlay) return;
      const now = performance.now();
      const anomaly = pickAnomaly(progress, shown, lastRunAt, now);
      if (anomaly) {
        lastRunAt = now;
        anomaly.run({ overlay, mobile });
        return;
      }
      const wait = pendingDelay(progress, shown, lastRunAt, now);
      if (wait !== null) retry = window.setTimeout(attempt, wait + 25);
    };

    const ctx = gsap.context(() => {
      // Progress runs from the top of the page to the moment the reveal section is 60% up the viewport.
      ScrollTrigger.create({
        trigger: document.body,
        start: 'top top',
        endTrigger: trigger,
        end: 'top 60%',
        onUpdate: (self) => {
          progress = self.progress;
          attempt();
        },
      });

      ScrollTrigger.create({
        trigger,
        start: 'top 55%',
        onEnter: () => {
          useHauntingStore.getState().requestTakeover('scroll');
        },
      });
    });

    return () => {
      window.clearTimeout(retry);
      ctx.revert();
    };
  }, []);

  return null;
}
