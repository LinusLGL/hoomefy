/**
 * Animations for ParanormalShadow elements (kept apart from the component so the
 * component file only exports a component, which Fast Refresh requires).
 */

import { useEffect } from 'react';
import { gsap } from 'gsap';

/** Appear for a moment and vanish. Returns the tween so callers can kill it. */
export function flashShadow(el: HTMLElement, opts: { peak?: number; ms?: number } = {}): gsap.core.Tween {
  const { peak = 0.7, ms = 340 } = opts;
  gsap.killTweensOf(el);
  return gsap.fromTo(
    el,
    { opacity: 0, x: -6 },
    { opacity: peak, x: 4, duration: 0.06, ease: 'steps(2)', yoyo: true, repeat: 1, repeatDelay: ms / 1000 }
  );
}

/** Drift across the viewport left to right. */
export function crossShadow(el: HTMLElement, durationS = 2.4): gsap.core.Tween {
  gsap.killTweensOf(el);
  return gsap.fromTo(
    el,
    { opacity: 0, xPercent: -60, left: '0%' },
    {
      keyframes: [
        { opacity: 0.85, duration: 0.3, ease: 'power1.out' },
        { opacity: 0.85, duration: durationS - 0.7 },
        { opacity: 0, duration: 0.4, ease: 'power1.in' },
      ],
      left: '100%',
      xPercent: -40,
      duration: durationS,
      ease: 'none',
    }
  );
}

/** Reveal a faint presence while the pointer or keyboard focus rests on `target`. */
export function useLurkOnHover(
  target: React.RefObject<HTMLElement>,
  shadow: React.RefObject<HTMLElement>,
  enabled = true
): void {
  useEffect(() => {
    const host = target.current;
    const sh = shadow.current;
    if (!host || !sh || !enabled) return undefined;
    const enter = () => {
      gsap.killTweensOf(sh);
      gsap.to(sh, { opacity: 0.42, x: 10, duration: 1.1, ease: 'power2.out' });
    };
    const leave = () => {
      gsap.killTweensOf(sh);
      gsap.to(sh, { opacity: 0, x: 0, duration: 0.6, ease: 'power2.in' });
    };
    host.addEventListener('pointerenter', enter);
    host.addEventListener('pointerleave', leave);
    host.addEventListener('focusin', enter);
    host.addEventListener('focusout', leave);
    return () => {
      host.removeEventListener('pointerenter', enter);
      host.removeEventListener('pointerleave', leave);
      host.removeEventListener('focusin', enter);
      host.removeEventListener('focusout', leave);
      gsap.killTweensOf(sh);
    };
  }, [target, shadow, enabled]);
}
