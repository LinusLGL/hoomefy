/**
 * Builds the web images for the Haunted studio's Ouija board and the candle ritual from the original
 * artwork in ../Resource (which is not committed: it is large and has its own licence question).
 * The outputs in public/images/haunted/ritual and public/audio/ritual ARE committed.
 *
 *   node scripts/build-ritual-assets.mjs            (needs Google Chrome, as the Playwright tests do)
 *
 * What it makes:
 *   ouija-board.webp        the board, recompressed
 *   chamber-unlit.webp      the ritual chamber with the five candle flames taken out and their glow dimmed
 *   candle-1..5.webp        for each candle, ONLY the light it adds (original minus unlit), black elsewhere.
 *                           Laid over the unlit picture with mix-blend-mode: screen, it brings the candle back
 *                           exactly as in the artwork, so the lit and unlit states line up to the pixel.
 *   candles.json            where each flame is, in the picture's own 1672 x 941 pixels
 *   ../public/audio/ritual/script1..5.mp3   copied unchanged
 *
 * The flame positions below were read off zoomed views of the artwork (tip, where the flame meets the wick, centre line, width).
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const resource = path.join(root, 'Resource');
const outImages = path.resolve(here, '..', 'public', 'images', 'haunted', 'ritual');
const outAudio = path.resolve(here, '..', 'public', 'audio', 'ritual');
const require = createRequire(path.join(here, '..', 'package.json'));
const { chromium } = require('@playwright/test');

// Flame geometry read off zoomed views of the artwork (picture pixels): x of the wick, y of the flame tip, y where the
// flame meets the wick (the cream wax rim and the dark wick below it are NOT part of the flame), and half the flame's width.
const CANDLES = [
  { id: 'top', cx: 839, tip: 183, end: 217, half: 7 },
  { id: 'left', cx: 435, tip: 356, end: 394, half: 8 },
  { id: 'right', cx: 1226, tip: 360, end: 397, half: 9 },
  { id: 'bottom-left', cx: 575, tip: 629, end: 666, half: 9 },
  { id: 'bottom-right', cx: 1098, tip: 635, end: 676, half: 10 },
];
const read = (name) => `data:image/png;base64,${fs.readFileSync(path.join(resource, name)).toString('base64')}`;

fs.mkdirSync(outImages, { recursive: true });
fs.mkdirSync(outAudio, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.setContent('<body></body>');

const result = await page.evaluate(
  async ({ boardSrc, chamberSrc, candles }) => {
    const load = async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      return img;
    };
    const toDataUrl = (canvas, type, q) => canvas.toDataURL(type, q);

    // ---- the board: recompress only
    const board = await load(boardSrc);
    const bc = document.createElement('canvas');
    bc.width = board.width;
    bc.height = board.height;
    bc.getContext('2d').drawImage(board, 0, 0);
    const boardWebp = toDataUrl(bc, 'image/webp', 0.84);

    // ---- the chamber
    const img = await load(chamberSrc);
    const W = img.width;
    const H = img.height;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const orig = ctx.getImageData(0, 0, W, H);
    const o = orig.data;
    const u = new Uint8ClampedArray(o); // the unlit copy

    const smooth = (a, b, x) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    const at = (arr, x, y) => {
      const p = (Math.round(y) * W + Math.round(x)) * 4;
      return [arr[p], arr[p + 1], arr[p + 2]];
    };

    const boxes = [];
    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    for (const k of candles) {
      const len = k.end - k.tip;
      const midY = k.tip + len * 0.6; // where the glow is centred
      const R = Math.round(len * 2.7); // how far the candle's light reaches

      // 1. dim the warm glow around the flame. Orange light is dimmed hard; the cool cyan lines of the circle much less.
      for (let y = Math.max(0, k.tip - R); y < Math.min(H, k.end + R); y++) {
        for (let x = Math.max(0, k.cx - R); x < Math.min(W, k.cx + R); x++) {
          const dist = Math.hypot(x - k.cx, y - midY);
          if (dist >= R) continue;
          const p = (y * W + x) * 4;
          const r = o[p], g = o[p + 1], b = o[p + 2];
          const s = 1 - smooth(0.12 * R, R, dist); // 1 at the flame, 0 at the edge of its reach
          const warm = clamp01(((r - b) / (r + 12)) * 1.5);
          u[p] = r * (1 - 0.64 * s * (0.3 + 0.7 * warm));
          u[p + 1] = g * (1 - 0.6 * s * (0.2 + 0.8 * warm));
          u[p + 2] = b * (1 - 0.34 * s * (0.1 + 0.9 * warm));
        }
      }

      // 2. take the flame out: a teardrop mask, filled row by row from the (dimmed) background on either side of it
      const halfAt = (t) => (t < 0.68 ? k.half * Math.pow(Math.sin((t / 0.68) * (Math.PI / 2)), 0.85) : k.half * (1 - 0.38 * ((t - 0.68) / 0.32)));
      const pad = 6; // the white-hot bloom around the flame
      const grab = (y, x) => {
        let rr = 0, gg = 0, bb = 0, n = 0;
        for (let dx = -1; dx <= 1; dx++) {
          const p = (y * W + Math.min(W - 1, Math.max(0, x + dx))) * 4;
          rr += u[p]; gg += u[p + 1]; bb += u[p + 2]; n++;
        }
        return [rr / n, gg / n, bb / n];
      };
      const snapshot = new Uint8ClampedArray(u);
      const read = (y, x) => {
        const p = (y * W + x) * 4;
        return [snapshot[p], snapshot[p + 1], snapshot[p + 2]];
      };
      for (let y = k.tip - 5; y <= k.end + 2; y++) {
        const t = clamp01((y - k.tip) / len);
        const w = halfAt(t) + pad;
        const edge = Math.ceil(w) + 4;
        const left = [0, 0, 0], right = [0, 0, 0];
        let ln = 0, rn = 0;
        for (let dx = -1; dx <= 1; dx++) {
          const l = read(y, k.cx - edge + dx);
          const r2 = read(y, k.cx + edge + dx);
          for (let c = 0; c < 3; c++) { left[c] += l[c]; right[c] += r2[c]; }
          ln++; rn++;
        }
        for (let c = 0; c < 3; c++) { left[c] /= ln; right[c] /= rn; }
        for (let x = k.cx - edge; x <= k.cx + edge; x++) {
          const m = 1 - smooth(w - 3, w + 1.5, Math.abs(x - k.cx));
          if (m <= 0) continue;
          const f = (x - (k.cx - edge)) / (2 * edge);
          const p = (y * W + x) * 4;
          for (let c = 0; c < 3; c++) {
            const filled = left[c] * (1 - f) + right[c] * f;
            u[p + c] = u[p + c] * (1 - m) + filled * m;
          }
        }
      }
      void grab;

      // 3. nothing of the lit wick needs repainting: the dimmed wax and the dark wick below the flame stay as drawn
      boxes.push({ ...k, R, midY, box: [Math.max(0, k.cx - R), Math.max(0, k.tip - R), Math.min(W, k.cx + R), Math.min(H, k.end + R)] });
    }
    // the unlit picture
    const uc = document.createElement('canvas');
    uc.width = W;
    uc.height = H;
    uc.getContext('2d').putImageData(new ImageData(u, W, H), 0, 0);
    const unlitWebp = toDataUrl(uc, 'image/webp', 0.86);

    // the light each candle adds: original minus unlit, fading to black at the edge of its reach
    const patches = [];
    for (const b of boxes) {
      const [x0, y0, x1, y1] = b.box;
      const w = x1 - x0;
      const h = y1 - y0;
      const pc = document.createElement('canvas');
      pc.width = w;
      pc.height = h;
      const pctx = pc.getContext('2d');
      const out = pctx.createImageData(w, h);
      const midY = b.midY;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const gx = x0 + x;
          const gy = y0 + y;
          const p = (gy * W + gx) * 4;
          const q = (y * w + x) * 4;
          const fade = 1 - smooth(0.82, 1.0, Math.hypot(gx - b.cx, gy - midY) / b.R);
          out.data[q] = Math.max(0, o[p] - u[p]) * fade;
          out.data[q + 1] = Math.max(0, o[p + 1] - u[p + 1]) * fade;
          out.data[q + 2] = Math.max(0, o[p + 2] - u[p + 2]) * fade;
          out.data[q + 3] = 255;
        }
      }
      pctx.putImageData(out, 0, 0);
      patches.push({ id: b.id, x: x0, y: y0, w, h, cx: b.cx, tip: b.tip, end: b.end, half: b.half, url: toDataUrl(pc, 'image/webp', 0.9) });
    }
    return { boardWebp, unlitWebp, patches, size: [W, H] };
  },
  { boardSrc: read('Haunted Ouija Board with Blank Polaroid.png'), chamberSrc: read('Gothic Moonlit Ritual Chamber.png'), candles: CANDLES }
);
await browser.close();

const save = (name, dataUrl) => {
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  fs.writeFileSync(path.join(outImages, name), buf);
  return buf.length;
};
const sizes = {
  'ouija-board.webp': save('ouija-board.webp', result.boardWebp),
  'chamber-unlit.webp': save('chamber-unlit.webp', result.unlitWebp),
};
const meta = { width: result.size[0], height: result.size[1], candles: [] };
result.patches.forEach((p, i) => {
  const name = `candle-${i + 1}.webp`;
  sizes[name] = save(name, p.url);
  meta.candles.push({ n: i + 1, id: p.id, x: p.x, y: p.y, w: p.w, h: p.h, cx: p.cx, tip: p.tip, end: p.end, half: p.half, file: name });
});
fs.writeFileSync(path.join(outImages, 'candles.json'), JSON.stringify(meta, null, 2) + '\n');

for (let i = 1; i <= 5; i++) {
  const from = path.join(resource, `script${i}.mp3`);
  const to = path.join(outAudio, `script${i}.mp3`);
  fs.copyFileSync(from, to);
  sizes[`script${i}.mp3`] = fs.statSync(to).size;
}
for (const [name, bytes] of Object.entries(sizes)) console.log(`${name.padEnd(22)} ${(bytes / 1024).toFixed(0).padStart(5)} KB`);
