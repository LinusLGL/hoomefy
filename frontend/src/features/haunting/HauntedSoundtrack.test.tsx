import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { useHauntingStore } from './hauntingStore';

const track = vi.hoisted(() => ({
  state: 'idle' as 'idle' | 'sting' | 'ambient',
  playSting: vi.fn(),
  playAmbient: vi.fn(),
  stop: vi.fn(),
  dispose: vi.fn(),
}));

vi.mock('./soundtrack', () => ({
  createSoundtrack: () => track,
}));

import { HauntedSoundtrack } from './HauntedSoundtrack';

const set = (partial: Partial<ReturnType<typeof useHauntingStore.getState>>) => act(() => useHauntingStore.setState(partial));

beforeEach(() => {
  track.state = 'idle';
  track.playSting.mockReset().mockImplementation(() => {
    track.state = 'sting';
  });
  track.playAmbient.mockReset();
  track.stop.mockReset().mockImplementation(() => {
    track.state = 'idle';
  });
  track.dispose.mockReset();
  useHauntingStore.setState({
    experience: 'elegant',
    horrorEnabled: true,
    audioEnabled: true,
    sequence: 'idle',
    phase: 'none',
  });
});
afterEach(() => {
  vi.clearAllMocks();
});

describe('HauntedSoundtrack', () => {
  it('is silent in the Elegant experience', () => {
    render(<HauntedSoundtrack />);
    expect(track.playSting).not.toHaveBeenCalled();
    expect(track.playAmbient).not.toHaveBeenCalled();
  });

  it('plays the sting when the takeover is triggered', () => {
    render(<HauntedSoundtrack />);
    set({ sequence: 'running', phase: 'A' });

    expect(track.playSting).toHaveBeenCalledTimes(1);
  });

  it('does not restart the sting as the takeover changes the experience part-way through', () => {
    render(<HauntedSoundtrack />);
    set({ sequence: 'running', phase: 'A' });
    set({ experience: 'haunted', phase: 'C' });
    set({ sequence: 'idle', phase: 'none' });

    expect(track.playSting).toHaveBeenCalledTimes(1);
    // When the takeover ends the soundtrack is asked for the ambient loop; it queues behind the sting.
    expect(track.playAmbient).toHaveBeenCalled();
  });

  it('plays only the ambient loop when the page loads already Haunted', () => {
    set({ experience: 'haunted', sequence: 'idle' });
    render(<HauntedSoundtrack />);

    expect(track.playSting).not.toHaveBeenCalled();
    expect(track.playAmbient).toHaveBeenCalledTimes(1);
  });

  it('plays the sting when Haunted mode is chosen from the settings', () => {
    render(<HauntedSoundtrack />);
    set({ experience: 'haunted' });

    expect(track.playSting).toHaveBeenCalledTimes(1);
  });

  it('stops when switching back to Elegant', () => {
    set({ experience: 'haunted' });
    render(<HauntedSoundtrack />);
    set({ experience: 'elegant' });

    expect(track.stop).toHaveBeenCalled();
  });

  it('stops when horror effects are turned off', () => {
    set({ experience: 'haunted' });
    render(<HauntedSoundtrack />);
    set({ horrorEnabled: false, experience: 'elegant' });

    expect(track.stop).toHaveBeenCalled();
  });

  it('muting stops the sound, and unmuting brings the ambient loop back', () => {
    set({ experience: 'haunted' });
    render(<HauntedSoundtrack />);
    track.playAmbient.mockClear();

    set({ audioEnabled: false });
    expect(track.stop).toHaveBeenCalled();
    expect(track.playSting).not.toHaveBeenCalled();

    set({ audioEnabled: true });
    expect(track.playAmbient).toHaveBeenCalledTimes(1);
    expect(track.playSting).not.toHaveBeenCalled();
  });

  it('stays silent through a takeover while muted', () => {
    set({ audioEnabled: false });
    render(<HauntedSoundtrack />);
    set({ sequence: 'running', phase: 'A' });

    expect(track.playSting).not.toHaveBeenCalled();
  });

  it('a replay starts the sting again', () => {
    set({ experience: 'haunted', takeoverSeen: true });
    render(<HauntedSoundtrack />);
    act(() => useHauntingStore.getState().replay());
    set({ sequence: 'running', phase: 'A' });

    expect(track.stop).toHaveBeenCalled();
    expect(track.playSting).toHaveBeenCalledTimes(1);
  });

  it('releases the audio on unmount', () => {
    const { unmount } = render(<HauntedSoundtrack />);
    unmount();

    expect(track.dispose).toHaveBeenCalled();
  });
});
