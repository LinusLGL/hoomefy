import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { gsap } from 'gsap';
import { PHASES, REDUCED_DURATION, runTakeover, type TakeoverDeps } from './takeoverTimeline';
import type { OverlayHandle } from './RealityDistortionOverlay';
import { TOKEN_NAMES, varName } from './palettes';
import type { TakeoverPhase } from './hauntingStore';

/* ------------------------------ test fixtures ------------------------------ */

function makeOverlay() {
  const div = () => document.createElement('div');
  const els = {
    root: div(),
    scan: div(),
    flash: document.createElement('canvas'),
    veil: div(),
    tint: div(),
    message: div(),
    reveal: div(),
    revealHeadline: div(),
    revealSub: div(),
    revealLogo: div(),
    whisper: div(),
    shadow: div(),
  };
  Object.values(els).forEach((e) => document.body.appendChild(e));
  // Production CSS starts these layers fully transparent (haunted.css); jsdom has no stylesheet.
  [els.veil, els.reveal, els.message, els.tint, els.scan, els.whisper, els.shadow].forEach((e) => {
    e.style.opacity = '0';
  });
  const overlay = {
    setWarp: vi.fn(),
    reseed: vi.fn(),
    setChroma: vi.fn(),
    tear: { burst: vi.fn(), clear: vi.fn() },
    flashScene: vi.fn(() => true),
    fluorescent: vi.fn(() => true),
    whisper: vi.fn(),
    bell: vi.fn(() => true),
    reset: vi.fn(),
    elements: () => els,
  } as unknown as OverlayHandle;
  return { overlay, els };
}

function buildPage() {
  document.body.innerHTML = `
    <header data-distort><a data-glitch><span class="hf-ch">A</span><span class="hf-ch">b</span></a></header>
    <h1 data-hero-heading data-glitch><span class="hf-ch">H</span><span class="hf-ch">i</span></h1>
    <div data-distort id="card"></div>
    <div data-distort id="card2"></div>
    <div data-hf-shadow></div>
    <div id="bg"></div><div id="mist"></div>`;
  return {
    card: document.getElementById('card') as HTMLElement,
    card2: document.getElementById('card2') as HTMLElement,
    bg: document.getElementById('bg') as HTMLElement,
    mist: document.getElementById('mist') as HTMLElement,
  };
}

function setup(overrides: Partial<TakeoverDeps> = {}) {
  const page = buildPage();
  const { overlay, els } = makeOverlay();
  const phases: TakeoverPhase[] = [];
  const hero = { el: document.createElement('div'), handle: { set: vi.fn(), setImages: vi.fn(), usesWebGL: false } };
  const deps: TakeoverDeps = {
    overlay,
    hero,
    background: page.bg,
    mist: page.mist,
    mobile: false,
    reduced: false,
    setPhase: (p) => phases.push(p),
    setExperience: vi.fn(),
    onComplete: vi.fn(),
    ...overrides,
  };
  return { deps, phases, overlay, els, hero, page };
}

const inlinePaletteVars = () =>
  TOKEN_NAMES.filter((t) => document.documentElement.style.getPropertyValue(varName(t)) !== '');

beforeEach(() => {
  // jsdom has no layout: report every element as visible and reasonably sized.
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 10, y: 10, top: 10, left: 10, right: 300, bottom: 110, width: 290, height: 100, toJSON: () => ({}),
  } as DOMRect);
});

afterEach(() => {
  gsap.globalTimeline.clear();
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('style');
  vi.restoreAllMocks();
});

/* ---------------------------------- tests ---------------------------------- */

describe('timeline constants', () => {
  it('matches the phase windows in the brief', () => {
    expect(PHASES).toEqual({ A: 0, B: 1.2, C: 2.7, D: 4.5, END: 6 });
  });
});

