/**
 * takeoverTimeline
 *
 * Builds and runs the cinematic takeover as one GSAP timeline. Plain module (no
 * React) with injected dependencies so it can be driven and tested directly.
 *
 *   0.0 ── A: Reality breaks ── 1.2 ── B: Screen corruption ── 2.7 ── C: Possession ── 4.5 ── D: Reveal ── 6.0
 *
 * Principles:
 *  - Distortion is applied to the *real* DOM through SVG filters on a few visible
 *    `[data-distort]` elements and per-character transforms on `[data-glitch]`
 *    text. Nothing is unmounted; no store other than the haunting store is read.
 *  - Palette is tweened by writing CSS variables, so the entire existing UI is
 *    possessed live (see palettes.ts).
 *  - `settle()` puts the page in its final Haunted resting state. The normal end,
 *    Skip and unmount cleanup all use it, so they cannot diverge.
 */

import { gsap } from 'gsap';
import { applyMixedPalette, clearInlinePalette } from './palettes';
import type { OverlayElements, OverlayHandle } from './RealityDistortionOverlay';
import type { SceneEntry } from './registry';
import { selectDistortTargets, isInViewport } from './registry';
import { flashShadow, crossShadow } from './shadowEffects';
import type { ExperienceName } from './palettes';
import type { TakeoverPhase } from './hauntingStore';

export const PHASES = { A: 0, B: 1.2, C: 2.7, D: 4.5, END: 6.0 } as const;
export const REDUCED_DURATION = 2.4;

const FILTER = 'url(#hf-warp) url(#hf-chromatic)';

export interface TakeoverDeps {
  overlay: OverlayHandle;
  hero: SceneEntry | null;
  background: HTMLElement | null;
  mist: HTMLElement | null;
  mobile: boolean;
  reduced: boolean;
  root?: HTMLElement;
  setPhase: (phase: TakeoverPhase) => void;
  /** Synchronously switch the stored experience (the controller wraps this in flushSync). */
  setExperience: (experience: ExperienceName) => void;
  /** Called once the sequence has fully settled (normal end or skip). */
  onComplete: () => void;
}

export interface TakeoverRun {
  timeline: gsap.core.Timeline;
  /** Jump straight to the Haunted resting state. */
  skip: () => void;
  /** Stop and undo transient effects without completing (used on unmount). */
  abort: () => void;
  readonly done: boolean;
}

const rand = (a: number, b: number) => gsap.utils.random(a, b);

function visibleChars(root: ParentNode, limit = 260): HTMLElement[] {
  const chars = Array.from(root.querySelectorAll<HTMLElement>('[data-glitch] .hf-ch'));
  return chars.filter((c) => isInViewport(c, 2)).slice(0, limit);
}

