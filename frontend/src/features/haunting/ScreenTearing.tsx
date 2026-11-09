/**
 * ScreenTearing
 *
 * A stack of full-width horizontal strips. Each strip is a `clip-path` slice that
 * shows a displaced fragment of mansion imagery (a duplicated segment) with a
 * red or cyan fringe. `burst()` re-randomises and flashes them for a few
 * frames, which reads as the screen tearing apart.
 *
 * Decorative only: `aria-hidden`, `pointer-events: none`.
 */

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { getScene } from './scenes';
import { isMobileLike } from './env';

export interface TearingHandle {
  /** Flash `count` strips for `ms` milliseconds with the given strength (0..1). */
  burst: (count?: number, ms?: number, strength?: number) => void;
  clear: () => void;
}

interface Props {
  strips?: number;
}

export const ScreenTearing = forwardRef<TearingHandle, Props>(function ScreenTearing({ strips }, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<string>('');
  const total = useMemo(() => strips ?? (isMobileLike() ? 5 : 12), [strips]);

  const ensureBackground = () => {
    if (bgRef.current) return bgRef.current;
    try {
      bgRef.current = getScene('mansion', 640, 400).toDataURL('image/jpeg', 0.55);
    } catch {
      bgRef.current = '';
    }
    return bgRef.current;
  };

  useImperativeHandle(ref, () => ({
    burst: (count = 6, ms = 220, strength = 1) => {
      const root = rootRef.current;
      if (!root) return;
      const els = Array.from(root.children) as HTMLElement[];
      const bg = ensureBackground();
      const pool = gsap.utils.shuffle([...els]).slice(0, Math.min(count, els.length));
      pool.forEach((el, i) => {
        const top = Math.random() * 92;
        const height = 1.5 + Math.random() * (4 + 8 * strength);
        const shift = (Math.random() - 0.5) * 36 * strength;
        const useImage = i % 3 !== 2;
        gsap.killTweensOf(el);
        gsap.set(el, {
          top: `${top}%`,
          height: `${height}%`,
          xPercent: shift,
          opacity: 0,
          backgroundImage: useImage && bg ? `url(${bg})` : 'none',
          backgroundSize: '100vw 100vh',
          backgroundPosition: `${(Math.random() - 0.5) * 40}vw ${-top}vh`,
          backgroundColor: useImage ? 'transparent' : i % 2 ? 'rgba(157,32,40,0.55)' : 'rgba(70,180,170,0.38)',
          mixBlendMode: useImage ? 'normal' : 'screen',
        });
        gsap.to(el, {
          opacity: 0.55 + Math.random() * 0.4 * strength,
          duration: 0.03,
          delay: Math.random() * (ms / 1000) * 0.5,
          ease: 'steps(1)',
          onComplete: () => {
            gsap.to(el, {
              opacity: 0,
              duration: 0.02,
              delay: 0.04 + Math.random() * (ms / 1000) * 0.6,
              ease: 'steps(1)',
            });
          },
        });
      });
    },
    clear: () => {
      const root = rootRef.current;
      if (!root) return;
      gsap.killTweensOf(root.children);
      gsap.set(root.children, { opacity: 0 });
    },
  }));

  // Kill any in-flight strip tweens on unmount.
  useEffect(() => {
    const root = rootRef.current;
    return () => {
      if (root) gsap.killTweensOf(root.children);
    };
  }, []);

  return (
    <div ref={rootRef} className="hf-tearing" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="hf-strip" />
      ))}
    </div>
  );
});
