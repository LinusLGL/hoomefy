import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { useMansionStore } from '@/features/mansion/mansionStore';
import { ROOM_FURNITURE } from '@/features/mansion/spirits';
import {
  DARKNESS_ALPHA,
  DECAY_FACTOR,
  DECAY_INTERVAL_MS,
  CLICK_THROTTLE_MS,
  LIGHT_LEVELS,
  MIN_RADIUS,
  MIN_RADIUS_PX,
  decayedRadius,
  glowScale,
  levelOf,
  lightRadiusPx,
  useLightStore,
} from './candleLight';
import { CandleCursor } from './CandleCursor';
import { HauntingContext } from './hauntingEnvContext';
import { useCandleLight } from './useCandleLight';
import hauntedCss from '../../styles/haunted.css?raw';

const tick = (times = 1) =>
  act(() => {
    vi.advanceTimersByTime(DECAY_INTERVAL_MS * times);
  });

/** Register a room and then clear every spirit in it with one completed generation. */
function clearRoom(room: 'living-room' | 'bedroom', jobId: string) {
  act(() => {
    useMansionStore.getState().registerRoom(room, `seed-${room}`);
    useMansionStore.getState().applyJob(jobId, room, ROOM_FURNITURE[room]);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  useLightStore.getState().reset();
  useMansionStore.getState().reset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('light model', () => {
  it('starts at 30% and steps 30 -> 50 -> 80 -> 100', () => {
    expect([...LIGHT_LEVELS]).toEqual([30, 50, 80, 100]);
    const { lift } = useLightStore.getState();
    expect(useLightStore.getState().radius).toBe(30);
    lift();
    expect(useLightStore.getState().radius).toBe(50);
    useLightStore.getState().lift();
    expect(useLightStore.getState().radius).toBe(80);
    useLightStore.getState().lift();
    expect(useLightStore.getState().radius).toBe(100);
    useLightStore.getState().lift();
    expect(useLightStore.getState().radius).toBe(100); // stays at full light
  });

  it('burns lower by 10% of itself, and never below the floor', () => {
    expect(DECAY_FACTOR).toBe(0.9);
    expect(decayedRadius(100)).toBeCloseTo(90);
    expect(decayedRadius(30)).toBeCloseTo(27);
    expect(decayedRadius(MIN_RADIUS)).toBe(MIN_RADIUS);
    let r = 30;
    for (let i = 0; i < 100; i++) r = decayedRadius(r);
    expect(r).toBe(MIN_RADIUS);
  });

  it('dims 50% faster than the 5 second pace it had, and ends very dim', () => {
    // One burn-down step every 5000 / 1.5 ms: a rate of 0.3 steps a second instead of 0.2.
    expect(DECAY_INTERVAL_MS).toBe(Math.round(5000 / 1.5));
    expect(1000 / DECAY_INTERVAL_MS / (1000 / 5000)).toBeCloseTo(1.5, 2);
    // From the first light (30%) the floor is reached after nine steps, about 30 seconds.
    let r = 30;
    let steps = 0;
    while (r > MIN_RADIUS) {
      r = decayedRadius(r);
      steps += 1;
    }
    expect(steps).toBe(9);
    expect((steps * DECAY_INTERVAL_MS) / 1000).toBeLessThan(31);
    // The floor is a small circle: smaller than the 15% it used to be, and than the 30% it starts at.
    expect(MIN_RADIUS).toBeLessThan(15);
    expect(MIN_RADIUS).toBeLessThan(30);
    expect(lightRadiusPx(MIN_RADIUS, 1366, 768)).toBeLessThan(0.15 * 768);
  });

  it('a lift steps up from the step the light is burning down from', () => {
    // 22% burned down from the first step (30%), so the next step is 50%.
    useLightStore.setState({ radius: 22 });
    useLightStore.getState().lift();
    expect(useLightStore.getState().radius).toBe(50);
    // 45% burned down from 50%, so the next step is 80%.
    useLightStore.setState({ radius: 45 });
    useLightStore.getState().lift();
    expect(useLightStore.getState().radius).toBe(80);
    // 90% burned down from 100%: one lift restores the whole room.
    useLightStore.setState({ radius: 90 });
    useLightStore.getState().lift();
    expect(useLightStore.getState().radius).toBe(100);
  });

  it('knows which step the light is on', () => {
    expect([15, 27, 30].map(levelOf)).toEqual([0, 0, 0]);
    expect([31, 45, 50].map(levelOf)).toEqual([1, 1, 1]);
    expect([51, 80].map(levelOf)).toEqual([2, 2]);
    expect([81, 90, 100].map(levelOf)).toEqual([3, 3, 3]);
  });

  it('the flame glows more as the light grows', () => {
    expect(glowScale(30)).toBeCloseTo(1.005, 2);
    expect(glowScale(15)).toBeLessThan(glowScale(30));
    expect(glowScale(100)).toBeGreaterThan(glowScale(50));
    expect(glowScale(100)).toBeCloseTo(1.6, 2);
  });

  it('measures the radius against the shorter window side, with a pixel floor', () => {
    expect(lightRadiusPx(30, 1920, 1080)).toBeCloseTo(324);
    expect(lightRadiusPx(30, 700, 1200)).toBeCloseTo(210);
    expect(lightRadiusPx(15, 300, 300)).toBe(MIN_RADIUS_PX);
    expect(DARKNESS_ALPHA).toBe(0.8);
  });
});

describe('useCandleLight', () => {
  it('burns the candle down every 3.3 seconds while enabled', () => {
    renderHook(() => useCandleLight(true));
    tick();
    expect(useLightStore.getState().radius).toBeCloseTo(27);
    tick();
    expect(useLightStore.getState().radius).toBeCloseTo(24.3);
  });

  it('does not burn down when disabled or while the tab is hidden', () => {
    const off = renderHook(() => useCandleLight(false));
    tick(3);
    expect(useLightStore.getState().radius).toBe(30);
    off.unmount();

    renderHook(() => useCandleLight(true));
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    tick(3);
    expect(useLightStore.getState().radius).toBe(30);
    hidden.mockRestore();
    tick();
    expect(useLightStore.getState().radius).toBeCloseTo(27);
  });

  it('lifts one step each time a clear drives a spirit out, and not when spirits arrive', () => {
    renderHook(() => useCandleLight(true));

    act(() => useMansionStore.getState().registerRoom('living-room', 'a'));
    expect(useLightStore.getState().radius).toBe(30); // new spirits are not a clear

    clearRoom('living-room', 'job-1');
    expect(useLightStore.getState().radius).toBe(50);

    clearRoom('bedroom', 'job-2');
    expect(useLightStore.getState().radius).toBe(80);
  });

  it('does not lift for a generation that drives nothing out', () => {
    renderHook(() => useCandleLight(true));
    act(() => useMansionStore.getState().registerRoom('living-room', 'a'));
    act(() => {
      useMansionStore.getState().applyJob('job-x', 'living-room', []);
    });
    expect(useLightStore.getState().radius).toBe(30);
  });

  it('starts over when a new house is begun', () => {
    renderHook(() => useCandleLight(true));
    useLightStore.setState({ radius: 80 });
    // Finish the house, then start the next one.
    act(() => {
      const state = useMansionStore.getState();
      const house = state.houses[0];
      useMansionStore.setState({
        houses: [{ ...house, rooms: Object.fromEntries(['living-room', 'bedroom', 'kitchen', 'dining-room', 'office', 'bathroom', 'other'].map((r) => [r, { spirits: [], initial: ['lighting'], cleared: true }])) }],
      });
    });
    act(() => useMansionStore.getState().buildNextHouse());
    expect(useLightStore.getState().radius).toBe(30);
    expect(useLightStore.getState().radius).toBe(30);
  });

  it('reports the room fully lit at 100% and once the house is built', () => {
    const { result } = renderHook(() => useCandleLight(true));
    expect(result.current.lit).toBe(false);
    act(() => useLightStore.setState({ radius: 100 }));
    expect(result.current.lit).toBe(true);

    act(() => useLightStore.getState().reset());
    expect(result.current.lit).toBe(false);
    act(() => {
      const house = useMansionStore.getState().houses[0];
      useMansionStore.setState({
        houses: [{ ...house, rooms: Object.fromEntries(['living-room', 'bedroom', 'kitchen', 'dining-room', 'office', 'bathroom', 'other'].map((r) => [r, { spirits: [], initial: ['lighting'], cleared: true }])) }],
      });
    });
    expect(result.current.lit).toBe(true);
  });

  it('stops listening and ticking on unmount', () => {
    const view = renderHook(() => useCandleLight(true));
    view.unmount();
    tick(3);
    expect(useLightStore.getState().radius).toBe(30);
    clearRoom('living-room', 'job-after');
    expect(useLightStore.getState().radius).toBe(30);
  });
});

describe('clicking brightens the light', () => {
  const click = () => act(() => void document.body.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

  it('each click lifts one step: 30 -> 50 -> 80 -> 100', () => {
    renderHook(() => useCandleLight(true));
    click();
    expect(useLightStore.getState().radius).toBe(50);
    wait(CLICK_THROTTLE_MS + 10);
    click();
    expect(useLightStore.getState().radius).toBe(80);
    wait(CLICK_THROTTLE_MS + 10);
    click();
    expect(useLightStore.getState().radius).toBe(100);
    wait(CLICK_THROTTLE_MS + 10);
    click();
    expect(useLightStore.getState().radius).toBe(100);
  });

  it('a double-click counts once, so it cannot skip a step', () => {
    renderHook(() => useCandleLight(true));
    click();
    click();
    expect(useLightStore.getState().radius).toBe(50);
  });

  it('the light still shrinks afterwards, and a click starts the wait over', () => {
    renderHook(() => useCandleLight(true));
    click(); // 50%
    wait(DECAY_INTERVAL_MS - 100); // almost a full wait since the click: no shrink yet
    expect(useLightStore.getState().radius).toBe(50);
    click(); // 80%, timer starts over
    wait(DECAY_INTERVAL_MS - 100);
    expect(useLightStore.getState().radius).toBe(80); // would have shrunk without the restart
    wait(200);
    expect(useLightStore.getState().radius).toBeCloseTo(72);
  });

  it('a click brightens the candle again after it burned down', () => {
    renderHook(() => useCandleLight(true));
    wait(DECAY_INTERVAL_MS * 3); // 30 -> 21.87
    expect(useLightStore.getState().radius).toBeCloseTo(21.87, 1);
    click();
    expect(useLightStore.getState().radius).toBe(50);
  });

  it('clicks do nothing when the dark room is off, and the listener is removed on unmount', () => {
    const off = renderHook(() => useCandleLight(false));
    click();
    expect(useLightStore.getState().radius).toBe(30);
    off.unmount();

    const on = renderHook(() => useCandleLight(true));
    on.unmount();
    click();
    expect(useLightStore.getState().radius).toBe(30);
  });

  it('keyboard activation counts as a click', () => {
    renderHook(() => useCandleLight(true));
    act(() => void document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 })));
    expect(useLightStore.getState().radius).toBe(50);
  });

  it('clicks on elements that stop propagation still count (captured)', () => {
    renderHook(() => useCandleLight(true));
    const button = document.createElement('button');
    button.addEventListener('click', (e) => e.stopPropagation());
    document.body.appendChild(button);
    act(() => void button.click());
    document.body.removeChild(button);
    expect(useLightStore.getState().radius).toBe(50);
  });
});

describe('the candle reacts to the light', () => {
  const mountDark = () =>
    render(
      <HauntingContext.Provider value={{ reducedMotion: true, mobile: false }}>
        <CandleCursor darkness />
      </HauntingContext.Provider>
    );

  it('its glow grows as the light grows and shrinks as it burns down', () => {
    mountDark();
    const candle = screen.getByTestId('candle-cursor');
    const start = Number(candle.style.getPropertyValue('--hf-glow'));
    act(() => useLightStore.getState().lift());
    const lifted = Number(candle.style.getPropertyValue('--hf-glow'));
    expect(lifted).toBeGreaterThan(start);
    act(() => void vi.advanceTimersByTime(DECAY_INTERVAL_MS));
    expect(Number(candle.style.getPropertyValue('--hf-glow'))).toBeLessThan(lifted);
  });

  it('flares for a moment on every click, then settles', () => {
    mountDark();
    const candle = screen.getByTestId('candle-cursor');
    expect(candle.dataset.flare).toBe('false');
    act(() => void document.body.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(candle.dataset.flare).toBe('true');
    act(() => void vi.advanceTimersByTime(500));
    expect(candle.dataset.flare).toBe('false');
  });

  it('does not set a glow or flare when the dark room is off', () => {
    render(
      <HauntingContext.Provider value={{ reducedMotion: true, mobile: false }}>
        <CandleCursor />
      </HauntingContext.Provider>
    );
    const candle = screen.getByTestId('candle-cursor');
    expect(candle.style.getPropertyValue('--hf-glow')).toBe('');
    act(() => void document.body.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(candle.dataset.flare).toBe('false');
  });
});

describe('the dark room', () => {
  const mount = (darkness: boolean) =>
    render(
      <HauntingContext.Provider value={{ reducedMotion: true, mobile: false }}>
        <CandleCursor darkness={darkness} />
      </HauntingContext.Provider>
    );

  it('is only drawn when darkness is on', () => {
    mount(false);
    expect(screen.queryByTestId('candle-light')).toBeNull();
    cleanup();
    mount(true);
    expect(screen.getByTestId('candle-light')).toBeInTheDocument();
  });

  it('exposes the level and radius, and is decorative', () => {
    mount(true);
    const light = screen.getByTestId('candle-light');
    expect(light.dataset.level).toBe('0');
    expect(light.dataset.radius).toBe('30');
    expect(light.dataset.lit).toBe('false');
    expect(light.getAttribute('aria-hidden')).toBe('true');
  });

  it('follows the pointer exactly', () => {
    mount(true);
    act(() => {
      const ev = new MouseEvent('pointermove', { clientX: 420, clientY: 260, bubbles: true });
      Object.defineProperty(ev, 'pointerType', { value: 'mouse' });
      window.dispatchEvent(ev);
    });
    const light = screen.getByTestId('candle-light');
    expect(light.style.getPropertyValue('--hf-lx')).toBe('420px');
    expect(light.style.getPropertyValue('--hf-ly')).toBe('260px');
  });

  it('lights the whole room at 100%', () => {
    mount(true);
    act(() => useLightStore.setState({ radius: 100 }));
    expect(screen.getByTestId('candle-light').dataset.lit).toBe('true');
  });

  it('moves the light to the focused control when navigating by keyboard', () => {
    render(
      <HauntingContext.Provider value={{ reducedMotion: true, mobile: false }}>
        <button type="button">Go</button>
        <CandleCursor darkness />
      </HauntingContext.Provider>
    );
    const button = screen.getByRole('button', { name: 'Go' });
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 500, width: 80, height: 40, right: 180, bottom: 540, x: 100, y: 500, toJSON: () => ({}) });
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      button.focus();
    });
    const light = screen.getByTestId('candle-light');
    expect(light.style.getPropertyValue('--hf-lx')).toBe('140px');
    expect(light.style.getPropertyValue('--hf-ly')).toBe('520px');
  });

  it('does not jump the light to a control that was focused with the mouse', () => {
    render(
      <HauntingContext.Provider value={{ reducedMotion: true, mobile: false }}>
        <button type="button">Go</button>
        <CandleCursor darkness />
      </HauntingContext.Provider>
    );
    const light = screen.getByTestId('candle-light');
    const before = light.style.getPropertyValue('--hf-lx');
    act(() => screen.getByRole('button', { name: 'Go' }).focus());
    expect(light.style.getPropertyValue('--hf-lx')).toBe(before);
  });
});

describe('the stylesheet', () => {
  it('is 80% dark with a clear core, sits under the ghosts/controls and over the page, and never blocks clicks', () => {
    const block = hauntedCss.match(/\.hf-candlelight\s*\{[^}]*\}/)?.[0] ?? '';
    expect(block).toMatch(/pointer-events:\s*none/);
    expect(block).toMatch(/rgba\(5, 3, 4, 0\.8\)/);
    expect(block).toMatch(/rgba\(5, 3, 4, 0\)\s+calc\(var\(--hf-light-r\) \* 0\.55\)/); // clear core
    const z = Number(block.match(/z-index:\s*(\d+)/)?.[1]);
    expect(z).toBeGreaterThan(1); // above the page
    expect(z).toBeLessThan(8000); // below the ghosts
  });

  it('respects reduced motion (no radius easing)', () => {
    expect(hauntedCss).toMatch(/data-motion='reduced'\]\s*\.hf-candlelight\s*\{[^}]*transition:\s*none/);
  });
});