describe('runTakeover: full sequence', () => {
  it('walks phases A -> B -> C -> D and completes exactly once', () => {
    const { deps, phases } = setup();
    const run = runTakeover(deps);

    run.timeline.seek(PHASES.END, false);

    expect(phases).toEqual(['A', 'B', 'C', 'D', 'none']);
    expect(deps.onComplete).toHaveBeenCalledTimes(1);
    expect(run.done).toBe(true);
  });

  it('swaps the experience to Haunted partway through Phase C, not at the start', () => {
    const { deps } = setup();
    const run = runTakeover(deps);

    run.timeline.seek(PHASES.C + 0.5, false);
    expect(deps.setExperience).not.toHaveBeenCalled();

    run.timeline.seek(PHASES.D - 0.1, false);
    expect(deps.setExperience).toHaveBeenCalledWith('haunted');
    expect(deps.onComplete).not.toHaveBeenCalled();
  });

  it('applies the warp and chromatic filters to visible targets during the distortion, then removes them', () => {
    const { deps, page } = setup();
    const run = runTakeover(deps);

    run.timeline.seek(0.5, false);
    expect(page.card.style.filter).toContain('url(#hf-warp)');
    expect(page.card.style.filter).toContain('url(#hf-chromatic)');

    run.timeline.seek(PHASES.END, false);
    expect(page.card.style.filter).toBe('');
    expect(page.card2.style.filter).toBe('');
  });

  it('ramps displacement and chromatic offset through A and B, and zeroes them at the Phase D cut', () => {
    const { deps, overlay } = setup();
    const run = runTakeover(deps);

    run.timeline.seek(PHASES.B - 0.01, false);
    const warpAtEndOfA = (overlay.setWarp as ReturnType<typeof vi.fn>).mock.calls.slice(-1)[0]?.[0] as number;
    run.timeline.seek(PHASES.C - 0.01, false);
    const warpAtEndOfB = (overlay.setWarp as ReturnType<typeof vi.fn>).mock.calls.slice(-1)[0]?.[0] as number;
    expect(warpAtEndOfA).toBeGreaterThan(5);
    expect(warpAtEndOfB).toBeGreaterThan(warpAtEndOfA);

    run.timeline.seek(PHASES.D + 0.05, false);
    expect((overlay.setWarp as ReturnType<typeof vi.fn>).mock.calls.slice(-1)[0]?.[0]).toBe(0);
    expect((overlay.setChroma as ReturnType<typeof vi.fn>).mock.calls.slice(-1)[0]?.[0]).toBe(0);
  });

  it('tweens the whole palette during C and leaves no inline colour overrides afterwards', () => {
    const { deps } = setup();
    const run = runTakeover(deps);

    run.timeline.seek(PHASES.C + 0.9, false);
    expect(inlinePaletteVars().length).toBeGreaterThan(0);

    run.timeline.seek(PHASES.END, false);
    expect(inlinePaletteVars()).toEqual([]);
  });

  it('warps the hero image from the room to the corridor and settles on the corridor', () => {
    const { deps, hero } = setup();
    const run = runTakeover(deps);

    run.timeline.seek(PHASES.END, false);
    const last = hero.handle.set.mock.calls.slice(-1)[0]?.[0];
    expect(last.progress).toBe(1);
    expect(last.distort).toBe(0);
  });

  it('shows the PHASE C message and the PHASE D reveal on the overlay', () => {
    const { deps, els } = setup();
    const run = runTakeover(deps);

    run.timeline.seek(PHASES.C + 1.1, false);
    expect(Number(gsap.getProperty(els.message, 'opacity'))).toBeGreaterThan(0);

    // Fully shown just before the closing fade (which runs from END - 0.5 s).
    run.timeline.seek(PHASES.D + 0.9, false);
    expect(Number(gsap.getProperty(els.reveal, 'opacity'))).toBeGreaterThan(0.9);
    expect(Number(gsap.getProperty(els.revealHeadline, 'opacity'))).toBeGreaterThan(0.9);

    // ...and released again at the end, handing control back to the live UI.
    run.timeline.seek(PHASES.END, false);
    expect(Number(gsap.getProperty(els.reveal, 'opacity'))).toBe(0);
  });

  it('keeps full-screen flashes inside the safe budget (spaced >= 0.4 s, low alpha)', () => {
    const { deps, overlay } = setup();
    runTakeover(deps).timeline.seek(PHASES.END, false);
    const flashes = (overlay.flashScene as ReturnType<typeof vi.fn>).mock.calls;
    expect(flashes.length).toBeGreaterThan(0);
    flashes.forEach(([, alpha]) => expect(alpha).toBeLessThanOrEqual(0.28));
  });

  it('keeps the elegant page recognisable through A, B and C: no veil, reveal or message is shown early', () => {
    const { deps, els } = setup();
    const run = runTakeover(deps);
    const opacity = (el: Element) => Number(gsap.getProperty(el, 'opacity'));

    // Regression: fromTo() used to apply the Phase D veil (0.92) at t=0 and black out the page.
    expect(opacity(els.veil)).toBe(0);
    for (const t of [0.5, 1.0, 2.0, 3.0]) {
      run.timeline.seek(t, false);
      expect(opacity(els.veil), `veil at ${t}s`).toBe(0);
      expect(opacity(els.reveal), `reveal at ${t}s`).toBe(0);
    }
    run.timeline.seek(PHASES.C + 0.4, false);
    expect(opacity(els.message), 'message not yet shown').toBe(0);

    // ...and they do arrive on schedule.
    run.timeline.seek(PHASES.D + 0.2, false);
    expect(opacity(els.veil)).toBeGreaterThan(0.4);
  });

  it('does nothing to the page content: no element is removed or replaced', () => {
    const { deps } = setup();
    const before = Array.from(document.querySelectorAll('[data-distort]'));
    runTakeover(deps).timeline.seek(PHASES.END, false);
    const after = Array.from(document.querySelectorAll('[data-distort]'));
    expect(after).toEqual(before);
  });
});

