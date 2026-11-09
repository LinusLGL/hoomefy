/**
 * Integration tests: the real provider, overlay, controller, controls and store
 * wired together, with the real GSAP timeline. Sequences are ended with Skip (the
 * feature under test) instead of waiting six seconds.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { gsap } from 'gsap';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { HauntedExperienceProvider } from './HauntedExperienceProvider';
import { useHauntingStore } from './hauntingStore';
import { registry } from './registry';
import { GlitchText } from './GlitchText';
import { TOKEN_NAMES, varName } from './palettes';
import hauntedCss from '../../styles/haunted.css?raw';
import { useStudioStore } from '@/stores/studioStore';
import { useAuthStore } from '@/stores/authStore';

const html = document.documentElement;
const s = () => useHauntingStore.getState();

const resetStore = (overrides: Partial<ReturnType<typeof s>> = {}) =>
  useHauntingStore.setState({
    experience: 'elegant',
    horrorEnabled: true,
    takeoverSeen: false,
    sequence: 'idle',
    phase: 'none',
    takeoverRequest: 0,
    takeoverReason: null,
    skipRequest: 0,
    mirrorTouches: 0,
    audioEnabled: true,
    busy: false,
    busyKeys: [],
    ...overrides,
  });

function App() {
  const [note, setNote] = useState('');
  return (
    <main data-testid="app">
      <header data-distort>
        <nav aria-label="Main">
          <a href="#studio">Studio</a>
        </nav>
      </header>
      <GlitchText as="h1" text="Hello world" />
      <input aria-label="note" value={note} onChange={(e) => setNote(e.target.value)} />
      <button type="button">Primary action</button>
    </main>
  );
}

const mount = () =>
  render(
    <MemoryRouter>
      <HauntedExperienceProvider>
        <App />
      </HauntedExperienceProvider>
    </MemoryRouter>
  );

let rectSpy: { mockRestore: () => void };

beforeEach(() => {
  resetStore();
  window.localStorage.clear();
  rectSpy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 400,
    bottom: 80,
    width: 400,
    height: 80,
    toJSON: () => ({}),
  } as DOMRect);
});

afterEach(() => {
  cleanup();
  gsap.globalTimeline.clear();
  for (const t of TOKEN_NAMES) html.style.removeProperty(varName(t));
  html.removeAttribute('data-experience');
  html.removeAttribute('data-takeover');
  html.removeAttribute('data-horror');
  html.removeAttribute('data-motion');
  rectSpy.mockRestore();
});

const startTakeover = async (reason: 'scroll' | 'replay' = 'scroll') => {
  await act(async () => {
    s().requestTakeover(reason);
  });
};

describe('HauntedExperienceProvider: document state', () => {
  it('reflects the stored experience on <html>', async () => {
    mount();
    expect(html.dataset.experience).toBe('elegant');
    expect(html.dataset.horror).toBe('on');
    await act(async () => {
      s().chooseHaunted();
    });
    expect(html.dataset.experience).toBe('haunted');
  });

  it('forces the Elegant palette when horror effects are disabled', async () => {
    resetStore({ experience: 'haunted' });
    mount();
    expect(html.dataset.experience).toBe('haunted');
    await act(async () => {
      s().disableHorror();
    });
    expect(html.dataset.experience).toBe('elegant');
    expect(html.dataset.horror).toBe('off');
    expect(screen.queryByTestId('haunted-background')).toBeNull();
  });

  it('marks reduced motion on <html>', () => {
    const mm = vi
      .spyOn(window, 'matchMedia')
      .mockImplementation(
        (q: string) =>
          ({
            matches: q.includes('reduce'),
            media: q,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          }) as unknown as MediaQueryList
      );
    try {
      mount();
      expect(html.dataset.motion).toBe('reduced');
    } finally {
      mm.mockRestore();
    }
  });

  it('registers the overlay so the controller can find it, and unregisters on unmount', () => {
    const { unmount } = mount();
    expect(registry.overlay).not.toBeNull();
    unmount();
    expect(registry.overlay).toBeNull();
  });
});

describe('takeover sequence', () => {
  it('starts on a scroll request, exposes the phase and a Skip control, and leaves Elegant until the swap', async () => {
    mount();
    await startTakeover();

    expect(s().sequence).toBe('running');
    expect(html.dataset.takeover).toBe('A');
    expect(screen.getByTestId('skip-transition')).toBeInTheDocument();
    expect(html.dataset.experience).toBe('elegant');
  });

  it('Skip jumps to the finished Haunted state and removes the Skip control', async () => {
    const user = userEvent.setup();
    mount();
    await startTakeover();

    await user.click(screen.getByTestId('skip-transition'));

    await waitFor(() => expect(s().sequence).toBe('idle'));
    expect(s().experience).toBe('haunted');
    expect(s().takeoverSeen).toBe(true);
    expect(html.dataset.experience).toBe('haunted');
    expect(html.dataset.takeover).toBeUndefined();
    expect(screen.queryByTestId('skip-transition')).toBeNull();
    expect(TOKEN_NAMES.filter((t) => html.style.getPropertyValue(varName(t)))).toEqual([]);
  });

  it('Escape also skips', async () => {
    const user = userEvent.setup();
    mount();
    await startTakeover();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(s().experience).toBe('haunted'));
    expect(s().sequence).toBe('idle');
  });

  it('never replays automatically once seen', async () => {
    mount();
    await startTakeover();
    await act(async () => {
      s().requestSkip();
    });
    await waitFor(() => expect(s().sequence).toBe('idle'));

    await act(async () => {
      expect(s().requestTakeover('scroll')).toBe(false);
    });
    expect(s().sequence).toBe('idle');
  });

  it('does not remount or reset the application: same DOM nodes, typed text and other stores survive', async () => {
    const user = userEvent.setup();
    useStudioStore.setState({ roomType: 'bedroom', selectedStyle: 'japandi' });
    useAuthStore.setState({ isAuthenticated: true });
    mount();

    const input = screen.getByLabelText('note') as HTMLInputElement;
    const heading = screen.getByRole('heading', { name: 'Hello world' });
    await user.type(input, 'my notes');

    await startTakeover();
    await user.click(screen.getByTestId('skip-transition'));
    await waitFor(() => expect(s().experience).toBe('haunted'));

    expect(screen.getByLabelText('note')).toBe(input);
    expect(screen.getByRole('heading', { name: 'Hello world' })).toBe(heading);
    expect(input.value).toBe('my notes');
    expect(useStudioStore.getState().roomType).toBe('bedroom');
    expect(useStudioStore.getState().selectedStyle).toBe('japandi');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('keeps the page interactive while the sequence runs (nothing blocks the user)', async () => {
    const user = userEvent.setup();
    mount();
    await startTakeover();
    expect(s().sequence).toBe('running');

    const onClick = vi.fn();
    screen.getByRole('button', { name: 'Primary action' }).addEventListener('click', onClick);
    await user.click(screen.getByRole('button', { name: 'Primary action' }));
    await user.type(screen.getByLabelText('note'), 'still typing');

    expect(onClick).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText('note') as HTMLInputElement).value).toBe('still typing');
    expect(screen.getByRole('link', { name: 'Studio' })).toBeVisible();
  });
});

describe('never interrupts running work', () => {
  it('defers a scroll takeover while an upload or generation is in flight, then runs it', async () => {
    mount();
    await act(async () => {
      s().setBusy('generation', true);
    });
    await startTakeover();

    expect(s().sequence).toBe('idle');
    expect(html.dataset.takeover).toBeUndefined();

    await act(async () => {
      s().setBusy('generation', false);
    });
    await waitFor(() => expect(s().sequence).toBe('running'));
  });

  it('stays deferred until every busy activity has finished', async () => {
    mount();
    await act(async () => {
      s().setBusy('upload', true);
      s().setBusy('generation', true);
    });
    await startTakeover();
    await act(async () => {
      s().setBusy('upload', false);
    });
    expect(s().sequence).toBe('idle');
    await act(async () => {
      s().setBusy('generation', false);
    });
    await waitFor(() => expect(s().sequence).toBe('running'));
  });
});

describe('opt-out and cleanup', () => {
  it('opting out mid-sequence aborts it and restores a clean Elegant page', async () => {
    mount();
    await startTakeover();
    expect(s().sequence).toBe('running');

    await act(async () => {
      s().disableHorror();
    });

    expect(s().sequence).toBe('idle');
    expect(html.dataset.experience).toBe('elegant');
    expect(html.dataset.takeover).toBeUndefined();
    expect(TOKEN_NAMES.filter((t) => html.style.getPropertyValue(varName(t)))).toEqual([]);
  });

  it('unmounting mid-sequence releases the timeline and leaves no inline overrides or attributes', async () => {
    const { unmount } = mount();
    await startTakeover();
    expect(gsap.globalTimeline.getChildren(false, true, true).length).toBeGreaterThan(0);

    unmount();

    expect(html.dataset.takeover).toBeUndefined();
    expect(TOKEN_NAMES.filter((t) => html.style.getPropertyValue(varName(t)))).toEqual([]);
    expect(gsap.globalTimeline.getChildren(false, true, true).filter((t) => t.isActive())).toEqual(
      []
    );
  });
});

describe('HauntingControls', () => {
  it('before the reveal, offers only a neutral "Visual effects" switch (no spoilers)', async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole('button', { name: 'Experience settings' }));

    expect(screen.getByLabelText(/Visual effects/)).toBeChecked();
    expect(screen.queryByText(/Replay the Haunting/)).toBeNull();
    expect(screen.queryByText(/Haunted mode/)).toBeNull();
  });

  it('turning "Visual effects" off disables horror for good', async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole('button', { name: 'Experience settings' }));
    await user.click(screen.getByLabelText(/Visual effects/));

    expect(s().horrorEnabled).toBe(false);
    expect(s().requestTakeover('scroll')).toBe(false);
  });

  it('after the reveal, offers Elegant/Haunted mode, opt-out, replay and sound', async () => {
    const user = userEvent.setup();
    resetStore({ experience: 'haunted', takeoverSeen: true });
    mount();
    await user.click(screen.getByRole('button', { name: 'Experience settings' }));

    expect(screen.getByRole('button', { name: 'Elegant mode' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Haunted mode' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByLabelText(/Horror effects/)).toBeChecked();
    expect(screen.getByRole('button', { name: 'Replay the Haunting' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sound: on/ })).toBeInTheDocument();
  });

  it('Elegant mode restores the elegant palette without losing the page', async () => {
    const user = userEvent.setup();
    resetStore({ experience: 'haunted', takeoverSeen: true });
    mount();
    const input = screen.getByLabelText('note');

    await user.click(screen.getByRole('button', { name: 'Experience settings' }));
    await user.click(screen.getByRole('button', { name: 'Elegant mode' }));

    expect(html.dataset.experience).toBe('elegant');
    expect(screen.getByLabelText('note')).toBe(input);
    expect(s().requestTakeover('scroll')).toBe(false); // still no forced reveal
  });

  it('Replay the Haunting resets to Elegant and runs the sequence again', async () => {
    const user = userEvent.setup();
    resetStore({ experience: 'haunted', takeoverSeen: true });
    mount();

    await user.click(screen.getByRole('button', { name: 'Experience settings' }));
    await user.click(screen.getByRole('button', { name: 'Replay the Haunting' }));

    await waitFor(() => expect(s().sequence).toBe('running'));
    expect(s().takeoverReason).toBe('replay');
    expect(html.dataset.experience).toBe('elegant');

    await user.click(screen.getByTestId('skip-transition'));
    await waitFor(() => expect(s().experience).toBe('haunted'));
  });

  it('Replay works again after opting out, and re-enables horror deliberately', async () => {
    const user = userEvent.setup();
    resetStore({ experience: 'elegant', takeoverSeen: true, horrorEnabled: false });
    mount();
    await act(async () => {
      s().replay();
    });
    await waitFor(() => expect(s().sequence).toBe('running'));
    expect(s().horrorEnabled).toBe(true);
    await user.click(screen.getByTestId('skip-transition'));
    await waitFor(() => expect(s().experience).toBe('haunted'));
  });

  it('the settings toggle is a labelled button with aria-expanded, and Escape closes the panel', async () => {
    const user = userEvent.setup();
    resetStore({ experience: 'haunted', takeoverSeen: true });
    mount();
    const toggle = screen.getByRole('button', { name: 'Experience settings' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('accessibility of the effect layers', () => {
  it('the distortion overlay is hidden from assistive tech and contains nothing focusable', () => {
    mount();
    const overlay = document.querySelector('[data-hf-overlay]') as HTMLElement;
    expect(overlay).toBeTruthy();
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
    expect(overlay.querySelectorAll('a, button, input, select, textarea, [tabindex]')).toHaveLength(
      0
    );
  });

  it('the overlay and all its children are pointer-transparent in the stylesheet', () => {
    expect(hauntedCss).toMatch(/\.hf-overlay\s*\{[^}]*pointer-events:\s*none/);
    expect(hauntedCss).toMatch(/\.hf-overlay\s*>\s*\*\s*\{[^}]*pointer-events:\s*none/);
    expect(hauntedCss).toMatch(/\.hf-bg\s*\{[^}]*pointer-events:\s*none/);
  });

  it('only the Skip button and the settings control are interactive additions', () => {
    mount();
    const added = Array.from(
      document.querySelectorAll('[data-hf-controls] button, [data-hf-controls] input')
    );
    expect(added.length).toBeGreaterThan(0);
    expect(document.querySelector('[data-hf-overlay] button')).toBeNull();
  });

  it('respects reduced motion in the stylesheet (looping effects are switched off)', () => {
    expect(hauntedCss).toMatch(/data-motion='reduced'\]\s*\.hf-bg__grain/);
    expect(hauntedCss).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });

  it('Skip and settings controls meet the 44px touch target', () => {
    expect(hauntedCss).toMatch(/\.hf-skip\s*\{[^}]*min-height:\s*44px/);
    expect(hauntedCss).toMatch(/\.hf-controls__toggle\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/);
  });
});

describe('GlitchText', () => {
  it('exposes the sentence once to assistive tech and hides the decorative letters', () => {
    render(<GlitchText as="h2" text="Dream home" />);
    const heading = screen.getByRole('heading', { level: 2, name: 'Dream home' });
    expect(heading).toHaveAttribute('data-glitch');
    const chars = heading.querySelector('.hf-glitch__chars') as HTMLElement;
    expect(chars.getAttribute('aria-hidden')).toBe('true');
    expect(heading.querySelectorAll('.hf-ch')).toHaveLength('Dreamhome'.length);
  });

  it('can opt out of takeover targeting', () => {
    const { container } = render(<GlitchText text="Quiet" untargeted />);
    expect(container.querySelector('[data-glitch]')).toBeNull();
  });
});
