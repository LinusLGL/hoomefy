/**
 * Plays the spoken line that goes with each candle.
 *
 * Only one voice is heard at a time: lighting the next candle cuts off the one before. Playing can be refused by the
 * browser (it is always started from a click here, so that is rare); that is swallowed, because the words are shown
 * on screen anyway.
 */

export interface ScriptPlayer {
  /** Fetch the recordings ahead of time so the first candle speaks without a pause. */
  preload: () => void;
  /** Play recording `url`, stopping any other. `onEnded` runs when it finishes by itself. */
  play: (url: string, onEnded?: () => void) => void;
  stop: () => void;
}

type AudioFactory = (url: string) => HTMLAudioElement;

const browserAudio: AudioFactory = (url) => new Audio(url);

export function createScriptPlayer(urls: readonly string[], make: AudioFactory = browserAudio): ScriptPlayer {
  const cache = new Map<string, HTMLAudioElement>();
  let current: HTMLAudioElement | null = null;

  const element = (url: string): HTMLAudioElement => {
    let el = cache.get(url);
    if (!el) {
      el = make(url);
      el.preload = 'auto';
      cache.set(url, el);
    }
    return el;
  };

  const halt = () => {
    if (!current) return;
    current.onended = null;
    current.pause();
    try {
      current.currentTime = 0;
    } catch {
      /* not seekable yet */
    }
    current = null;
  };

  return {
    preload: () => {
      for (const url of urls) element(url).load?.();
    },
    play: (url, onEnded) => {
      halt();
      const el = element(url);
      current = el;
      el.onended = () => {
        if (current === el) current = null;
        onEnded?.();
      };
      try {
        el.currentTime = 0;
      } catch {
        /* not seekable yet */
      }
      void el.play?.()?.catch(() => undefined);
    },
    stop: halt,
  };
}
