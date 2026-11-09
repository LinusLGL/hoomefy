/**
 * Haunted soundtrack.
 *
 * Two recordings: a short sting that plays when the haunting is triggered, and a looping dark
 * ambient track that takes over when the sting ends.
 *
 * Browsers refuse to start audio before the visitor has interacted with the page, and scrolling
 * (which is what triggers the takeover) does not count. When play() is refused the soundtrack
 * remembers what it wanted to play and starts it on the first click, key press or touch.
 *
 * The page being hidden pauses the sound; coming back resumes it. Nothing here touches the DOM
 * except through the injected audio elements, so it can be tested with fakes.
 */

export const SOUNDTRACK_URLS = {
  sting: '/audio/haunting-start.mp3',
  ambient: '/audio/haunted-ambient.mp3',
} as const;

export const STING_VOLUME = 0.9;
export const AMBIENT_VOLUME = 0.4;
const FADE_MS = 2500;
const FADE_STEP_MS = 100;
const GESTURE_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;

export type SoundtrackState = 'idle' | 'sting' | 'ambient';

export interface Soundtrack {
  readonly state: SoundtrackState;
  /** Play the trigger sting, then continue into the ambient loop. */
  playSting: () => void;
  /** Start the ambient loop (does nothing while the sting is still playing; it hands over by itself). */
  playAmbient: () => void;
  stop: () => void;
  dispose: () => void;
}

type AudioFactory = (src: string) => HTMLAudioElement;

export function createSoundtrack(factory: AudioFactory = (src) => new Audio(src)): Soundtrack {
  let sting: HTMLAudioElement | null = null;
  let ambient: HTMLAudioElement | null = null;
  let state: SoundtrackState = 'idle';
  let blocked = false;
  let gestureArmed = false;
  let fade: ReturnType<typeof setInterval> | null = null;
  let disposed = false;

  const active = (): HTMLAudioElement | null => (state === 'sting' ? sting : state === 'ambient' ? ambient : null);

  const clearFade = () => {
    if (fade !== null) clearInterval(fade);
    fade = null;
  };

  const onGesture = () => {
    disarmGesture();
    if (!blocked || disposed) return;
    blocked = false;
    const el = active();
    if (el) tryPlay(el);
  };

  function armGesture() {
    if (gestureArmed || typeof window === 'undefined') return;
    gestureArmed = true;
    GESTURE_EVENTS.forEach((e) => window.addEventListener(e, onGesture, { capture: true, passive: true }));
  }

  function disarmGesture() {
    if (!gestureArmed || typeof window === 'undefined') return;
    gestureArmed = false;
    GESTURE_EVENTS.forEach((e) => window.removeEventListener(e, onGesture, { capture: true }));
  }

  function tryPlay(el: HTMLAudioElement) {
    let result: Promise<void> | undefined;
    try {
      result = el.play();
    } catch {
      return;
    }
    result?.catch((error: unknown) => {
      // NotAllowedError: no interaction yet. Anything else (e.g. AbortError from a quick stop) is ignorable.
      if ((error as { name?: string } | null)?.name === 'NotAllowedError' && !disposed && active() === el) {
        blocked = true;
        armGesture();
      }
    });
  }

  const fadeTo = (el: HTMLAudioElement, target: number, ms = FADE_MS) => {
    clearFade();
    const steps = Math.max(1, Math.round(ms / FADE_STEP_MS));
    const from = el.volume;
    let i = 0;
    fade = setInterval(() => {
      i += 1;
      el.volume = Math.min(1, Math.max(0, from + ((target - from) * i) / steps));
      if (i >= steps) clearFade();
    }, FADE_STEP_MS);
  };

  const halt = (el: HTMLAudioElement | null) => {
    if (!el) return;
    el.pause();
    try {
      el.currentTime = 0;
    } catch {
      /* not seekable yet */
    }
  };

  const onVisibility = () => {
    const el = active();
    if (!el) return;
    if (document.hidden) el.pause();
    else if (!blocked) tryPlay(el);
  };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);

  const playAmbient = () => {
    if (disposed || state === 'sting') return;
    if (state === 'ambient' && ambient && !ambient.paused) return;
    ambient ??= factory(SOUNDTRACK_URLS.ambient);
    ambient.loop = true;
    state = 'ambient';
    ambient.volume = 0;
    tryPlay(ambient);
    fadeTo(ambient, AMBIENT_VOLUME);
  };

  const playSting = () => {
    if (disposed) return;
    clearFade();
    halt(ambient);
    if (!sting) {
      sting = factory(SOUNDTRACK_URLS.sting);
      sting.addEventListener('ended', () => {
        if (state === 'sting') {
          state = 'idle';
          playAmbient();
        }
      });
    }
    state = 'sting';
    blocked = false;
    try {
      sting.currentTime = 0;
    } catch {
      /* not seekable yet */
    }
    sting.volume = STING_VOLUME;
    tryPlay(sting);
  };

  const stop = () => {
    clearFade();
    disarmGesture();
    blocked = false;
    state = 'idle';
    halt(sting);
    halt(ambient);
  };

  const dispose = () => {
    stop();
    disposed = true;
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
    sting = null;
    ambient = null;
  };

  return {
    get state() {
      return state;
    },
    playSting,
    playAmbient,
    stop,
    dispose,
  };
}
