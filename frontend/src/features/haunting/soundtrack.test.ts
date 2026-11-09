import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AMBIENT_VOLUME, createSoundtrack, SOUNDTRACK_URLS, STING_VOLUME } from './soundtrack';

class FakeAudio {
  loop = false;
  volume = 1;
  paused = true;
  currentTime = 0;
  private listeners = new Map<string, Array<() => void>>();
  constructor(public src: string) {}
  play = vi.fn(() => {
    if (FakeAudio.blocked) return Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' }));
    this.paused = false;
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    this.paused = true;
  });
  addEventListener(type: string, fn: () => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  emit(type: string) {
    (this.listeners.get(type) ?? []).forEach((fn) => fn());
  }
  static blocked = false;
}

let made: FakeAudio[] = [];
const factory = (src: string) => {
  const a = new FakeAudio(src);
  made.push(a);
  return a as unknown as HTMLAudioElement;
};
const get = (src: string) => made.find((a) => a.src === src) as FakeAudio;

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  vi.useFakeTimers();
  made = [];
  FakeAudio.blocked = false;
});
afterEach(() => {
  setHidden(false);
  vi.useRealTimers();
});

describe('soundtrack', () => {
  it('plays the sting at once and not the ambient loop', () => {
    const track = createSoundtrack(factory);
    track.playSting();

    const sting = get(SOUNDTRACK_URLS.sting);
    expect(sting.play).toHaveBeenCalledTimes(1);
    expect(sting.volume).toBe(STING_VOLUME);
    expect(sting.loop).toBe(false);
    expect(made.some((a) => a.src === SOUNDTRACK_URLS.ambient)).toBe(false);
    expect(track.state).toBe('sting');
    track.dispose();
  });

  it('hands over to a looping ambient track that fades in when the sting ends', async () => {
    const track = createSoundtrack(factory);
    track.playSting();
    get(SOUNDTRACK_URLS.sting).emit('ended');

    const ambient = get(SOUNDTRACK_URLS.ambient);
    expect(track.state).toBe('ambient');
    expect(ambient.loop).toBe(true);
    expect(ambient.play).toHaveBeenCalledTimes(1);
    expect(ambient.volume).toBe(0);

    await vi.advanceTimersByTimeAsync(3000);
    expect(ambient.volume).toBeCloseTo(AMBIENT_VOLUME, 5);
    track.dispose();
  });

  it('does not start the ambient loop on top of a sting that is still playing', () => {
    const track = createSoundtrack(factory);
    track.playSting();
    track.playAmbient();

    expect(track.state).toBe('sting');
    expect(made.some((a) => a.src === SOUNDTRACK_URLS.ambient)).toBe(false);
    track.dispose();
  });

  it('starts only the ambient loop when asked for it directly (a reload that is already Haunted)', () => {
    const track = createSoundtrack(factory);
    track.playAmbient();

    expect(track.state).toBe('ambient');
    expect(made.some((a) => a.src === SOUNDTRACK_URLS.sting)).toBe(false);
    track.dispose();
  });

  it('plays the sting again from the start on a replay, and silences the ambient loop first', () => {
    const track = createSoundtrack(factory);
    track.playAmbient();
    track.playSting();

    expect(get(SOUNDTRACK_URLS.ambient).paused).toBe(true);
    expect(get(SOUNDTRACK_URLS.sting).play).toHaveBeenCalledTimes(1);
    track.stop();
    track.playSting();
    expect(get(SOUNDTRACK_URLS.sting).play).toHaveBeenCalledTimes(2);
    expect(get(SOUNDTRACK_URLS.sting).currentTime).toBe(0);
    track.dispose();
  });

  it('stop silences everything', () => {
    const track = createSoundtrack(factory);
    track.playSting();
    get(SOUNDTRACK_URLS.sting).emit('ended');
    track.stop();

    expect(track.state).toBe('idle');
    expect(get(SOUNDTRACK_URLS.ambient).paused).toBe(true);
    expect(get(SOUNDTRACK_URLS.sting).paused).toBe(true);
    track.dispose();
  });

  describe('browser autoplay policy', () => {
    it('waits for the first click when the browser refuses to play, then plays what it wanted', async () => {
      FakeAudio.blocked = true;
      const track = createSoundtrack(factory);
      track.playSting();
      await vi.advanceTimersByTimeAsync(0);

      const sting = get(SOUNDTRACK_URLS.sting);
      expect(sting.play).toHaveBeenCalledTimes(1);
      expect(sting.paused).toBe(true);

      FakeAudio.blocked = false;
      window.dispatchEvent(new Event('pointerdown'));
      await vi.advanceTimersByTimeAsync(0);

      expect(sting.play).toHaveBeenCalledTimes(2);
      expect(sting.paused).toBe(false);
      track.dispose();
    });

    it('also accepts a key press or a touch', async () => {
      for (const type of ['keydown', 'touchstart']) {
        made = [];
        FakeAudio.blocked = true;
        const track = createSoundtrack(factory);
        track.playAmbient();
        await vi.advanceTimersByTimeAsync(0);
        FakeAudio.blocked = false;
        window.dispatchEvent(new Event(type));
        await vi.advanceTimersByTimeAsync(0);
        expect(get(SOUNDTRACK_URLS.ambient).paused, type).toBe(false);
        track.dispose();
      }
    });

    it('listens for the gesture once, and not at all when play was allowed', async () => {
      const track = createSoundtrack(factory);
      track.playSting();
      await vi.advanceTimersByTimeAsync(0);
      window.dispatchEvent(new Event('pointerdown'));
      await vi.advanceTimersByTimeAsync(0);

      expect(get(SOUNDTRACK_URLS.sting).play).toHaveBeenCalledTimes(1);
      track.dispose();
    });

    it('does not start anything after a mute (stop) even if the click comes later', async () => {
      FakeAudio.blocked = true;
      const track = createSoundtrack(factory);
      track.playSting();
      await vi.advanceTimersByTimeAsync(0);
      track.stop();

      FakeAudio.blocked = false;
      window.dispatchEvent(new Event('pointerdown'));
      await vi.advanceTimersByTimeAsync(0);

      expect(get(SOUNDTRACK_URLS.sting).play).toHaveBeenCalledTimes(1);
      track.dispose();
    });
  });

  it('pauses while the page is hidden and resumes when it is shown again', () => {
    const track = createSoundtrack(factory);
    track.playAmbient();
    const ambient = get(SOUNDTRACK_URLS.ambient);

    setHidden(true);
    expect(ambient.paused).toBe(true);
    setHidden(false);
    expect(ambient.paused).toBe(false);
    track.dispose();
  });

  it('ignores everything after dispose', () => {
    const track = createSoundtrack(factory);
    track.dispose();
    track.playSting();
    track.playAmbient();

    expect(made).toHaveLength(0);
  });
});
