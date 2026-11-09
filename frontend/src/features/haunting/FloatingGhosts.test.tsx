import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { FloatingGhosts } from './FloatingGhosts';
import { HauntingContext } from './hauntingEnvContext';
import { useMansionStore } from '@/features/mansion/mansionStore';
import { ROOM_SLOTS } from '@/features/mansion/spirits';
import hauntedCss from '../../styles/haunted.css?raw';

const mount = (env: { reducedMotion?: boolean; mobile?: boolean } = {}) =>
  render(
    <HauntingContext.Provider value={{ reducedMotion: env.reducedMotion ?? false, mobile: env.mobile ?? false }}>
      <FloatingGhosts />
    </HauntingContext.Provider>
  );

const count = () => screen.getAllByTestId('floating-ghost').length;

/** Clear the first `n` rooms of the active house. */
function clearRooms(n: number) {
  const s = useMansionStore.getState();
  ROOM_SLOTS.slice(0, n).forEach((room, i) => {
    s.registerRoom(room, `seed-${i}`);
    const spirits = useMansionStore.getState().houses[0].rooms[room]?.spirits ?? [];
    useMansionStore.getState().applyJob(`job-${room}`, room, spirits);
  });
}

beforeEach(() => {
  window.localStorage.clear();
  useMansionStore.getState().reset();
});
afterEach(cleanup);

describe('FloatingGhosts', () => {
  it('is decorative: aria-hidden, no focusable content', () => {
    mount();
    const root = screen.getByTestId('floating-ghosts');
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelectorAll('a, button, input, [tabindex]')).toHaveLength(0);
  });

  it('shows three ghosts while the mansion is fully haunted', () => {
    mount();
    expect(count()).toBe(3);
  });

  it('thins out as rooms are cleared, but never below one', () => {
    clearRooms(5); // 2 uncleared
    mount();
    expect(count()).toBe(2);
    cleanup();
    clearRooms(6); // 1 uncleared
    mount();
    expect(count()).toBe(1);
    cleanup();
    clearRooms(7); // none uncleared
    mount();
    expect(count()).toBe(1);
  });

  it('reacts live when a room is cleared while it is on screen', () => {
    clearRooms(4); // 3 uncleared -> 3 ghosts
    mount();
    expect(count()).toBe(3);
    act(() => {
      const room = ROOM_SLOTS[4];
      useMansionStore.getState().registerRoom(room, 'live');
      // read the state AFTER registering: the earlier snapshot would not contain the new room
      const spirits = useMansionStore.getState().houses[0].rooms[room]?.spirits ?? [];
      useMansionStore.getState().applyJob('live-job', room, spirits);
    });
    expect(count()).toBe(2);
  });

  it('shows at most two on mobile', () => {
    mount({ mobile: true });
    expect(count()).toBe(2);
  });

  it('stands still and is fainter with reduced motion', () => {
    mount();
    const normal = parseFloat(screen.getAllByTestId('floating-ghost')[0].style.opacity);
    cleanup();
    mount({ reducedMotion: true });
    const reduced = parseFloat(screen.getAllByTestId('floating-ghost')[0].style.opacity);
    expect(screen.getByTestId('floating-ghosts').dataset.still).toBe('true');
    expect(reduced).toBeLessThan(normal);
  });

  it('keeps every ghost translucent: peak opacity of the ghost layer stays below 0.3', () => {
    mount();
    for (const g of screen.getAllByTestId('floating-ghost')) {
      expect(parseFloat(g.style.opacity)).toBeLessThan(0.3);
    }
  });

  it('gives each ghost its own slow drift and bob timing', () => {
    mount();
    const drifts = screen.getAllByTestId('floating-ghost').map((g) => parseFloat(g.style.getPropertyValue('--hf-drift-s')));
    expect(new Set(drifts).size).toBe(drifts.length);
    drifts.forEach((d) => expect(d).toBeGreaterThanOrEqual(60)); // slow: at least a minute per traverse
  });
});

describe('floating ghost styles', () => {
  it('cannot be clicked, never blocks the page, and sits along the bottom', () => {
    expect(hauntedCss).toMatch(/\.hf-ghosts\s*\{[^}]*pointer-events:\s*none/);
    expect(hauntedCss).toMatch(/\.hf-ghosts\s*\{[^}]*position:\s*fixed/);
    expect(hauntedCss).toMatch(/\.hf-ghosts\s*\{[^}]*bottom:\s*0/);
    expect(hauntedCss).toMatch(/\.hf-ghosts\s*\{[^}]*mix-blend-mode:\s*screen/);
  });

  it('animates with compositor-only transforms and stops for reduced motion', () => {
    expect(hauntedCss).toMatch(/@keyframes hf-ghost-drift\s*\{[^}]*transform/);
    expect(hauntedCss).toMatch(/@keyframes hf-ghost-bob\s*\{[^}]*transform/);
    expect(hauntedCss).toMatch(/data-motion='reduced'\]\s*\.hf-ghost/);
    expect(hauntedCss).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.hf-ghost/);
  });
});
