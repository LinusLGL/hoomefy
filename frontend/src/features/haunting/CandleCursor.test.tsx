import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { CandleCursor } from './CandleCursor';
import { HauntingContext } from './hauntingEnvContext';
import hauntedCss from '../../styles/haunted.css?raw';

const html = document.documentElement;

const mount = (reducedMotion = false, darkness = false) =>
  render(
    <HauntingContext.Provider value={{ reducedMotion, mobile: false }}>
      <button type="button">A button</button>
      <p data-testid="plain">plain text</p>
      <input aria-label="name" />
      <CandleCursor darkness={darkness} />
    </HauntingContext.Provider>
  );

const candle = () => screen.getByTestId('candle-cursor');
const move = (x: number, y: number, pointerType = 'mouse') => {
  act(() => {
    // jsdom's PointerEvent support is partial; a MouseEvent carrying pointerType is enough here.
    const ev = new MouseEvent('pointermove', { clientX: x, clientY: y, bubbles: true });
    Object.defineProperty(ev, 'pointerType', { value: pointerType });
    window.dispatchEvent(ev);
  });
};

afterEach(() => {
  cleanup();
  delete html.dataset.candle;
  vi.restoreAllMocks();
});

describe('CandleCursor', () => {
  it('hides the native cursor only once the candle is drawn, and only while mounted', () => {
    expect(html.dataset.candle).toBeUndefined();
    const { unmount } = mount(true);
    // Mounted but the candle has not appeared yet: the system pointer must still be there.
    expect(html.dataset.candle).toBeUndefined();
    move(50, 50);
    expect(html.dataset.candle).toBe('on');
    unmount();
    expect(html.dataset.candle).toBeUndefined();
  });

  it('keeps the system pointer while the candle is mounted but nothing has moved', () => {
    mount(true);
    expect(candle().dataset.visible).toBe('false');
    expect(html.dataset.candle).toBeUndefined();
  });

  it('recovers when the element under a still pointer changes (a text field disappears)', () => {
    vi.useFakeTimers();
    try {
      const under = { current: null as Element | null };
      Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => under.current });
      mount(true);
      move(10, 10);
      under.current = screen.getByLabelText('name');
      act(() => {
        vi.advanceTimersByTime(350);
      });
      expect(candle().dataset.text).toBe('true');

      // The field goes away and the mouse does not move.
      under.current = screen.getByTestId('plain');
      act(() => {
        vi.advanceTimersByTime(350);
      });
      expect(candle().dataset.text).toBe('false');
    } finally {
      delete (document as unknown as Record<string, unknown>).elementFromPoint;
      vi.useRealTimers();
    }
  });

  it('shows again after the pointer left the window and came back, even without a move', () => {
    mount(true);
    move(40, 40);
    act(() => {
      html.dispatchEvent(new MouseEvent('mouseleave'));
    });
    act(() => {
      html.dispatchEvent(new MouseEvent('mouseenter'));
    });
    expect(candle().dataset.visible).toBe('true');
    expect(html.dataset.candle).toBe('on');
  });

  it('keeps the position when the preference that re-creates its listeners changes', () => {
    const view = render(
      <HauntingContext.Provider value={{ reducedMotion: true, mobile: false }}>
        <CandleCursor />
      </HauntingContext.Provider>
    );
    move(222, 111);
    view.rerender(
      <HauntingContext.Provider value={{ reducedMotion: true, mobile: false }}>
        <CandleCursor darkness />
      </HauntingContext.Provider>
    );
    expect(candle().dataset.visible).toBe('true');
    expect(candle().style.transform).toBe('translate3d(222px, 111px, 0)');
    expect(html.dataset.candle).toBe('on');
  });

  it('is decorative: aria-hidden and not part of the accessibility tree', () => {
    mount();
    expect(candle().getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('stays hidden until the mouse first moves, then follows the pointer with the flame on it', () => {
    mount(true); // reduced motion: positions immediately, no easing
    expect(candle().dataset.visible).toBe('false');
    move(300, 220);
    expect(candle().dataset.visible).toBe('true');
    expect(candle().style.transform).toBe('translate3d(300px, 220px, 0)');
    move(512, 64);
    expect(candle().style.transform).toBe('translate3d(512px, 64px, 0)');
  });

  it('eases toward the pointer when motion is allowed (and snaps on first appearance)', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    mount(false);
    move(100, 100);
    expect(candle().style.transform).toBe('translate3d(100px, 100px, 0)');
    move(500, 500);
    expect(raf).toHaveBeenCalled(); // an easing frame was scheduled instead of jumping
    expect(candle().style.transform).toBe('translate3d(100px, 100px, 0)');
  });

  it('ignores touch pointers', () => {
    mount(true);
    move(200, 200, 'touch');
    expect(candle().dataset.visible).toBe('false');
  });

  it('grows the flame over interactive elements and calms down over plain content', () => {
    mount(true);
    move(10, 10);
    fireEvent.pointerOver(screen.getByRole('button', { name: 'A button' }));
    expect(candle().dataset.hot).toBe('true');
    fireEvent.pointerOver(screen.getByTestId('plain'));
    expect(candle().dataset.hot).toBe('false');
  });

  it('hides over text fields so the I-beam is used', () => {
    mount(true);
    move(10, 10);
    fireEvent.pointerOver(screen.getByLabelText('name'));
    expect(candle().dataset.text).toBe('true');
    fireEvent.pointerOver(screen.getByTestId('plain'));
    expect(candle().dataset.text).toBe('false');
  });

  it('hides when the pointer leaves the window and returns when it comes back', () => {
    mount(true);
    move(40, 40);
    act(() => {
      html.dispatchEvent(new MouseEvent('mouseleave'));
    });
    expect(candle().dataset.visible).toBe('false');
    act(() => {
      html.dispatchEvent(new MouseEvent('mouseenter'));
    });
    expect(candle().dataset.visible).toBe('true');
  });

  it('removes every listener and cancels animation on unmount', () => {
    const removeWin = vi.spyOn(window, 'removeEventListener');
    const removeDoc = vi.spyOn(document, 'removeEventListener');
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 7);
    const { unmount } = mount(false);
    move(10, 10);
    move(400, 400);
    unmount();
    expect(removeWin.mock.calls.some(([type]) => type === 'pointermove')).toBe(true);
    expect(removeDoc.mock.calls.some(([type]) => type === 'pointerover')).toBe(true);
    expect(cancel).toHaveBeenCalledWith(7);
  });

  it('does not move the real pointer or block clicks (pointer-events: none in the stylesheet)', () => {
    expect(hauntedCss).toMatch(/\.hf-candle\s*\{[^}]*pointer-events:\s*none/);
    // above the settings/skip controls (9600) so the candle is never hidden behind them
    expect(hauntedCss).toMatch(/\.hf-candle\s*\{[^}]*z-index:\s*9700/);
  });

  it('keeps the I-beam for text fields and only hides the cursor when the candle is mounted', () => {
    expect(hauntedCss).toMatch(/html\[data-candle='on'\]\s*\*\s*\{[^}]*cursor:\s*none/);
    expect(hauntedCss).toMatch(/cursor:\s*text\s*!important/);
  });

  it('does not animate the flame for reduced motion', () => {
    expect(hauntedCss).toMatch(/data-motion='reduced'\]\s*\.hf-candle__flame/);
  });

  it('uses additive (screen) blending for the glow so it can never darken text', () => {
    expect(hauntedCss).toMatch(/\.hf-candle__halo\s*\{[^}]*mix-blend-mode:\s*screen/);
  });
});
