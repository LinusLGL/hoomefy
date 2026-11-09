/**
 * HauntedExperienceProvider
 *
 * Mounts the haunting engine once for the whole app and keeps the document in
 * sync with the haunting store:
 *   <html data-experience="elegant|haunted">   palette (see palettes.ts / haunted.css)
 *   <html data-takeover="A|B|C|D">             present only while the sequence runs
 *   <html data-horror="on|off">                opt-out
 *   <html data-motion="reduced">               prefers-reduced-motion
 *
 * It renders the overlay, the persistent background, the controller and the
 * controls. The application tree is rendered as-is; nothing is wrapped in a
 * remounting key, so no component state is lost when the experience changes.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useHolyWaterStore } from '@/features/holywater/holyWaterStore';
import { useHauntingStore } from './hauntingStore';
import { COARSE_POINTER_QUERY, REDUCED_MOTION_QUERY, FINE_POINTER_QUERY } from './env';
import { makeGrainDataUrl } from './scenes';
import { HauntingContext } from './hauntingEnvContext';
import { RealityDistortionOverlay } from './RealityDistortionOverlay';
import { HauntedMansionBackground } from './HauntedMansionBackground';
import { HorrorTakeoverController } from './HorrorTakeoverController';
import { HauntingControls } from './HauntingControls';
import { HauntedSoundtrack } from './HauntedSoundtrack';
import { CandleCursor } from './CandleCursor';
import { FloatingGhosts } from './FloatingGhosts';
import { HolyWaterLayer } from '@/features/holywater/HolyWaterLayer';

function useMedia(query: string): boolean {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [query]);
  return matches;
}

export function HauntedExperienceProvider({ children }: { children: ReactNode }) {
  const experience = useHauntingStore((s) => s.experience);
  const horrorEnabled = useHauntingStore((s) => s.horrorEnabled);
  const phase = useHauntingStore((s) => s.phase);
  const candleCursor = useHauntingStore((s) => s.candleCursor);
  const candleDarkness = useHauntingStore((s) => s.candleDarkness);

  const reducedMotion = useMedia(REDUCED_MOTION_QUERY);
  const mobile = useMedia(COARSE_POINTER_QUERY);
  const finePointerQuery = useMedia(FINE_POINTER_QUERY);
  const haunted = horrorEnabled && experience === 'haunted';

  // Some laptops and hybrid devices report a touch screen as the primary pointer even while a mouse
  // is in use (or plugged in later). A real mouse or pen move is the reliable signal.
  const [sawMouse, setSawMouse] = useState(false);
  useEffect(() => {
    if (finePointerQuery || sawMouse) return undefined;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') setSawMouse(true);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [finePointerQuery, sawMouse]);
  const finePointer = finePointerQuery || sawMouse;
  // The candle burns down only while it is shown with the darkness; that is when the scare can happen.
  const candleBurning = haunted && candleCursor && finePointer && candleDarkness && phase === 'none';

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.experience = horrorEnabled ? experience : 'elegant';
    root.dataset.horror = horrorEnabled ? 'on' : 'off';
    if (phase === 'none') delete root.dataset.takeover;
    else root.dataset.takeover = phase;
    if (reducedMotion) root.dataset.motion = 'reduced';
    else delete root.dataset.motion;
  }, [experience, horrorEnabled, phase, reducedMotion]);

  // The ghost hunt starts over whenever the visitor enters Haunted mode, and when they go back.
  const wasHaunted = useRef(haunted);
  useEffect(() => {
    if (haunted && !wasHaunted.current) useHolyWaterStore.getState().resetAll();
    wasHaunted.current = haunted;
  }, [haunted]);
  useEffect(() => {
    if (!haunted) return undefined;
    const onBack = () => useHolyWaterStore.getState().resetAll();
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, [haunted]);

  // Leave the document clean if the provider is ever unmounted.
  useEffect(
    () => () => {
      const root = document.documentElement;
      delete root.dataset.takeover;
      delete root.dataset.motion;
    },
    []
  );

  // Film-grain texture for the Haunted background (generated once, off the critical path).
  useEffect(() => {
    if (!horrorEnabled) return undefined;
    const id = window.setTimeout(() => {
      const url = makeGrainDataUrl();
      if (url) document.documentElement.style.setProperty('--hf-grain', `url(${url})`);
    }, 400);
    return () => window.clearTimeout(id);
  }, [horrorEnabled]);

  const value = useMemo(() => ({ reducedMotion, mobile }), [reducedMotion, mobile]);

  return (
    <HauntingContext.Provider value={value}>
      {horrorEnabled && <HauntedMansionBackground />}
      <div className="hf-app">{children}</div>
      {haunted && <FloatingGhosts />}
      {haunted && <HolyWaterLayer scareEnabled={candleBurning} reducedMotion={reducedMotion} />}
      {haunted && candleCursor && finePointer && <CandleCursor darkness={candleDarkness && phase === 'none'} />}
      <RealityDistortionOverlay />
      <HorrorTakeoverController />
      <HauntedSoundtrack />
      <HauntingControls />
    </HauntingContext.Provider>
  );
}
