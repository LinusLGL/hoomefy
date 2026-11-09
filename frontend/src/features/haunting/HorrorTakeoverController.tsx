/**
 * HorrorTakeoverController
 *
 * Owns the lifecycle of the takeover sequence. It watches the haunting store for
 * a takeover request, defers it while an upload or generation is in flight,
 * builds the GSAP timeline (takeoverTimeline.ts), handles Skip, picks the
 * reduced-motion path, and releases everything on unmount.
 *
 * It renders nothing. It never reads or writes the auth, studio or toast stores.
 */

import { useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { canAutoTakeover, useHauntingStore } from './hauntingStore';
import { registry } from './registry';
import { runTakeover, type TakeoverRun } from './takeoverTimeline';
import { isMobileLike, prefersReducedMotion } from './env';

export function HorrorTakeoverController() {
  const takeoverRequest = useHauntingStore((s) => s.takeoverRequest);
  const skipRequest = useHauntingStore((s) => s.skipRequest);
  const busy = useHauntingStore((s) => s.busy);

  const runRef = useRef<TakeoverRun | null>(null);
  const pendingRef = useRef(false);
  const handledRef = useRef(0);
  const handledSkipRef = useRef(0);

  const start = () => {
    if (runRef.current && !runRef.current.done) return;
    const overlay = registry.overlay;
    if (!overlay) return;
    pendingRef.current = false;

    const store = useHauntingStore.getState();
    store.beginSequence();

    runRef.current = runTakeover({
      overlay,
      hero: registry.scenes.get('hero') ?? null,
      background: registry.background,
      mist: registry.mist,
      mobile: isMobileLike(),
      reduced: prefersReducedMotion(),
      setPhase: (phase) => useHauntingStore.getState().setPhase(phase),
      // Flush synchronously so the new Haunted copy is in the DOM before the timeline re-forms the text.
      setExperience: (experience) => flushSync(() => useHauntingStore.getState().setExperience(experience)),
      onComplete: () => flushSync(() => useHauntingStore.getState().finishTakeover()),
    });
  };

  // New request from scroll / mirror / replay.
  useEffect(() => {
    if (takeoverRequest === 0 || takeoverRequest === handledRef.current) return;
    handledRef.current = takeoverRequest;

    const { busy: isBusy, takeoverReason } = useHauntingStore.getState();
    // Never interrupt an upload or generation: wait until the app is idle again.
    if (isBusy && takeoverReason !== 'replay') {
      pendingRef.current = true;
      return;
    }
    start();
    // `start` only reads refs and the store, so it is intentionally not a dependency.
  }, [takeoverRequest]);

  // The first button press in Elegant also lets the haunting in. It happens once: leaving Haunted
  // (choosing Elegant or using the holy water) marks the reveal as seen, so later presses do nothing.
  // The settings dock is exempt so visitors can always change their mind without waking the house.
  // The press itself is swallowed: the button does not do its Elegant job. The visitor is taken to
  // the home page and the takeover plays there, landing on the Haunted home page.
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const wantsRef = useRef(false);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const fire = () => {
    wantsRef.current = false;
    window.scrollTo(0, 0);
    // Two frames, so the home page (and its hero scene) is mounted before the timeline looks for it.
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => useHauntingStore.getState().requestTakeover('click')));
  };

  useEffect(() => {
    const onPress = (e: MouseEvent) => {
      if (!e.isTrusted || !(e.target instanceof Element)) return;
      if (!e.target.closest('button, [role="button"], a[href]')) return;
      if (e.target.closest('[data-hf-controls]')) return;
      if (!canAutoTakeover(useHauntingStore.getState())) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (pathRef.current === '/') {
        fire();
      } else {
        wantsRef.current = true;
        navigate('/');
      }
    };
    document.addEventListener('click', onPress, true);
    return () => document.removeEventListener('click', onPress, true);
    // `fire` only reads refs and the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  useEffect(() => {
    if (wantsRef.current && pathname === '/') fire();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Run a deferred request once the app is no longer busy.
  useEffect(() => {
    if (!busy && pendingRef.current) start();
  }, [busy]);

  // Skip transition.
  useEffect(() => {
    if (skipRequest === 0 || skipRequest === handledSkipRef.current) return;
    handledSkipRef.current = skipRequest;
    const run = runRef.current;
    if (!run) return;
    // skip() ends with flushSync (inside onComplete), which React refuses to run
    // inside an effect. Defer to a microtask so it runs outside React's render work.
    queueMicrotask(() => run.skip());
  }, [skipRequest]);

  // Opting out mid-sequence stops it immediately and restores a clean Elegant page.
  const horrorEnabled = useHauntingStore((s) => s.horrorEnabled);
  useEffect(() => {
    if (!horrorEnabled) {
      pendingRef.current = false;
      runRef.current?.abort();
      runRef.current = null;
    }
  }, [horrorEnabled]);

  // Release the timeline, tweens and inline styles on unmount.
  useEffect(
    () => () => {
      runRef.current?.abort();
      runRef.current = null;
    },
    []
  );

  return null;
}
