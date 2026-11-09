/**
 * CandleCursor
 *
 * Replaces the system cursor with a lit candle in the Haunted experience. The
 * FLAME is the pointer position. A warm additive glow (screen blend) follows it, so
 * it never darkens text.
 *
 * With `darkness` on, the room is 80% dark and the candle lights a circle around the
 * flame (see candleLight.ts for how that circle grows and burns down).
 *
 * - Mouse/pen only. Touch pointers are ignored and the component is not mounted on
 *   touch devices (see HauntedExperienceProvider).
 * - The native cursor is only hidden once the candle has actually appeared (after the
 *   first mouse move), so the pointer is never missing while the candle is not drawn.
 * - What is under the pointer is re-checked a few times a second, so the candle recovers
 *   when the element beneath it changes without the mouse moving (a form that submits,
 *   a page that changes).
 * - A click flares the flame, and the glow around it grows and shrinks with the light.
 * - The flame grows over interactive elements (`data-hot`).
 * - Text fields keep the native I-beam and the candle hides (`data-text`).
 * - Keyboard navigation moves the light to the focused control, so Tab never lands in the dark.
 * - `prefers-reduced-motion`: no flicker animation and no easing lag.
 * - `html[data-candle="on"]` (set here, removed on unmount) is what hides the native cursor,
 *   so if this component is not mounted the normal cursor is always available.
 *
 * Decorative: `aria-hidden`, `pointer-events: none`. All listeners, the interval and the
 * rAF loop are released on unmount.
 */

import { useEffect, useRef, type CSSProperties } from 'react';
import { useHauntingEnv } from './hauntingEnvContext';
import { useCandleLight } from './useCandleLight';

const INTERACTIVE =
  'a[href], button, [role="button"], [role="tab"], [role="slider"], summary, label[for], select, input[type="checkbox"], input[type="radio"], input[type="range"], input[type="file"], [tabindex]:not([tabindex="-1"])';
const TEXT_FIELD =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="button"]):not([type="submit"]), textarea, [contenteditable="true"]';

/** How often the element under a still pointer is re-checked. */
const RECHECK_MS = 300;

interface CandleCursorProps {
  /** Darken the room except for the candle's circle of light. */
  darkness?: boolean;
}

