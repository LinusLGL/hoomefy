/**
 * Builds the three photographs on the Elegant landing page's style cards from the original artwork in
 * ../Resource/Clean (which is not committed: it is large and has its own licence question).
 * The outputs in public/images/styles ARE committed.
 *
 *   node scripts/build-style-images.mjs            (needs Google Chrome, as the Playwright tests do)
 *
 * Each picture is cropped from the middle to 16:9 (the same shape as the Haunted room cards) and shrunk to
 * 960 x 540, then saved as WebP.
 *
 *   Bright Scandinavian Kitchen with Natural Accents.png   ->  scandinavian.webp
 *   Serene Japandi Rooftop Tea Terrace.png                  ->  japandi.webp
 *   Luxurious Modern Classic Living Room.png                ->  modern-classic.webp
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, '..', '..', 'Resource', 'Clean');
const out = path.resolve(here, '..', 'public', 'images', 'styles');
const require = createRequire(path.join(here, '..', 'package.json'));
const { chromium } = require('@playwright/test');

const WIDTH = 960;
const HEIGHT = 540;
const QUALITY = 0.82;

const PICTURES = [
  ['Bright Scandinavian Kitchen with Natural Accents.png', 'scandinavian.webp'],
  ['Serene Japandi Rooftop Tea Terrace.png', 'japandi.webp'],
  ['Luxurious Modern Classic Living Room.png', 'modern-classic.webp'],
];

fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();

for (const [from, to] of PICTURES) {
  const bytes = fs.readFileSync(path.join(source, from));
  const result = await page.evaluate(
    async ({ b64, width, height, quality }) => {
      const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
      const bitmap = await createImageBitmap(blob);
      // Cover: fill the 16:9 frame and crop what spills over, from the middle.
      const scale = Math.max(width / bitmap.width, height / bitmap.height);
      const w = bitmap.width * scale;
      const h = bitmap.height * scale;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, (width - w) / 2, (height - h) / 2, w, h);
      const data = canvas.toDataURL('image/webp', quality).split(',')[1];
      return { data, from: [bitmap.width, bitmap.height] };
    },
    { b64: bytes.toString('base64'), width: WIDTH, height: HEIGHT, quality: QUALITY }
  );
  const file = path.join(out, to);
  fs.writeFileSync(file, Buffer.from(result.data, 'base64'));
  console.log(`${to}: ${result.from.join(' x ')} -> ${WIDTH} x ${HEIGHT}, ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
}

await browser.close();
