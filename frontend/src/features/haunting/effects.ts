/**
 * Small, self-contained distortion events used outside the main takeover:
 * the mirror click escalation and the AI-result reveal.
 *
 * They respect the same rules as everything else: horror enabled, no reduced
 * motion, and the flash budget. Each returns true if the effect ran.
 */

import { gsap } from 'gsap';
import { registry, selectDistortTargets } from './registry';
import { useHauntingStore } from './hauntingStore';
import { flashShadow } from './shadowEffects';
import { prefersReducedMotion, isMobileLike } from './env';

const FILTER = 'url(#hf-warp) url(#hf-chromatic)';

function effectsAllowed(): boolean {
  const s = useHauntingStore.getState();
  return s.horrorEnabled && s.sequence === 'idle' && !prefersReducedMotion();
}

/** Short warp + tear on specific elements (or the first visible `[data-distort]` ones). */
export function microDistort(targets?: HTMLElement[], opts: { ms?: number; warp?: number; tear?: number } = {}): boolean {
  const overlay = registry.overlay;
  if (!overlay || !effectsAllowed()) return false;
  const { ms = 420, warp = 22, tear = 4 } = opts;
  const els = targets ?? selectDistortTargets(document, isMobileLike() ? 1 : 2);
  gsap.set(els, { filter: FILTER });
  const state = { w: warp, c: 6 };
  overlay.setWarp(state.w, 0.006, 0.04);
  overlay.setChroma(state.c);
  overlay.tear.burst(tear, ms * 0.6, 0.6);
  gsap.to(state, {
    w: 0,
    c: 0,
    duration: ms / 1000,
    ease: 'power2.out',
    onUpdate: () => {
      overlay.setWarp(state.w, 0.006, 0.04);
      overlay.setChroma(state.c);
    },
    onComplete: () => {
      overlay.setWarp(0);
      overlay.setChroma(0);
      gsap.set(els, { clearProps: 'filter' });
    },
  });
  return true;
}

/** Atmospheric distortion used when an AI result is revealed in the Haunted UI. */
export function revealDistortion(el: HTMLElement | null): boolean {
  if (!el) return false;
  const s = useHauntingStore.getState();
  if (s.experience !== 'haunted') return false;
  return microDistort([el], { ms: 650, warp: 26, tear: 5 });
}

/** What pressing the mirror did: it started the takeover, or nothing (opted out, already Haunted, mid-sequence). */
export type MirrorOutcome = 'ignored' | 'takeover';

/**
 * Pressing the statement mirror in Elegant lets the haunting in, at once and every time (the first press of the
 * escalating glitches it used to need is gone). It still respects the opt-out. In Haunted the mirror plays the
 * jumpscare instead (see HauntedMirror).
 */
export function touchMirror(shadowEl?: HTMLElement | null): MirrorOutcome {
  const state = useHauntingStore.getState();
  if (state.experience !== 'elegant') return 'ignored';
  // The shadow in the glass flashes first, as the house notices you (not with reduced motion).
  if (shadowEl && effectsAllowed()) flashShadow(shadowEl, { peak: 0.75, ms: 300 });
  return state.requestTakeover('mirror') ? 'takeover' : 'ignored';
}
