/**
 * The sound of a click in the Haunted site: a short burst of the fire crackle (firesound.mp3).
 *
 * The recording is about nine seconds long, so a click plays only the start of it, fading out, and the next click
 * starts it over; a fast run of clicks never stacks into a roar. Playing can be refused by the browser; that is
 * swallowed, because the click itself has already done its job.
 */

export const CLICK_SOUND_URL = '/audio/firesound.mp3';
/** How much of the recording one click plays, and how much of that is the fade out. */
export const CLICK_SOUND_MS = 1400;
export const CLICK_FADE_MS = 450;
/** Quiet enough to sit under the spoken lines of the ritual. */
export const CLICK_VOLUME = 0.55;

export interface ClickSound {
  /** Fetch the recording ahead of time so the first click is heard at once. */
  preload: () => void;
  play: () => void;
  stop: () => void;
}

type AudioFactory = (url: string) => HTMLAudioElement;

const browserAudio: AudioFactory = (url) => new Audio(url);

export function createClickSound(make: AudioFactory = browserAudio): ClickSound {
  let el: HTMLAudioElement | null = null;
  let fadeStart = 0;
  let stopTimer = 0;
  let fadeTimer = 0;

  const element = () => {
    if (!el) {
      el = make(CLICK_SOUND_URL);
      el.preload = 'auto';
    }
    return el;
  };

  const clearTimers = () => {
    window.clearTimeout(fadeStart);
    window.clearTimeout(stopTimer);
    window.clearInterval(fadeTimer);
  };

  const rewind = (audio: HTMLAudioElement) => {
    try {
      audio.currentTime = 0;
    } catch {
      /* not seekable yet */
    }
  };

  const halt = () => {
    clearTimers();
    if (!el) return;
    el.pause();
    rewind(el);
  };

  return {
    preload: () => {
      element().load?.();
    },
    play: () => {
      const audio = element();
      // A click while the last one is still sounding starts it over from the beginning (no pause in between).
      clearTimers();
      rewind(audio);
      audio.volume = CLICK_VOLUME;
      void audio.play?.()?.catch(() => undefined);
      fadeStart = window.setTimeout(() => {
        const steps = 6;
        let step = 0;
        fadeTimer = window.setInterval(() => {
          step += 1;
          audio.volume = Math.max(0, CLICK_VOLUME * (1 - step / steps));
          if (step >= steps) window.clearInterval(fadeTimer);
        }, CLICK_FADE_MS / steps);
      }, CLICK_SOUND_MS - CLICK_FADE_MS);
      stopTimer = window.setTimeout(halt, CLICK_SOUND_MS);
    },
    stop: halt,
  };
}