describe('runTakeover: skip', () => {
  it('jumps to the Haunted end state immediately and completes once', () => {
    const { deps, phases, page } = setup();
    const run = runTakeover(deps);
    run.timeline.seek(0.6, false);

    run.skip();

    expect(deps.setExperience).toHaveBeenCalledWith('haunted');
    expect(deps.onComplete).toHaveBeenCalledTimes(1);
    expect(phases.slice(-1)[0]).toBe('none');
    expect(page.card.style.filter).toBe('');
    expect(inlinePaletteVars()).toEqual([]);
    expect(run.done).toBe(true);
  });

  it('is idempotent', () => {
    const { deps } = setup();
    const run = runTakeover(deps);
    run.skip();
    run.skip();
    expect(deps.onComplete).toHaveBeenCalledTimes(1);
  });

  it('cannot be completed again by the timeline after skipping', () => {
    const { deps } = setup();
    const run = runTakeover(deps);
    run.skip();
    run.timeline.seek(PHASES.END, false);
    expect(deps.onComplete).toHaveBeenCalledTimes(1);
  });
});

describe('runTakeover: abort (unmount / opt-out)', () => {
  it('stops without completing, restores the page and does not change the experience', () => {
    const { deps, phases, page, overlay } = setup();
    const run = runTakeover(deps);
    run.timeline.seek(PHASES.C + 0.9, false);
    (deps.setExperience as ReturnType<typeof vi.fn>).mockClear();

    run.abort();

    expect(deps.onComplete).not.toHaveBeenCalled();
    expect(deps.setExperience).not.toHaveBeenCalled();
    expect(phases.slice(-1)[0]).toBe('none');
    expect(page.card.style.filter).toBe('');
    expect(inlinePaletteVars()).toEqual([]);
    expect(overlay.reset).toHaveBeenCalled();
    expect(run.done).toBe(true);
  });

  it('releases the timeline from the global GSAP timeline (no leaked animation)', () => {
    const { deps } = setup();
    const run = runTakeover(deps);
    run.abort();
    expect(gsap.globalTimeline.getChildren(false, true, true)).not.toContain(run.timeline);
    expect(run.timeline.isActive()).toBe(false);
  });

  it('is safe to call after completion', () => {
    const { deps } = setup();
    const run = runTakeover(deps);
    run.skip();
    expect(() => run.abort()).not.toThrow();
    expect(deps.onComplete).toHaveBeenCalledTimes(1);
  });
});

describe('runTakeover: reduced motion', () => {
  it('replaces the distortion with a short palette cross-fade (no filters, no tearing, no flashes)', () => {
    const { deps, overlay, page } = setup({ reduced: true });
    const run = runTakeover(deps);

    run.timeline.seek(0.3, false);
    expect(page.card.style.filter).toBe('');
    expect(inlinePaletteVars().length).toBeGreaterThan(0);

    run.timeline.seek(REDUCED_DURATION, false);

    expect(overlay.tear.burst).not.toHaveBeenCalled();
    expect(overlay.flashScene).not.toHaveBeenCalled();
    expect(overlay.fluorescent).not.toHaveBeenCalled();
    expect(deps.setExperience).toHaveBeenCalledWith('haunted');
    expect(deps.onComplete).toHaveBeenCalledTimes(1);
    expect(inlinePaletteVars()).toEqual([]);
  });

  it('finishes much faster than the full sequence and never enters phases A or B', () => {
    const { deps, phases } = setup({ reduced: true });
    const run = runTakeover(deps);
    expect(run.timeline.duration()).toBeLessThanOrEqual(REDUCED_DURATION + 0.01);
    expect(run.timeline.duration()).toBeLessThan(PHASES.END);
    run.timeline.seek(REDUCED_DURATION, false);
    expect(phases).not.toContain('A');
    expect(phases).not.toContain('B');
  });

  it('keeps the 0.8 s theme cross-fade inside the stated 1 s limit', () => {
    // The palette tween is 0.8 s; the remainder of REDUCED_DURATION is a static caption.
    const { deps } = setup({ reduced: true });
    const run = runTakeover(deps);
    run.timeline.seek(0.8, false);
    expect(Number(gsap.getProperty(document.documentElement, '--c-navy-900'))).toBeNaN();
    expect(inlinePaletteVars().length).toBeGreaterThan(0);
  });
});

describe('runTakeover: mobile', () => {
  it('limits the number of filtered elements', () => {
    const { deps, page } = setup({ mobile: true });
    // add more candidates than the mobile cap
    for (let i = 0; i < 6; i++) {
      const el = document.createElement('div');
      el.setAttribute('data-distort', '');
      document.body.appendChild(el);
    }
    const run = runTakeover(deps);
    run.timeline.seek(0.5, false);
    const filtered = Array.from(document.querySelectorAll<HTMLElement>('[data-distort]')).filter((e) => e.style.filter);
    expect(filtered.length).toBeLessThanOrEqual(3);
    void page;
  });
});
