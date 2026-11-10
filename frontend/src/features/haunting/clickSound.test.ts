import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { CLICK_FADE_MS, CLICK_SOUND_MS, CLICK_SOUND_URL, CLICK_VOLUME, createClickSound } from './clickSound';

interface FakeAudio {
  url: string;
  preload: string;
  volume: number;
  currentTime: number;
  play: Mock<[], Promise<void>>;
  pause: Mock<[], void>;
  load: Mock<[], void>;
}

function setup() {
  const made: FakeAudio[] = [];
  const sound = createClickSound((url) => {
    const el: FakeAudio = { url, preload: '', volume: 1, currentTime: 0, play: vi.fn(() => Promise.resolve()), pause: vi.fn(), load: vi.fn() };
    made.push(el);
    return el as unknown as HTMLAudioElement;
  });
  return { sound, made };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('createClickSound', () => {
  it('is the fire recording', () => {
    const { sound, made } = setup();
    sound.play();
    expect(CLICK_SOUND_URL).toBe('/audio/firesound.mp3');
    expect(made.map((m) => m.url)).toEqual([CLICK_SOUND_URL]);
  });

  it('fetches the recording ahead of time', () => {
    const { sound, made } = setup();
    sound.preload();
    expect(made).toHaveLength(1);
    expect(made[0].load).toHaveBeenCalledTimes(1);
    expect(made[0].preload).toBe('auto');
  });

  it('plays from the start at a gentle volume', () => {
    const { sound, made } = setup();
    sound.play();
    expect(made[0].play).toHaveBeenCalledTimes(1);
    expect(made[0].currentTime).toBe(0);
    expect(made[0].volume).toBe(CLICK_VOLUME);
  });

  it('plays only the start of the long recording: it fades out and stops by itself', () => {
    const { sound, made } = setup();
    sound.play();
    vi.advanceTimersByTime(CLICK_SOUND_MS - CLICK_FADE_MS - 10);
    expect(made[0].volume).toBe(CLICK_VOLUME);
    vi.advanceTimersByTime(CLICK_FADE_MS / 2);
    expect(made[0].volume).toBeLessThan(CLICK_VOLUME);
    expect(made[0].pause).not.toHaveBeenCalled();
    vi.advanceTimersByTime(CLICK_FADE_MS);
    expect(made[0].pause).toHaveBeenCalledTimes(1);
  });

  it('a new click starts it over instead of stacking, and the old stop time no longer applies', () => {
    const { sound, made } = setup();
    sound.play();
    vi.advanceTimersByTime(CLICK_SOUND_MS - 200);
    sound.play(); // restarts: volume back to full, a fresh run of the full length
    expect(made).toHaveLength(1); // one element, reused
    expect(made[0].play).toHaveBeenCalledTimes(2);
    expect(made[0].volume).toBe(CLICK_VOLUME);
    made[0].pause.mockClear();
    vi.advanceTimersByTime(CLICK_SOUND_MS - 300);
    expect(made[0].pause).not.toHaveBeenCalled(); // the first click's stop was cancelled
    vi.advanceTimersByTime(400);
    expect(made[0].pause).toHaveBeenCalledTimes(1);
  });

  it('stop silences it at once', () => {
    const { sound, made } = setup();
    sound.play();
    sound.stop();
    expect(made[0].pause).toHaveBeenCalled();
    made[0].pause.mockClear();
    vi.advanceTimersByTime(CLICK_SOUND_MS * 2);
    expect(made[0].pause).not.toHaveBeenCalled(); // nothing left scheduled
  });

  it('survives a browser that refuses to play', async () => {
    const made: FakeAudio[] = [];
    const sound = createClickSound((url) => {
      const el: FakeAudio = { url, preload: '', volume: 1, currentTime: 0, play: vi.fn((): Promise<void> => Promise.reject(new Error('NotAllowedError'))), pause: vi.fn(), load: vi.fn() };
      made.push(el);
      return el as unknown as HTMLAudioElement;
    });
    expect(() => sound.play()).not.toThrow();
    await Promise.resolve();
  });
});
