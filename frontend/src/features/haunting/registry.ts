/**
 * Registry of live effect targets.
 *
 * The takeover controller and the scroll director live in different parts of the
 * tree from the elements they animate (overlay, hero scene, background). Those
 * elements register themselves here instead of being threaded through props, and
 * unregister on unmount, so nothing holds a stale DOM reference.
 */

import type { DistortedImageHandle } from './DistortedImageTransition';
import type { OverlayHandle } from './RealityDistortionOverlay';

export interface SceneEntry {
  el: HTMLElement;
  handle: DistortedImageHandle;
  /** The image shown in the Elegant experience (the photo, or the painted room). */
  getFrom?: () => HTMLCanvasElement | HTMLImageElement | null;
}

interface Registry {
  overlay: OverlayHandle | null;
  scenes: Map<string, SceneEntry>;
  background: HTMLElement | null;
  mist: HTMLElement | null;
}

export const registry: Registry = {
  overlay: null,
  scenes: new Map(),
  background: null,
  mist: null,
};

export function registerScene(id: string, entry: SceneEntry): () => void {
  registry.scenes.set(id, entry);
  return () => {
    if (registry.scenes.get(id) === entry) registry.scenes.delete(id);
  };
}

export function registerOverlay(handle: OverlayHandle): () => void {
  registry.overlay = handle;
  return () => {
    if (registry.overlay === handle) registry.overlay = null;
  };
}

export function registerBackground(bg: HTMLElement | null, mist: HTMLElement | null): () => void {
  registry.background = bg;
  registry.mist = mist;
  return () => {
    if (registry.background === bg) registry.background = null;
    if (registry.mist === mist) registry.mist = null;
  };
}

/** Elements that receive the warp + chromatic filters during the takeover. */
export const DISTORT_ATTR = 'data-distort';
export const GLITCH_ATTR = 'data-glitch';
export const TRIGGER_ATTR = 'data-haunt-trigger';

export function isInViewport(el: Element, maxHeightViewports = 1.5): boolean {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight || 1;
  const vw = window.innerWidth || 1;
  if (r.width === 0 && r.height === 0) return false;
  const visible = r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
  return visible && r.height <= vh * maxHeightViewports;
}

/** Pick filter targets: visible, not taller than 1.5 viewports, capped for performance. */
export function selectDistortTargets(root: ParentNode = document, limit = 6): HTMLElement[] {
  const all = Array.from(root.querySelectorAll<HTMLElement>(`[${DISTORT_ATTR}]`));
  return all.filter((el) => isInViewport(el)).slice(0, limit);
}