export function CandleCursor({ darkness = false }: CandleCursorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  // Survives effect re-runs (reduced-motion or darkness toggled) so the candle does not jump.
  const last = useRef({ x: 0, y: 0, seen: false });
  const { reducedMotion } = useHauntingEnv();
  const light = useCandleLight(darkness);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const lightEl = lightRef.current;
    const root = document.documentElement;

    let targetX = last.current.x;
    let targetY = last.current.y;
    let x = targetX;
    let y = targetY;
    let raf = 0;
    let visible = false;
    let keyboardNav = false;
    let focusPoint: { x: number; y: number } | null = null;

    const setLight = (px: number, py: number) => {
      if (!lightEl) return;
      lightEl.style.setProperty('--hf-lx', `${px}px`);
      lightEl.style.setProperty('--hf-ly', `${py}px`);
    };
    const place = () => {
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      setLight(focusPoint ? focusPoint.x : x, focusPoint ? focusPoint.y : y);
      last.current = { x, y, seen: true };
    };
    const loop = () => {
      raf = 0;
      x += (targetX - x) * 0.4;
      y += (targetY - y) * 0.4;
      const settled = Math.abs(targetX - x) <= 0.4 && Math.abs(targetY - y) <= 0.4;
      if (settled) {
        x = targetX;
        y = targetY;
      }
      place();
      if (!settled) raf = requestAnimationFrame(loop);
    };

    const show = (v: boolean) => {
      visible = v;
      el.dataset.visible = v ? 'true' : 'false';
      // Hide the system cursor only while the candle is really drawn.
      if (v) root.dataset.candle = 'on';
    };

    const classify = (target: Element | null) => {
      el.dataset.hot = target?.closest(INTERACTIVE) ? 'true' : 'false';
      el.dataset.text = target?.closest(TEXT_FIELD) ? 'true' : 'false';
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      keyboardNav = false;
      focusPoint = null;
      targetX = e.clientX;
      targetY = e.clientY;
      if (!visible) {
        x = targetX;
        y = targetY;
        show(true);
        place();
      }
      if (reducedMotion) {
        x = targetX;
        y = targetY;
        place();
      } else if (!raf) {
        raf = requestAnimationFrame(loop);
      }
    };

    const onOver = (e: PointerEvent) => classify(e.target instanceof Element ? e.target : null);
    const onLeave = () => show(false);
    const onEnter = () => {
      if (last.current.seen) show(true);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key.startsWith('Arrow')) keyboardNav = true;
    };
    const onFocusIn = (e: FocusEvent) => {
      if (!keyboardNav || !lightEl || !(e.target instanceof HTMLElement)) return;
      const rect = e.target.getBoundingClientRect();
      focusPoint = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      setLight(focusPoint.x, focusPoint.y);
    };

    // A click makes the flame flare up for a moment (the light itself is lifted in useCandleLight).
    let flareTimer = 0;
    const onClick = () => {
      el.dataset.flare = 'true';
      window.clearTimeout(flareTimer);
      flareTimer = window.setTimeout(() => {
        el.dataset.flare = 'false';
      }, 380);
    };

    // The element under a still pointer can change (a form submits, a route changes) without
    // any pointer event; re-check so the candle never stays hidden or hot by mistake.
    const recheck = window.setInterval(() => {
      if (!visible || typeof document.elementFromPoint !== 'function') return;
      classify(document.elementFromPoint(targetX, targetY));
    }, RECHECK_MS);

    // Restore a previous position (effect re-run), or start the light in the middle of the room.
    if (last.current.seen) {
      show(true);
      place();
    } else {
      setLight(window.innerWidth / 2, window.innerHeight / 2);
    }

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerover', onOver, { passive: true });
    document.addEventListener('keydown', onKeyDown, { passive: true });
    document.addEventListener('focusin', onFocusIn, { passive: true });
    root.addEventListener('mouseleave', onLeave);
    root.addEventListener('mouseenter', onEnter);
    if (darkness) document.addEventListener('click', onClick, { capture: true, passive: true });

    return () => {
      document.removeEventListener('click', onClick, { capture: true });
      window.clearTimeout(flareTimer);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('mouseleave', onLeave);
      root.removeEventListener('mouseenter', onEnter);
      window.clearInterval(recheck);
      if (raf) cancelAnimationFrame(raf);
      delete root.dataset.candle;
    };
  }, [reducedMotion, darkness]);

  return (
    <>
      {darkness && (
        <div
          ref={lightRef}
          className="hf-candlelight"
          aria-hidden="true"
          data-testid="candle-light"
          data-lit={light.lit ? 'true' : 'false'}
          data-level={light.level}
          data-radius={Math.round(light.radius * 10) / 10}
          style={{ '--hf-light-r': `${Math.round(light.radiusPx)}px` } as CSSProperties}
        />
      )}
      <div
        ref={ref}
        className="hf-candle"
        aria-hidden="true"
        data-testid="candle-cursor"
        data-visible="false"
        data-hot="false"
        data-text="false"
        data-flare="false"
        style={darkness ? ({ '--hf-glow': light.glow.toFixed(2) } as CSSProperties) : undefined}
      >
        <div className="hf-candle__halo" />
        <svg className="hf-candle__svg" viewBox="0 0 40 84" width="40" height="84" focusable="false">
          <defs>
            <linearGradient id="hf-wax" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#a89a80" />
              <stop offset="0.5" stopColor="#f1e6cc" />
              <stop offset="1" stopColor="#b3a589" />
            </linearGradient>
            <radialGradient id="hf-flame" cx="50%" cy="68%" r="62%">
              <stop offset="0" stopColor="#fffbe6" />
              <stop offset="0.45" stopColor="#ffc860" />
              <stop offset="1" stopColor="#ff7a1c" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g className="hf-candle__body">
            <rect x="15" y="28" width="10" height="50" rx="1.5" fill="url(#hf-wax)" />
            <ellipse cx="20" cy="28" rx="5" ry="1.6" fill="#f6ecd2" />
            <path d="M15 40 q-1 6 0 9 q1.5 2 2 -1 l0 -8z" fill="#f1e6cc" opacity="0.9" />
            <rect x="11" y="77" width="18" height="4" rx="2" fill="#b9904a" />
            <path d="M20 28 v-5" stroke="#1a100a" strokeWidth="1.2" />
          </g>
          <g className="hf-candle__flame">
            <path d="M20 4 C25 11 26.5 16 24.5 21 C23.5 23.6 21.8 24.8 20 24.8 C18.2 24.8 16.5 23.6 15.5 21 C13.5 16 15 11 20 4Z" fill="url(#hf-flame)" />
            <ellipse cx="20" cy="20.5" rx="2.2" ry="3.6" fill="#fff6d0" opacity="0.9" />
          </g>
        </svg>
      </div>
    </>
  );
}
