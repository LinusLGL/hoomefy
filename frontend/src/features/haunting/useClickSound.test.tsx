import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHolyWaterStore } from '@/features/holywater/holyWaterStore';

const sound = vi.hoisted(() => ({ plays: 0, stops: 0, preloads: 0, created: 0 }));

vi.mock('./clickSound', () => ({
  createClickSound: () => {
    sound.created += 1;
    return {
      preload: () => void (sound.preloads += 1),
      play: () => void (sound.plays += 1),
      stop: () => void (sound.stops += 1),
    };
  },
}));

import { useClickSound } from './useClickSound';

const click = (target: Element = document.body) => target.dispatchEvent(new MouseEvent('click', { bubbles: true }));

beforeEach(() => {
  sound.plays = 0;
  sound.stops = 0;
  sound.preloads = 0;
  sound.created = 0;
  useHolyWaterStore.setState({ video: 'none' });
});

describe('useClickSound', () => {
  it('crackles on every click anywhere on the page', () => {
    renderHook(() => useClickSound(true));
    const button = document.createElement('button');
    const link = document.createElement('a');
    document.body.append(button, link);
    click();
    click(button);
    click(link);
    expect(sound.plays).toBe(3);
    button.remove();
    link.remove();
  });

  it('fetches the sound as soon as it is on', () => {
    renderHook(() => useClickSound(true));
    expect(sound.preloads).toBe(1);
  });

  it('does nothing when it is off (Elegant, or sound muted)', () => {
    renderHook(() => useClickSound(false));
    click();
    expect(sound.created).toBe(0);
    expect(sound.plays).toBe(0);
  });

  it('hears a click even when a handler stops it from bubbling', () => {
    renderHook(() => useClickSound(true));
    const button = document.createElement('button');
    button.addEventListener('click', (e) => e.stopPropagation());
    document.body.appendChild(button);
    click(button);
    expect(sound.plays).toBe(1);
    button.remove();
  });

  it('stays quiet while the jumpscare or the cure is playing', () => {
    renderHook(() => useClickSound(true));
    useHolyWaterStore.setState({ video: 'scare' });
    click();
    expect(sound.plays).toBe(0);
    useHolyWaterStore.setState({ video: 'none' });
    click();
    expect(sound.plays).toBe(1);
  });

  it('stops listening and stops the sound when it is switched off or unmounted', () => {
    const { rerender, unmount } = renderHook(({ on }) => useClickSound(on), { initialProps: { on: true } });
    rerender({ on: false });
    expect(sound.stops).toBe(1);
    click();
    expect(sound.plays).toBe(0);
    rerender({ on: true });
    unmount();
    expect(sound.stops).toBe(2);
    click();
    expect(sound.plays).toBe(0);
  });
});
