import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ART, BOARD, BOARD_CROP, CANDLES, CANDLE_SOUNDS, CHAMBER, chamberPlacement, coverPlacement, cropBackground, place, within } from './geometry';

const publicDir = path.resolve(__dirname, '..', '..', '..', 'public');
const ritualImages = path.join(publicDir, 'images', 'haunted', 'ritual');

describe('coverPlacement', () => {
  it('draws the art 1:1 on a screen with the same shape', () => {
    const p = coverPlacement({ width: 1672, height: 941 });
    expect(p.scale).toBeCloseTo(1, 5);
    expect(p.left).toBeCloseTo(0, 5);
    expect(p.top).toBeCloseTo(0, 5);
  });

  it('covers a wider screen by cropping the top and bottom, centred', () => {
    const p = coverPlacement({ width: 2560, height: 1080 });
    expect(p.width).toBeCloseTo(2560, 3);
    expect(p.height).toBeGreaterThan(1080);
    expect(p.top).toBeCloseTo((1080 - p.height) / 2, 5);
    expect(p.left).toBeCloseTo(0, 5);
  });

  it('covers a taller screen by cropping the sides, centred', () => {
    const p = coverPlacement({ width: 390, height: 844 });
    expect(p.height).toBeCloseTo(844, 3);
    expect(p.width).toBeGreaterThan(390);
    expect(p.left).toBeCloseTo((390 - p.width) / 2, 5);
  });

  it('never leaves part of the screen uncovered, whatever the shape', () => {
    for (const [w, h] of [[1024, 768], [1280, 720], [1366, 768], [1440, 900], [1920, 1080], [3440, 1440], [390, 844], [820, 1180]]) {
      const p = coverPlacement({ width: w, height: h });
      expect(p.left).toBeLessThanOrEqual(0.0001);
      expect(p.top).toBeLessThanOrEqual(0.0001);
      expect(p.left + p.width).toBeGreaterThanOrEqual(w - 0.0001);
      expect(p.top + p.height).toBeGreaterThanOrEqual(h - 0.0001);
    }
  });
});

describe('place', () => {
  it('moves a rectangle of the art to where the art is drawn', () => {
    const p = coverPlacement({ width: 1366, height: 768 });
    const r = place(BOARD.window, p);
    expect(r.x).toBeCloseTo(p.left + BOARD.window.x * p.scale, 5);
    expect(r.w).toBeCloseTo(BOARD.window.w * p.scale, 5);
  });

  it('keeps the polaroid window inside the polaroid card at every screen size', () => {
    for (const [w, h] of [[1024, 768], [1366, 768], [1920, 1080], [2560, 1080]]) {
      const p = coverPlacement({ width: w, height: h });
      const card = place(BOARD.card, p);
      const win = place(BOARD.window, p);
      expect(win.x).toBeGreaterThan(card.x);
      expect(win.y).toBeGreaterThan(card.y);
      expect(win.x + win.w).toBeLessThan(card.x + card.w);
      expect(win.y + win.h).toBeLessThan(card.y + card.h);
    }
  });
});

describe('within', () => {
  it('writes a rectangle as percentages of the region around it', () => {
    expect(within({ x: 50, y: 25, w: 100, h: 50 }, { x: 0, y: 0, w: 200, h: 100 })).toEqual({ left: '25%', top: '25%', width: '50%', height: '50%' });
  });

  it('puts the window inside the card, with room around it for the writing', () => {
    const w = within(BOARD.window, BOARD.card);
    expect(parseFloat(w.left)).toBeGreaterThan(0);
    expect(parseFloat(w.left) + parseFloat(w.width)).toBeLessThan(100);
    expect(parseFloat(w.top) + parseFloat(w.height)).toBeLessThan(90);
  });
});

describe('cropBackground', () => {
  it('shows exactly the chosen region of the art in a box shaped like it', () => {
    const css = cropBackground({ x: 0, y: 0, w: 836, h: 470.5 });
    expect(css.backgroundSize).toBe('200% auto');
    expect(css.aspectRatio).toBe('836 / 470.5');
  });

  it('the tablet and phone crop contains the whole polaroid card', () => {
    expect(BOARD_CROP.x).toBeLessThan(BOARD.card.x);
    expect(BOARD_CROP.y).toBeLessThan(BOARD.card.y);
    expect(BOARD_CROP.x + BOARD_CROP.w).toBeGreaterThan(BOARD.card.x + BOARD.card.w);
    expect(BOARD_CROP.y + BOARD_CROP.h).toBeGreaterThan(BOARD.card.y + BOARD.card.h);
    expect(BOARD_CROP.x + BOARD_CROP.w).toBeLessThanOrEqual(ART.width);
    expect(BOARD_CROP.y + BOARD_CROP.h).toBeLessThanOrEqual(ART.height);
  });
});

