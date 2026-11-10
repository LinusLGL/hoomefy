import { describe, it, expect, vi, type Mock } from 'vitest';
import { createScriptPlayer } from './scriptAudio';

interface FakeAudio {
  url: string;
  preload: string;
  currentTime: number;
  onended: (() => void) | null;
  play: Mock<[], Promise<void>>;
  pause: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
}

function setup(playImpl: () => Promise<void> = () => Promise.resolve()) {
  const made: FakeAudio[] = [];
  const player = createScriptPlayer(['/a.mp3', '/b.mp3', '/c.mp3'], (url) => {
    const el: FakeAudio = { url, preload: '', currentTime: 0, onended: null, play: vi.fn(playImpl), pause: vi.fn(), load: vi.fn() };
    made.push(el);
    return el as unknown as HTMLAudioElement;
  });
  return { player, made, byUrl: (u: string) => made.find((m) => m.url === u)! };
}

describe('createScriptPlayer', () => {
  it('fetches every recording ahead of time', () => {
    const { player, made } = setup();
    player.preload();
    expect(made.map((m) => m.url)).toEqual(['/a.mp3', '/b.mp3', '/c.mp3']);
    expect(made.every((m) => m.load.mock.calls.length === 1 && m.preload === 'auto')).toBe(true);
  });

  it('plays a recording from the start', () => {
    const { player, byUrl } = setup();
    player.play('/a.mp3');
    expect(byUrl('/a.mp3').play).toHaveBeenCalledTimes(1);
    expect(byUrl('/a.mp3').currentTime).toBe(0);
  });

  it('cuts off the voice that was speaking when the next one starts, so two are never heard at once', () => {
    const { player, byUrl } = setup();
    player.play('/a.mp3');
    player.play('/b.mp3');
    expect(byUrl('/a.mp3').pause).toHaveBeenCalledTimes(1);
    expect(byUrl('/b.mp3').play).toHaveBeenCalledTimes(1);
    expect(byUrl('/b.mp3').pause).not.toHaveBeenCalled();
  });

  it('tells the caller when a recording finishes by itself', () => {
    const { player, byUrl } = setup();
    const done = vi.fn();
    player.play('/c.mp3', done);
    byUrl('/c.mp3').onended?.();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('does not report the end of a recording that was cut off', () => {
    const { player, byUrl } = setup();
    const done = vi.fn();
    player.play('/a.mp3', done);
    player.play('/b.mp3');
    byUrl('/a.mp3').onended?.();
    expect(done).not.toHaveBeenCalled();
  });

  it('stops everything', () => {
    const { player, byUrl } = setup();
    player.play('/a.mp3');
    player.stop();
    expect(byUrl('/a.mp3').pause).toHaveBeenCalledTimes(1);
    player.stop();
    expect(byUrl('/a.mp3').pause).toHaveBeenCalledTimes(1);
  });

  it('carries on quietly when the browser refuses to play', async () => {
    const { player } = setup(() => Promise.reject(new Error('NotAllowedError')));
    expect(() => player.play('/a.mp3')).not.toThrow();
    await Promise.resolve();
  });
});