export function runTakeover(deps: TakeoverDeps): TakeoverRun {
  const root = deps.root ?? document.documentElement;
  const { overlay, hero, background, mist, mobile } = deps;
  const els: OverlayElements | null = overlay.elements();
  const ctx = gsap.context(() => undefined);
  let finished = false;
  let aborted = false;

  const targets = deps.reduced ? [] : selectDistortTargets(document, mobile ? 3 : 6);
  const heroHeading = document.querySelector<HTMLElement>('[data-hero-heading]');
  let allChars = deps.reduced ? [] : visibleChars(document, mobile ? 120 : 260);
  const navChars = Array.from(document.querySelectorAll<HTMLElement>('header [data-glitch] .hf-ch'));
  const inlineShadows = Array.from(document.querySelectorAll<HTMLElement>('[data-hf-shadow]:not(.hf-shadow--fixed)'));

  // Proxy values the timeline tweens; applied through one function per frame.
  const fx = {
    warp: 0,
    chroma: 0,
    freqX: 0.004,
    scan: 0,
    heroProgress: 0,
    heroDistort: 0,
    heroSplit: 0,
    palette: 0,
    time: 0,
  };

  const applyFx = () => {
    overlay.setWarp(fx.warp, fx.freqX, 0.03);
    overlay.setChroma(fx.chroma, fx.chroma * 0.12);
    if (els) els.scan.style.opacity = String(fx.scan);
    hero?.handle.set({ progress: fx.heroProgress, distort: fx.heroDistort, split: fx.heroSplit * 0.01, time: fx.time });
  };

  const jitter = (tl: gsap.core.Timeline, at: number, amp: number, share = 0.35) => {
    let picked: HTMLElement[] = [];
    tl.call(
      () => {
        picked = allChars.filter(() => Math.random() < share);
        gsap.set(picked, { x: () => rand(-amp, amp), y: () => rand(-amp * 0.4, amp * 0.4), skewX: () => rand(-amp * 1.3, amp * 1.3) });
      },
      undefined,
      at
    );
    tl.call(() => gsap.set(picked, { x: 0, y: 0, skewX: 0 }), undefined, at + 0.08);
  };

  const reseedLoop = (tl: gsap.core.Timeline, from: number, to: number, step: number) => {
    for (let t = from; t < to; t += step) tl.call(() => overlay.reseed(rand(1, 9999)), undefined, t);
  };

  /** Put everything in its final Haunted resting state. Idempotent. */
  const settle = (swap: boolean) => {
    if (swap) deps.setExperience('haunted');
    gsap.set(targets, { clearProps: 'filter,willChange' });
    gsap.set(document.querySelectorAll('.hf-ch'), { clearProps: 'transform,opacity' });
    clearInlinePalette(root);
    if (background) gsap.set(background, { clearProps: 'opacity' });
    if (mist) gsap.set(mist, { clearProps: 'opacity,transform' });
    fx.heroProgress = 1;
    fx.heroDistort = 0;
    fx.heroSplit = 0;
    fx.warp = 0;
    fx.chroma = 0;
    fx.scan = 0;
    applyFx();
    overlay.reset();
  };

  const finish = (swap: boolean) => {
    if (finished) return;
    finished = true;
    tl.kill();
    ctx.kill();
    settle(swap);
    deps.setPhase('none');
    deps.onComplete();
  };

  // immediateRender:false matters: fromTo() otherwise applies its *start* values the moment the
  // timeline is built, e.g. the Phase D veil (opacity 0.92) would black out the page at t=0.
  const tl = gsap.timeline({ paused: true, defaults: { overwrite: false, immediateRender: false } });

  /* ------------------------------------------------------------------ */
  /* Reduced motion: a plain theme cross-fade, no movement or flashing.   */
  /* ------------------------------------------------------------------ */
  if (deps.reduced) {
    deps.setPhase('C');
    tl.to(fx, { palette: 1, duration: 0.8, ease: 'none', onUpdate: () => applyMixedPalette(fx.palette, root) }, 0);
    if (background) tl.fromTo(background, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'none' }, 0);
    tl.call(() => deps.setExperience('haunted'), undefined, 0.4);
    tl.call(
      () => {
        if (!els) return;
        els.reveal.classList.add('hf-reveal--static');
        gsap.set([els.revealHeadline, els.revealSub], { opacity: 1 });
        gsap.set(els.revealLogo, { opacity: 0 });
        gsap.to(els.reveal, { opacity: 1, duration: 0.4, ease: 'none' });
      },
      undefined,
      0.9
    );
    if (els) tl.to(els.reveal, { opacity: 0, duration: 0.4, ease: 'none' }, REDUCED_DURATION - 0.4);
    tl.call(() => finish(false), undefined, REDUCED_DURATION);
    tl.eventCallback('onComplete', null);
    tl.play(0);
    return {
      timeline: tl,
      skip: () => finish(true),
      abort: () => abort(),
      get done() {
        return finished;
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /* Phase A: reality breaks (0 – 1.2 s)                                  */
  /* ------------------------------------------------------------------ */
  tl.call(() => {
    deps.setPhase('A');
    gsap.set(targets, { filter: FILTER, willChange: 'filter' });
    if (els) gsap.set(els.reveal, { opacity: 0 });
    applyFx();
  }, undefined, PHASES.A);

  tl.to(fx, { warp: 14, chroma: 5, scan: 0.28, heroDistort: 0.18, heroSplit: 0.4, duration: 1.2, ease: 'power2.in', onUpdate: applyFx }, PHASES.A);
  tl.to(fx, { time: PHASES.END, duration: PHASES.END, ease: 'none', onUpdate: applyFx }, PHASES.A);
  reseedLoop(tl, 0.1, PHASES.B, 0.14);
  tl.call(() => overlay.tear.burst(4, 220, 0.5), undefined, 0.25);
  tl.call(() => overlay.tear.burst(5, 220, 0.6), undefined, 0.68);
  tl.call(() => overlay.tear.burst(6, 240, 0.7), undefined, 1.02);
  tl.call(() => overlay.fluorescent(180), undefined, 0.42);
  tl.call(() => overlay.fluorescent(160), undefined, 0.96);
  [0.2, 0.52, 0.84, 1.08].forEach((t, i) => jitter(tl, t, 3 + i * 2, 0.22));

  /* ------------------------------------------------------------------ */
  /* Phase B: screen corruption (1.2 – 2.7 s)                             */
  /* ------------------------------------------------------------------ */
  tl.call(() => deps.setPhase('B'), undefined, PHASES.B);
  tl.to(fx, { warp: 38, chroma: 11, freqX: 0.009, scan: 0.5, heroDistort: 0.9, heroSplit: 1.6, heroProgress: 0.18, duration: 1.5, ease: 'sine.inOut', onUpdate: applyFx }, PHASES.B);
  tl.call(() => overlay.tear.burst(8, 260, 1), undefined, 1.3);
  tl.call(() => overlay.flashScene('abandoned', 0.26, 150), undefined, 1.46);
  tl.call(() => inlineShadows.slice(0, 2).forEach((s) => flashShadow(s, { peak: 0.75, ms: 260 })), undefined, 1.62);
  tl.call(() => overlay.tear.burst(9, 280, 1), undefined, 1.72);
  tl.call(() => els && flashShadow(els.shadow, { peak: 0.5, ms: 240 }), undefined, 1.92);
  tl.call(() => overlay.flashScene('mansion', 0.24, 150), undefined, 2.06);
  tl.call(() => overlay.tear.burst(10, 300, 1), undefined, 2.12);
  tl.call(() => inlineShadows.slice(2, 4).forEach((s) => flashShadow(s, { peak: 0.7, ms: 220 })), undefined, 2.28);
  tl.call(() => overlay.tear.burst(8, 260, 1), undefined, 2.46);
  [1.3, 1.58, 1.86, 2.14, 2.42].forEach((t, i) => jitter(tl, t, 8 + i * 2, 0.38));

  /* ------------------------------------------------------------------ */
  /* Phase C: supernatural possession (2.7 – 4.5 s)                       */
  /* ------------------------------------------------------------------ */
  tl.call(() => deps.setPhase('C'), undefined, PHASES.C);
  tl.to(fx, { palette: 1, duration: 1.6, ease: 'power1.inOut', onUpdate: () => applyMixedPalette(fx.palette, root) }, PHASES.C);
  tl.to(fx, { warp: 46, chroma: 9, heroProgress: 1, heroDistort: 0.7, duration: 1.5, ease: 'power2.inOut', onUpdate: applyFx }, PHASES.C + 0.05);
  if (background) tl.fromTo(background, { opacity: 0 }, { opacity: 1, duration: 1.5, ease: 'power1.in' }, PHASES.C);
  if (mist) tl.fromTo(mist, { opacity: 0, yPercent: 35 }, { opacity: 0.9, yPercent: 0, duration: 1.7, ease: 'power1.out' }, PHASES.C + 0.4);

  // Hero heading fragments, the experience swaps underneath, and it reassembles.
  if (heroHeading) {
    const oldChars = Array.from(heroHeading.querySelectorAll<HTMLElement>('.hf-ch'));
    tl.to(
      oldChars,
      {
        x: () => rand(-160, 160),
        y: () => rand(-110, 110),
        rotation: () => rand(-55, 55),
        opacity: 0.15,
        duration: 0.5,
        ease: 'power2.in',
        stagger: { each: 0.008, from: 'random' },
      },
      PHASES.C + 0.15
    );
  }
  tl.call(
    () => {
      deps.setExperience('haunted');
      allChars = deps.reduced ? [] : visibleChars(document, mobile ? 120 : 260);
      const heading = document.querySelector<HTMLElement>('[data-hero-heading]');
      if (heading) {
        const fresh = Array.from(heading.querySelectorAll<HTMLElement>('.hf-ch'));
        ctx.add(() => {
          gsap.fromTo(
            fresh,
            { x: () => rand(-180, 180), y: () => rand(-120, 120), rotation: () => rand(-70, 70), opacity: 0 },
            { x: 0, y: 0, rotation: 0, opacity: 1, duration: 0.85, ease: 'power3.out', stagger: { each: 0.014, from: 'random' } }
          );
        });
      }
    },
    undefined,
    PHASES.C + 0.82
  );

  // Navigation text distorts, then reforms.
  if (navChars.length) {
    tl.call(() => gsap.set(navChars, { x: () => rand(-14, 14), y: () => rand(-4, 4), skewX: () => rand(-24, 24) }), undefined, PHASES.C + 0.35);
    tl.call(() => gsap.set(navChars, { x: () => rand(-9, 9), skewX: () => rand(-14, 14) }), undefined, PHASES.C + 0.55);
    tl.to(navChars, { x: 0, y: 0, skewX: 0, duration: 0.55, ease: 'power3.out', stagger: { each: 0.012, from: 'start' } }, PHASES.C + 0.8);
  }

  tl.call(() => els && crossShadow(els.shadow, 2.1), undefined, PHASES.C + 0.25);
  tl.call(() => overlay.tear.burst(7, 240, 0.9), undefined, PHASES.C + 0.1);
  tl.call(() => overlay.tear.burst(5, 220, 0.7), undefined, PHASES.C + 0.95);
  tl.call(() => overlay.tear.burst(4, 200, 0.6), undefined, PHASES.C + 1.5);
  [PHASES.C + 0.2, PHASES.C + 0.5, PHASES.C + 0.9, PHASES.C + 1.3].forEach((t, i) => jitter(tl, t, 7 - i, 0.3));

  if (els) {
    tl.fromTo(els.message, { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 0.12, ease: 'steps(2)' }, PHASES.C + 0.85);
    tl.to(els.message, { opacity: 0.35, duration: 0.07, repeat: 5, yoyo: true, ease: 'steps(1)' }, PHASES.C + 1.0);
    tl.to(els.message, { opacity: 0, duration: 0.14, ease: 'steps(2)' }, PHASES.D - 0.2);
  }

  /* ------------------------------------------------------------------ */
  /* Phase D: the haunted mansion reveal (4.5 – 6.0 s)                     */
  /* ------------------------------------------------------------------ */
  tl.call(() => {
    deps.setPhase('D');
    // The distortion stops abruptly.
    gsap.set(targets, { clearProps: 'filter,willChange' });
    gsap.set(document.querySelectorAll('.hf-ch'), { clearProps: 'transform,opacity' });
    fx.warp = 0;
    fx.chroma = 0;
    fx.scan = 0;
    fx.heroDistort = 0;
    fx.heroSplit = 0;
    fx.heroProgress = 1;
    applyFx();
    overlay.tear.clear();
    clearInlinePalette(root);
  }, undefined, PHASES.D);

  if (els) {
    tl.fromTo(els.veil, { opacity: 0.92 }, { opacity: 0.55, duration: 0.5, ease: 'power2.out' }, PHASES.D);
    tl.fromTo(els.reveal, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.out' }, PHASES.D + 0.15);
    tl.fromTo(els.revealLogo, { opacity: 0, y: 8, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7, ease: 'power2.out' }, PHASES.D + 0.2);
    tl.fromTo(els.revealHeadline, { opacity: 0, scale: 1.04, letterSpacing: '0.12em' }, { opacity: 1, scale: 1, letterSpacing: '0.04em', duration: 0.8, ease: 'power3.out' }, PHASES.D + 0.35);
    tl.fromTo(els.revealSub, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power1.out' }, PHASES.D + 0.95);
    tl.to([els.reveal, els.veil], { opacity: 0, duration: 0.5, ease: 'power1.in' }, PHASES.END - 0.5);
  }
  tl.call(() => finish(false), undefined, PHASES.END);

  function abort() {
    if (finished) return;
    finished = true;
    aborted = true;
    tl.kill();
    ctx.kill();
    gsap.set(targets, { clearProps: 'filter,willChange' });
    gsap.set(document.querySelectorAll('.hf-ch'), { clearProps: 'transform,opacity' });
    clearInlinePalette(root);
    if (background) gsap.set(background, { clearProps: 'opacity' });
    if (mist) gsap.set(mist, { clearProps: 'opacity,transform' });
    overlay.reset();
    deps.setPhase('none');
  }

  tl.play(0);

  return {
    timeline: tl,
    skip: () => finish(true),
    abort,
    get done() {
      return finished || aborted;
    },
  };
}
