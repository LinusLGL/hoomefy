/**
 * RealityDistortionOverlay
 *
 * Fixed, pointer-transparent layer that hosts everything the takeover draws on top
 * of the real page:
 *  - the SVG filters (`#hf-warp` = feTurbulence + feDisplacementMap, `#hf-chromatic`)
 *    that the controller applies to the real, visible UI elements;
 *  - scanline interference, a veil, mansion-imagery flash frames, screen tearing;
 *  - the crossing shadow, the "YOU SHOULDN'T BE HERE." message, the final reveal
 *    and the whisper line used by Stage Two anomalies.
 *
 * Everything is decorative (`aria-hidden`). It never captures pointer events, so
 * navigation, uploads and every button underneath remain operable.
 */

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Bell } from 'lucide-react';
import { gsap } from 'gsap';
import { ChromaticAberrationEffect, type ChromaticHandle } from './ChromaticAberrationEffect';
import { ScreenTearing, type TearingHandle } from './ScreenTearing';
import { ParanormalShadow } from './ParanormalShadow';
import { GlitchText } from './GlitchText';
import { getScene, type SceneName } from './scenes';
import { flashBudget } from './env';
import { registerOverlay } from './registry';

export const WARP_FILTER_ID = 'hf-warp';

export interface OverlayElements {
  root: HTMLDivElement;
  scan: HTMLDivElement;
  flash: HTMLCanvasElement;
  veil: HTMLDivElement;
  tint: HTMLDivElement;
  message: HTMLDivElement;
  reveal: HTMLDivElement;
  revealHeadline: HTMLElement;
  revealSub: HTMLElement;
  revealLogo: HTMLElement;
  whisper: HTMLDivElement;
  shadow: HTMLDivElement;
}

export interface OverlayHandle {
  /** displacement scale in px and turbulence base frequency */
  setWarp: (scale: number, freqX?: number, freqY?: number) => void;
  reseed: (seed: number) => void;
  setChroma: (px: number, verticalPx?: number) => void;
  tear: TearingHandle;
  /** Flash a still of mansion imagery. Returns false when the flash budget is spent. */
  flashScene: (scene: SceneName, alpha: number, ms: number) => boolean;
  /** Cold moonlight tint pulse. */
  fluorescent: (ms?: number) => boolean;
  whisper: (text: string, ms?: number) => void;
  /** Flash the servants'-bell glyph for a fraction of a second. */
  bell: (ms?: number) => boolean;
  /** Return every layer to its resting (invisible) state. */
  reset: () => void;
  elements: () => OverlayElements | null;
}