describe('chamberPlacement', () => {
  it('is the same as covering the screen on a normal landscape screen', () => {
    const view = { width: 1920, height: 1080 };
    expect(chamberPlacement(view).scale).toBeCloseTo(coverPlacement(view).scale, 5);
  });

  it('keeps all five candles on screen on a phone, even though that means a smaller picture', () => {
    for (const view of [{ width: 390, height: 844 }, { width: 360, height: 640 }, { width: 820, height: 1180 }]) {
      const p = chamberPlacement(view);
      const ring = place(CHAMBER.ring, p);
      expect(ring.x).toBeGreaterThanOrEqual(-0.5);
      expect(ring.x + ring.w).toBeLessThanOrEqual(view.width + 0.5);
      expect(ring.y).toBeGreaterThanOrEqual(-0.5);
      expect(ring.y + ring.h).toBeLessThanOrEqual(view.height + 0.5);
      expect(p.scale).toBeLessThanOrEqual(coverPlacement(view).scale + 1e-9);
    }
  });

  it('contains every candle (flame and patch) in the ring that must stay visible', () => {
    for (const c of CANDLES) {
      expect(c.cx).toBeGreaterThan(CHAMBER.ring.x);
      expect(c.cx).toBeLessThan(CHAMBER.ring.x + CHAMBER.ring.w);
      expect(c.tip).toBeGreaterThan(CHAMBER.ring.y);
      expect(c.end + 100).toBeLessThan(CHAMBER.ring.y + CHAMBER.ring.h);
    }
  });
});

describe('the candles', () => {
  it('are five, numbered 1 to 5, each with its own voice', () => {
    expect(CANDLES.map((c) => c.n)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(CANDLES.map((c) => c.id)).size).toBe(5);
    expect(CANDLE_SOUNDS).toEqual([1, 2, 3, 4, 5].map((n) => `/audio/ritual/script${n}.mp3`));
  });

  it('keep the numbers in candles.json (written by scripts/build-ritual-assets.mjs) in step with the code', () => {
    const meta = JSON.parse(fs.readFileSync(path.join(ritualImages, 'candles.json'), 'utf8'));
    expect(meta.width).toBe(ART.width);
    expect(meta.height).toBe(ART.height);
    expect(meta.candles).toHaveLength(CANDLES.length);
    for (const spec of CANDLES) {
      const m = meta.candles.find((c: { n: number }) => c.n === spec.n);
      expect(m, `candle ${spec.n}`).toBeTruthy();
      expect({ id: m.id, cx: m.cx, tip: m.tip, end: m.end, half: m.half }).toEqual({ id: spec.id, cx: spec.cx, tip: spec.tip, end: spec.end, half: spec.half });
      expect({ x: m.x, y: m.y, w: m.w, h: m.h }).toEqual({ x: spec.patch.x, y: spec.patch.y, w: spec.patch.w, h: spec.patch.h });
      expect(spec.patch.src).toBe(`/images/haunted/ritual/${m.file}`);
    }
  });

  it('all the pictures and recordings the code refers to exist', () => {
    const files = [BOARD.src, CHAMBER.src, ...CANDLES.map((c) => c.patch.src), ...CANDLE_SOUNDS];
    for (const src of files) {
      const file = path.join(publicDir, src);
      expect(fs.existsSync(file), src).toBe(true);
      expect(fs.statSync(file).size, src).toBeGreaterThan(1000);
    }
  });
});

describe('the board', () => {
  it('has its polaroid, its window and its two drawn candles inside the picture', () => {
    for (const r of [BOARD.card, BOARD.window]) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(ART.width);
      expect(r.y + r.h).toBeLessThanOrEqual(ART.height);
    }
    for (const f of BOARD.flames) {
      expect(f.x).toBeGreaterThan(0);
      expect(f.x).toBeLessThan(ART.width);
      expect(f.y).toBeGreaterThan(0);
      expect(f.y).toBeLessThan(ART.height);
    }
  });

  it('has the polaroid in the middle of the board', () => {
    const cx = BOARD.card.x + BOARD.card.w / 2;
    expect(Math.abs(cx - ART.width / 2)).toBeLessThan(12);
  });
});
