import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LIGHT_LEVELS, MIN_RADIUS, useLightStore } from '@/features/haunting/candleLight';
import { useHauntingStore } from '@/features/haunting/hauntingStore';
import { useHolyWaterStore } from './holyWaterStore';
import { SCARE_AFTER_MS, isAtFloor, useScareTimer } from './useScareTimer';

const reset = () => {
  sessionStorage.clear();
  useHolyWaterStore.setState({ foundIn: null, scared: false, cured: false, openRoom: null, armed: false, video: 'none' });
  useLightStore.setState({ radius: LIGHT_LEVELS[0], lifts: 0 });
  useHauntingStore.setState({ busy: false, busyKeys: [] });
};
const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const dim = () => act(() => useLightStore.setState({ radius: MIN_RADIUS }));
const video = () => useHolyWaterStore.getState().video;

beforeEach(() => {
  vi.useFakeTimers();
  reset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  reset();
});

describe('the jumpscare timer', () => {
  it('waits 12 seconds', () => {
    expect(SCARE_AFTER_MS).toBe(12_000);
  });

  it('knows when the candle has burned all the way down', () => {
    expect(isAtFloor(MIN_RADIUS)).toBe(true);
    expect(isAtFloor(MIN_RADIUS + 0.5)).toBe(false);
    expect(isAtFloor(30)).toBe(false);
  });

  it('plays the scare after the candle has stayed at its lowest for 12 seconds', () => {
    renderHook(() => useScareTimer(true, false));
    dim();
    wait(SCARE_AFTER_MS - 1);
    expect(video()).toBe('none');
    wait(1);
    expect(video()).toBe('scare');
    expect(useHolyWaterStore.getState().scared).toBe(true);
  });

  it('does nothing while the candle is only partly burned down', () => {
    renderHook(() => useScareTimer(true, false));
    act(() => useLightStore.setState({ radius: MIN_RADIUS + 3 }));
    wait(SCARE_AFTER_MS * 3);
    expect(video()).toBe('none');
  });

  it('starts over when a click lifts the light before the 12 seconds are up', () => {
    renderHook(() => useScareTimer(true, false));
    dim();
    wait(SCARE_AFTER_MS - 2000);
    act(() => useLightStore.getState().lift());
    wait(SCARE_AFTER_MS * 2);
    expect(video()).toBe('none');

    // Burned down again: a fresh 12 seconds.
    dim();
    wait(SCARE_AFTER_MS - 1);
    expect(video()).toBe('none');
    wait(1);
    expect(video()).toBe('scare');
  });

  it('only ever happens once', () => {
    renderHook(() => useScareTimer(true, false));
    dim();
    wait(SCARE_AFTER_MS);
    expect(video()).toBe('scare');
    act(() => useHolyWaterStore.getState().finishVideo());

    act(() => useLightStore.getState().lift());
    dim();
    wait(SCARE_AFTER_MS * 3);
    expect(video()).toBe('none');
  });

  it('does not run when the candle is not in use (no candle, touch screen, darkness off)', () => {
    renderHook(() => useScareTimer(false, false));
    dim();
    wait(SCARE_AFTER_MS * 3);
    expect(video()).toBe('none');
    expect(useHolyWaterStore.getState().scared).toBe(false);
  });

  it('never interrupts an upload or a generation, and counts from when it ends', () => {
    renderHook(() => useScareTimer(true, false));
    act(() => useHauntingStore.getState().setBusy('generation', true));
    dim();
    wait(SCARE_AFTER_MS * 3);
    expect(video()).toBe('none');

    act(() => useHauntingStore.getState().setBusy('generation', false));
    wait(SCARE_AFTER_MS - 1);
    expect(video()).toBe('none');
    wait(1);
    expect(video()).toBe('scare');
  });

  it('is cancelled by collecting the holy water', () => {
    renderHook(() => useScareTimer(true, false));
    dim();
    wait(SCARE_AFTER_MS - 3000);
    act(() => void useHolyWaterStore.getState().collect('library'));
    wait(SCARE_AFTER_MS * 2);
    expect(video()).toBe('none');
  });

  it('does not run after the ghost was dispersed', () => {
    useHolyWaterStore.setState({ cured: true });
    renderHook(() => useScareTimer(true, false));
    dim();
    wait(SCARE_AFTER_MS * 2);
    expect(video()).toBe('none');
  });

  it('waits for a hidden tab to come back before showing it', () => {
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    renderHook(() => useScareTimer(true, false));
    dim();
    wait(SCARE_AFTER_MS);
    expect(video()).toBe('none');

    hidden.mockReturnValue(false);
    wait(SCARE_AFTER_MS);
    expect(video()).toBe('scare');
    hidden.mockRestore();
  });

  it('with reduced motion the video is skipped, but the scare still counts as spent', () => {
    renderHook(() => useScareTimer(true, true));
    dim();
    wait(SCARE_AFTER_MS);
    expect(video()).toBe('none');
    expect(useHolyWaterStore.getState().scared).toBe(true);
  });
});
