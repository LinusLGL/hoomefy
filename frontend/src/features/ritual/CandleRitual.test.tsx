import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useHauntingStore } from '@/features/haunting/hauntingStore';
import { CandleRitual, FINALE_MAX_MS, FINALE_SILENT_MS } from './CandleRitual';
import { RITUAL_INTRO, RITUAL_MESSAGES } from './ritualState';
import { CANDLES } from './geometry';

const audio = vi.hoisted(() => ({ plays: [] as string[], onEnded: undefined as (() => void) | undefined, stops: 0 }));

vi.mock('./scriptAudio', () => ({
  createScriptPlayer: () => ({
    preload: vi.fn(),
    play: (url: string, cb?: () => void) => {
      audio.plays.push(url);
      audio.onEnded = cb;
    },
    stop: () => {
      audio.stops += 1;
    },
  }),
}));

const candle = (id: string) => document.querySelector(`button.rt-candle[data-candle="${id}"]`) as HTMLButtonElement;
const light = (id: string) => fireEvent.click(candle(id));
const ALL = CANDLES.map((c) => c.id);

function mount(props: Partial<{ open: boolean }> = {}) {
  const onComplete = vi.fn();
  const onClose = vi.fn();
  const view = render(<CandleRitual open={props.open ?? true} onComplete={onComplete} onClose={onClose} />);
  return { onComplete, onClose, ...view };
}

beforeEach(() => {
  audio.plays = [];
  audio.onEnded = undefined;
  audio.stops = 0;
  useHauntingStore.setState({ audioEnabled: true });
});

afterEach(() => {
  vi.useRealTimers();
  delete document.documentElement.dataset.ritual;
});

describe('CandleRitual', () => {
  it('renders nothing while closed', () => {
    mount({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens as a labelled modal dialog with five unlit candles and an invitation', () => {
    mount();
    const dialog = screen.getByRole('dialog', { name: /ritual of the five flames/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(document.querySelectorAll('button.rt-candle')).toHaveLength(5);
    for (const id of ALL) expect(candle(id)).toHaveAttribute('data-lit', 'false');
    expect(screen.getByTestId('ritual-message')).toHaveTextContent(RITUAL_INTRO);
    expect(screen.getByTestId('ritual-count')).toHaveAttribute('aria-label', '0 of 5 flames lit');
    expect(document.documentElement.dataset.ritual).toBe('open');
  });

  it('gives every candle a name a screen reader can say', () => {
    mount();
    expect(screen.getByRole('button', { name: 'Light the top candle' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Light the left candle' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Light the right candle' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Light the lower left candle' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Light the lower right candle' })).toBeInTheDocument();
  });

  it('lights a candle, shows the first line and plays the first recording', () => {
    mount();
    light('left');
    expect(candle('left')).toHaveAttribute('data-lit', 'true');
    expect(screen.getByRole('button', { name: 'The left candle is lit' })).toBeInTheDocument();
    expect(screen.getByTestId('ritual-message')).toHaveTextContent(RITUAL_MESSAGES[0]);
    expect(audio.plays).toEqual(['/audio/ritual/script1.mp3']);
    expect(screen.getByTestId('ritual-count')).toHaveAttribute('aria-label', '1 of 5 flames lit');
  });

  it('lets any candle be lit in any order; the line depends on how many are lit', () => {
    mount();
    const order = ['bottom-right', 'top', 'bottom-left', 'right'];
    order.forEach((id, i) => {
      light(id);
      expect(screen.getByTestId('ritual-message')).toHaveTextContent(RITUAL_MESSAGES[i]);
      expect(audio.plays[i]).toBe(`/audio/ritual/script${i + 1}.mp3`);
    });
    expect(candle('left')).toHaveAttribute('data-lit', 'false');
  });

  it('ignores a second touch on a candle that is already lit', () => {
    mount();
    light('top');
    light('top');
    expect(audio.plays).toHaveLength(1);
    expect(screen.getByTestId('ritual-message')).toHaveTextContent(RITUAL_MESSAGES[0]);
  });

  it('is silent when sound is muted, but still shows the words', () => {
    useHauntingStore.setState({ audioEnabled: false });
    mount();
    light('top');
    expect(audio.plays).toEqual([]);
    expect(screen.getByTestId('ritual-message')).toHaveTextContent(RITUAL_MESSAGES[0]);
  });

  it('puts the whole sentence in the page at once (the words fade in, but a screen reader reads it all)', () => {
    mount();
    light('top');
    const text = screen.getByTestId('ritual-message').textContent ?? '';
    expect(text.replace(/\s+/g, ' ').trim()).toBe(RITUAL_MESSAGES[0]);
  });

  it('calls onComplete exactly once, the moment the fifth candle is lit', () => {
    const { onComplete } = mount();
    ALL.slice(0, 4).forEach(light);
    expect(onComplete).not.toHaveBeenCalled();
    light(ALL[4]);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('ritual-message')).toHaveTextContent(RITUAL_MESSAGES[4]);
    expect(screen.getByTestId('candle-ritual')).toHaveAttribute('data-complete', 'true');
    expect(audio.plays[4]).toBe('/audio/ritual/script5.mp3');
    // touching a lit candle afterwards cannot complete it again
    light('top');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('after the last voice ends, rests a moment and then fades away and closes', () => {
    vi.useFakeTimers();
    const { onClose } = mount();
    ALL.forEach(light);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onClose).not.toHaveBeenCalled(); // the voice is still speaking
    act(() => audio.onEnded?.());
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(screen.getByTestId('candle-ritual')).toHaveAttribute('data-leaving', 'true');
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not wait forever for a voice that never ends', () => {
    vi.useFakeTimers();
    const { onClose } = mount();
    ALL.forEach(light);
    act(() => {
      vi.advanceTimersByTime(FINALE_MAX_MS);
    });
    expect(screen.getByTestId('candle-ritual')).toHaveAttribute('data-leaving', 'true');
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('gives the last line reading time when it is not spoken, then closes', () => {
    vi.useFakeTimers();
    useHauntingStore.setState({ audioEnabled: false });
    const { onClose } = mount();
    ALL.forEach(light);
    act(() => {
      vi.advanceTimersByTime(FINALE_SILENT_MS - 100);
    });
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByTestId('candle-ritual')).toHaveAttribute('data-leaving', 'true');
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape leaves the circle early without completing the ritual', () => {
    const { onComplete, onClose } = mount();
    light('top');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('the close button leaves the circle early too', () => {
    const { onComplete, onClose } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Leave the circle' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('after the fifth candle, the close button only dismisses; the design has already begun', () => {
    vi.useFakeTimers();
    const { onComplete, onClose } = mount();
    ALL.forEach(light);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('keeps Tab inside the dialog', () => {
    mount();
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.rt-ritual button'));
    const last = buttons[buttons.length - 1];
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(buttons[0]);
    fireEvent.keyDown(buttons[0], { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('stops the voice and gives the page back when it closes', () => {
    const { unmount } = mount();
    light('top');
    unmount();
    expect(audio.stops).toBeGreaterThan(0);
    expect(document.documentElement.dataset.ritual).toBeUndefined();
  });
});