export const RealityDistortionOverlay = forwardRef<OverlayHandle>(function RealityDistortionOverlay(_props, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLCanvasElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const tintRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const whisperRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const glyphRef = useRef<HTMLDivElement>(null);
  const turbRef = useRef<SVGFETurbulenceElement>(null);
  const dispRef = useRef<SVGFEDisplacementMapElement>(null);
  const chromaRef = useRef<ChromaticHandle>(null);
  const tearRef = useRef<TearingHandle>(null);

  const handle: OverlayHandle = {
    setWarp: (scale, freqX = 0.004, freqY = 0.03) => {
      dispRef.current?.setAttribute('scale', String(scale));
      turbRef.current?.setAttribute('baseFrequency', `${freqX} ${freqY}`);
    },
    reseed: (seed) => turbRef.current?.setAttribute('seed', String(Math.round(seed))),
    setChroma: (px, v) => chromaRef.current?.setOffset(px, v),
    tear: {
      burst: (...args) => tearRef.current?.burst(...args),
      clear: () => tearRef.current?.clear(),
    },
    flashScene: (scene, alpha, ms) => {
      const canvas = flashRef.current;
      if (!canvas) return false;
      const a = flashBudget.request(alpha);
      if (a <= 0) return false;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      ctx.drawImage(getScene(scene, canvas.width, canvas.height), 0, 0, canvas.width, canvas.height);
      gsap.killTweensOf(canvas);
      gsap.fromTo(canvas, { opacity: a }, { opacity: 0, duration: ms / 1000, ease: 'steps(3)' });
      return true;
    },
    fluorescent: (ms = 220) => {
      const tint = tintRef.current;
      if (!tint) return false;
      const a = flashBudget.request(0.2);
      if (a <= 0) return false;
      gsap.killTweensOf(tint);
      gsap.fromTo(tint, { opacity: a }, { opacity: 0, duration: ms / 1000, ease: 'steps(4)' });
      return true;
    },
    bell: (ms = 260) => {
      const g = glyphRef.current;
      if (!g) return false;
      const a = flashBudget.request(0.6);
      if (a <= 0) return false;
      gsap.killTweensOf(g);
      gsap.fromTo(g, { opacity: a, scale: 1.08 }, { opacity: 0, scale: 1, duration: ms / 1000, ease: 'steps(3)' });
      return true;
    },
    whisper: (text, ms = 2600) => {
      const el = whisperRef.current;
      if (!el) return;
      el.textContent = text;
      const left = 6 + Math.random() * 52;
      const top = 18 + Math.random() * 60;
      gsap.killTweensOf(el);
      gsap.set(el, { left: `${left}%`, top: `${top}%` });
      gsap.fromTo(
        el,
        { opacity: 0, y: 6 },
        {
          keyframes: [
            { opacity: 0.85, y: 0, duration: 0.5, ease: 'power1.out' },
            { opacity: 0.85, duration: ms / 1000 - 1.2 },
            { opacity: 0, duration: 0.7, ease: 'power1.in' },
          ],
        }
      );
    },
    reset: () => {
      const els = [scanRef.current, flashRef.current, veilRef.current, tintRef.current, messageRef.current, revealRef.current, whisperRef.current, shadowRef.current, glyphRef.current];
      els.forEach((e) => {
        if (e) {
          gsap.killTweensOf(e);
          gsap.set(e, { opacity: 0 });
        }
      });
      tearRef.current?.clear();
      dispRef.current?.setAttribute('scale', '0');
      chromaRef.current?.setOffset(0, 0);
    },
    elements: () => {
      const root = rootRef.current;
      if (!root || !scanRef.current || !flashRef.current || !veilRef.current || !tintRef.current || !messageRef.current || !revealRef.current || !whisperRef.current || !shadowRef.current) {
        return null;
      }
      return {
        root,
        scan: scanRef.current,
        flash: flashRef.current,
        veil: veilRef.current,
        tint: tintRef.current,
        message: messageRef.current,
        reveal: revealRef.current,
        revealHeadline: revealRef.current.querySelector('[data-reveal="headline"]') as HTMLElement,
        revealSub: revealRef.current.querySelector('[data-reveal="sub"]') as HTMLElement,
        revealLogo: revealRef.current.querySelector('[data-reveal="logo"]') as HTMLElement,
        whisper: whisperRef.current,
        shadow: shadowRef.current,
      };
    },
  };

  // Expose via the ref, and register globally so the director/controller can find it.
  useImperativeHandle(ref, () => handle);
  const handleRef = useRef(handle);
  handleRef.current = handle;
  useEffect(() => {
    const stable: OverlayHandle = new Proxy({} as OverlayHandle, {
      get: (_t, prop: keyof OverlayHandle) => handleRef.current[prop],
    });
    const unregister = registerOverlay(stable);
    return () => {
      unregister();
      handleRef.current.reset();
    };
  }, []);

  // Size the flash canvas once (low resolution, stretched by CSS).
  useEffect(() => {
    const c = flashRef.current;
    if (c) {
      c.width = 640;
      c.height = 400;
    }
  }, []);

  return (
    <>
      <svg className="hf-filters" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter id={WARP_FILTER_ID} x="-6%" y="-6%" width="112%" height="112%" colorInterpolationFilters="sRGB">
            <feTurbulence ref={turbRef} type="fractalNoise" baseFrequency="0.004 0.03" numOctaves="2" seed="3" result="noise" />
            <feDisplacementMap ref={dispRef} in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <ChromaticAberrationEffect ref={chromaRef} />
        </defs>
      </svg>

      <div ref={rootRef} className="hf-overlay" aria-hidden="true" data-hf-overlay="">
        <div ref={tintRef} className="hf-tint" />
        <canvas ref={flashRef} className="hf-flashframe" />
        <ScreenTearing ref={tearRef} />
        <div ref={scanRef} className="hf-scan" />
        <ParanormalShadow ref={shadowRef} fixed />
        <div ref={veilRef} className="hf-veil" />
        <div ref={messageRef} className="hf-message">
          <GlitchText text="YOU SHOULDN'T BE HERE." active untargeted />
        </div>
        <div ref={revealRef} className="hf-reveal">
          <div data-reveal="logo" className="hf-reveal__logo">
            <GlitchText text="Hoomefy" active untargeted />
          </div>
          <div data-reveal="headline" className="hf-reveal__headline">
            <GlitchText text="WELCOME TO THE MANSION." untargeted />
          </div>
          <p data-reveal="sub" className="hf-reveal__sub">
            Your dream home has secrets.
          </p>
        </div>
        <div ref={whisperRef} className="hf-whisper" />
        <div ref={glyphRef} className="hf-glyph">
          <Bell strokeWidth={1.4} />
        </div>
      </div>
    </>
  );
});
