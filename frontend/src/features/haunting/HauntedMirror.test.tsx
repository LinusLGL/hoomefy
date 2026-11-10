import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useHolyWaterStore } from '@/features/holywater/holyWaterStore';
import { HauntedMirror } from './HauntedMirror';
import { useHauntingStore } from './hauntingStore';

const reduced = vi.hoisted(() => ({ on: false }));
vi.mock('./env', async (importOriginal) => ({ ...(await importOriginal<typeof import('./env')>()), prefersReducedMotion: () => reduced.on }));

const resetHaunting = (over: Partial<ReturnType<typeof useHauntingStore.getState>> = {}) =>
  useHauntingStore.setState({
    experience: 'elegant',
    horrorEnabled: true,
    takeoverSeen: false,
    sequence: 'idle',
    phase: 'none',
    takeoverRequest: 0,
    takeoverReason: null,
    busy: false,
    busyKeys: [],
    ...over,
  });

const mirror = () => screen.getByRole('button', { name: /Statement mirror/ });
const hw = () => useHolyWaterStore.getState();

beforeEach(() => {
  sessionStorage.clear();
  reduced.on = false;
  resetHaunting();
  useHolyWaterStore.setState({ foundIn: null, scared: false, cured: false, openRoom: null, armed: false, video: 'none' });
});
afterEach(cleanup);

describe('the statement mirror in Elegant', () => {
  it('lets the haunting in on the very first press', async () => {
    render(<HauntedMirror />);
    await userEvent.click(mirror());
    expect(useHauntingStore.getState()).toMatchObject({ takeoverRequest: 1, takeoverReason: 'mirror' });
    expect(hw().video).toBe('none');
  });

  it('works again for someone who has seen the reveal before', async () => {
    resetHaunting({ takeoverSeen: true });
    render(<HauntedMirror />);
    await userEvent.click(mirror());
    expect(useHauntingStore.getState().takeoverRequest).toBe(1);
  });

  it('works with reduced motion too: the takeover has its own calm path', async () => {
    reduced.on = true;
    render(<HauntedMirror />);
    await userEvent.click(mirror());
    expect(useHauntingStore.getState().takeoverRequest).toBe(1);
  });

  it('does nothing for someone who switched the horror effects off', async () => {
    resetHaunting({ horrorEnabled: false });
    render(<HauntedMirror />);
    await userEvent.click(mirror());
    expect(useHauntingStore.getState().takeoverRequest).toBe(0);
  });
});

describe('the statement mirror in Haunted', () => {
  beforeEach(() => resetHaunting({ experience: 'haunted', takeoverSeen: true }));

  it('plays the jumpscare, and plays it again each time it is pressed', async () => {
    render(<HauntedMirror />);
    await userEvent.click(mirror());
    expect(hw().video).toBe('scare');
    expect(useHauntingStore.getState().takeoverRequest).toBe(0);

    hw().finishVideo();
    expect(hw().video).toBe('none');
    await userEvent.click(mirror());
    expect(hw().video).toBe('scare');
  });

  it('does not start a second video on top of the one that is playing', async () => {
    useHolyWaterStore.setState({ video: 'cure' });
    render(<HauntedMirror />);
    await userEvent.click(mirror());
    expect(hw().video).toBe('cure');
  });

  it('plays no video with reduced motion, or while a sequence runs, or with the effects off', async () => {
    render(<HauntedMirror />);
    reduced.on = true;
    await userEvent.click(mirror());
    expect(hw().video).toBe('none');

    reduced.on = false;
    resetHaunting({ experience: 'haunted', sequence: 'running' });
    await userEvent.click(mirror());
    expect(hw().video).toBe('none');

    resetHaunting({ experience: 'haunted', horrorEnabled: false });
    await userEvent.click(mirror());
    expect(hw().video).toBe('none');
  });
});
