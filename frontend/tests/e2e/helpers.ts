import os from 'node:os';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';

// Outside the (OneDrive-synced) project folder to avoid file-lock errors; override with PW_OUTPUT_DIR.
export const SHOTS = path.join(process.env.PW_OUTPUT_DIR ?? path.join(os.tmpdir(), 'hoomefy-playwright'), 'shots');

/** Records every change of <html data-takeover> and any page errors, from before the app boots. */
export async function instrument(page: Page): Promise<{ errors: string[] }> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    // The haunting engine warns (rather than throws) when a shader fails; treat that as a failure.
    if (m.type() === 'warning' && m.text().includes('[haunting]')) errors.push(`console.warn: ${m.text()}`);
    if (m.type() === 'error') {
      const text = m.text();
      // Remote fonts and the mock S3 host are unreachable in some environments; not app errors.
      if (/fonts\.(googleapis|gstatic)|mock-s3|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|Failed to load resource/i.test(text)) return;
      errors.push(`console.error: ${text}`);
    }
  });

  await page.addInitScript(() => {
    const w = window as unknown as { __phases: string[]; __seen: string[] };
    w.__phases = [];
    w.__seen = [];
    const attach = () => {
      const html = document.documentElement;
      new MutationObserver(() => {
        const p = html.dataset.takeover ?? 'none';
        if (w.__phases[w.__phases.length - 1] !== p) w.__phases.push(p);
      }).observe(html, { attributes: true, attributeFilter: ['data-takeover'] });

      // Classify the Stage Two anomalies by the element they touch.
      const mark = (k: string) => {
        if (!w.__seen.includes(k)) w.__seen.push(k);
      };
      new MutationObserver((records) => {
        for (const r of records) {
          const t = r.target as Element;
          const el = (t.nodeType === 3 ? t.parentElement : t) as HTMLElement | null;
          if (!el) continue;
          if (el.classList?.contains('hf-whisper') && el.textContent) mark(`whisper:${el.textContent}`);
          // Count only effects that are actually visible, not resets back to opacity 0.
          const visible = parseFloat(el.style.opacity || '0') > 0;
          if (el.classList?.contains('hf-glyph') && visible) mark('bell');
          if (el.classList?.contains('hf-tint') && visible) mark('fluorescent');
          if (el.classList?.contains('hf-strip') && visible) mark('tear');
          if (el.classList?.contains('hf-ch') && /translate|skew/.test(el.style.transform) && el.closest('[data-hero-heading],[data-hero-sub]')) mark('text-shift');
          if (el.matches?.('[data-hf-shadow]') && visible) {
            if (el.closest('[data-hero-frame]')) mark('image-shadow');
            else if (el.closest('[data-card-shadow]')) mark('card-silhouette');
          }
          if (el.matches?.('[data-distort]') && el.style.filter.includes('hf-warp')) mark('filter');
        }
      }).observe(document.documentElement, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['style'],
      });
    };
    if (document.documentElement) attach();
    else document.addEventListener('readystatechange', attach, { once: true });
  });
  return { errors };
}

export const phases = (page: Page) => page.evaluate(() => (window as unknown as { __phases: string[] }).__phases);
export const seen = (page: Page) => page.evaluate(() => (window as unknown as { __seen: string[] }).__seen);

export async function gotoHome(page: Page) {
  await page.goto('/');
  await expect(page.locator('[data-hero-heading]')).toBeVisible();
  // wait for the hero painting to be registered
  await page.waitForFunction(() => !!document.querySelector('.hf-scene__canvas'));
}

/** Scroll like a visitor until the takeover begins (or the page ends). */
export async function scrollUntilTakeover(page: Page, maxSteps = 80) {
  await page.mouse.move(640, 400);
  for (let i = 0; i < maxSteps; i++) {
    if (await page.evaluate(() => !!document.documentElement.dataset.takeover)) return;
    await page.mouse.wheel(0, 420);
    await page.waitForTimeout(110);
  }
}

export const waitForPhase = (page: Page, phase: string, timeout = 12_000) =>
  page.waitForFunction((p) => document.documentElement.dataset.takeover === p, phase, { timeout, polling: 40 });

export const waitForHaunted = (page: Page, timeout = 15_000) =>
  page.waitForFunction(
    () => document.documentElement.dataset.experience === 'haunted' && !document.documentElement.dataset.takeover,
    undefined,
    { timeout }
  );

export const waitForElegantIdle = (page: Page) =>
  page.waitForFunction(() => document.documentElement.dataset.experience === 'elegant' && !document.documentElement.dataset.takeover);

export async function openSettings(page: Page) {
  const toggle = page.getByRole('button', { name: 'Experience settings' });
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
}

export const bodyBackground = (page: Page) =>
  page.evaluate(() => {
    const [r, g, b] = getComputedStyle(document.body).backgroundColor.match(/\d+/g)!.map(Number);
    return { r, g, b, luminance: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 };
  });

/** WCAG contrast of an element's text against its composited background (ancestor alpha layers over body). */
export async function textContrast(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) throw new Error(`no element for ${sel}`);
    const parse = (c: string): [number, number, number, number] => {
      const m = c.match(/[\d.]+/g)!.map(Number);
      return [m[0], m[1], m[2], m[3] ?? 1];
    };
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    // gather backgrounds from the element up to <html>
    const layers: Array<[number, number, number, number]> = [];
    for (let n: HTMLElement | null = el; n; n = n.parentElement) {
      const bg = parse(getComputedStyle(n).backgroundColor);
      if (bg[3] > 0) layers.push(bg);
    }
    let base: [number, number, number] = [255, 255, 255];
    for (const [r, g, b, a] of layers.reverse()) {
      base = [r * a + base[0] * (1 - a), g * a + base[1] * (1 - a), b * a + base[2] * (1 - a)];
    }
    const [fr, fg, fb, fa] = parse(getComputedStyle(el).color);
    const fgc: [number, number, number] = [fr * fa + base[0] * (1 - fa), fg * fa + base[1] * (1 - fa), fb * fa + base[2] * (1 - fa)];
    const [hi, lo] = [lum(fgc), lum(base)].sort((a, b) => b - a);
    return (hi + 0.05) / (lo + 0.05);
  }, selector);
}

/** A valid 800x600 PNG, generated in the browser. */
export async function makeRoomPng(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 800;
    c.height = 600;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 800, 600);
    g.addColorStop(0, '#d9c9a3');
    g.addColorStop(1, '#6d5a3c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 800, 600);
    ctx.fillStyle = '#2f3b4a';
    ctx.fillRect(120, 300, 360, 160);
    ctx.fillStyle = '#f3ead2';
    ctx.fillRect(560, 90, 140, 200);
    return c.toDataURL('image/png').split(',')[1];
  });
  return Buffer.from(b64, 'base64');
}

/** Opens /signin and, in the Haunted experience, answers the "Revisiting Companion or New Soul?" gate. */
export async function openSignInForm(page: Page) {
  await page.goto('/signin');
  // Role and label locators, not CSS text: the card's title is split by a <br>, so its
  // textContent has no space and `:has-text("Revisiting Companion")` would never match.
  const gate = page.getByRole('button', { name: /Revisiting Companion/ });
  const email = page.getByLabel('Email Address');
  await gate.or(email).first().waitFor();
  if (await gate.count()) await gate.click();
  await expect(email).toBeVisible();
}

/**
 * Elegant, with the reveal already seen. A visitor who has not seen it has their first button press
 * taken over by the haunting (it jumps to the Haunted home page), so tests that exercise the plain
 * Elegant pages start from here.
 */
export async function seedElegantSeen(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem(
      'hoomefy_haunting',
      JSON.stringify({ state: { experience: 'elegant', horrorEnabled: true, takeoverSeen: true, audioEnabled: false }, version: 0 })
    )
  );
}

export async function signIn(page: Page) {
  await openSignInForm(page);
  await page.getByLabel('Email Address').fill('tester@example.com');
  await page.getByLabel('Password').fill('TestPass123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/studio$/);
}

export const CANDLE_ORDER = ['top', 'left', 'right', 'bottom-left', 'bottom-right'] as const;

/**
 * Haunted: a design begins with the candle ritual. Lights all five candles (in `order`, any order works) and waits
 * for the ritual to complete. The design starts the moment the fifth candle catches.
 */
export async function completeRitual(page: Page, options: { order?: readonly string[]; tap?: boolean } = {}) {
  const { order = CANDLE_ORDER, tap = false } = options;
  const ritual = page.getByTestId('candle-ritual');
  await expect(ritual).toBeVisible();
  for (const id of order) {
    const candle = ritual.locator(`button.rt-candle[data-candle="${id}"]`);
    if (tap) await candle.tap();
    else await candle.click();
  }
  await expect(ritual).toHaveAttribute('data-complete', 'true');
}

/** Presses "Develop the Photograph" in the Haunted studio and performs the ritual that follows. */
export async function developPhotograph(page: Page, options: { tap?: boolean } = {}) {
  const button = page.getByRole('button', { name: 'Develop the Photograph' });
  if (options.tap) await button.tap();
  else await button.click();
  await completeRitual(page, options);
}

export interface FoundItem {
  kind: string;
  name: string;
  query: string;
}

/** What the item finder reports for the test room. */
export const FOUND_ITEMS: FoundItem[] = [
  { kind: 'sofa', name: 'grey linen sofa', query: 'grey linen sofa' },
  { kind: 'coffee-table', name: 'round walnut coffee table', query: 'round walnut coffee table' },
  { kind: 'rug', name: 'jute area rug', query: 'jute area rug' },
];

export interface ItemFinderMock {
  /** What `/api/detect-items` answers: 200 with the items, or an error status. */
  items: FoundItem[];
  status: number;
  /** Whether `/api/furniture-search` finds shop prices (three products per search: $300, $450 and $900). */
  live: boolean;
  detectCalls: number;
  searchQueries: string[];
}

/**
 * Stands in for the Worker's item finder and shop search, which do not exist in the dev server. Change the returned
 * object's fields between steps to make the next answer different.
 */
export async function mockItemFinder(page: Page, initial: Partial<Pick<ItemFinderMock, 'items' | 'status' | 'live'>> = {}): Promise<ItemFinderMock> {
  const mock: ItemFinderMock = { items: FOUND_ITEMS, status: 200, live: true, detectCalls: 0, searchQueries: [], ...initial };

  await page.route(/\/api\/detect-items/, async (route) => {
    mock.detectCalls++;
    if (mock.status !== 200) {
      const code = mock.status === 401 ? 'UNAUTHORIZED' : 'UNAVAILABLE';
      await route.fulfill({ status: mock.status, contentType: 'application/json', body: JSON.stringify({ error: { code } }) });
      return;
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: mock.items }) });
  });

  await page.route(/\/api\/furniture-search/, async (route) => {
    const query = new URL(route.request().url()).searchParams.get('q') ?? '';
    mock.searchQueries.push(query);
    const slug = query.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const results = mock.live
      ? [300, 450, 900].map((price) => ({
          title: `${query} ${price}`,
          price,
          priceText: `$${price}`,
          source: 'Wayfair',
          link: `https://shop.example/${slug}-${price}`,
          imageUrl: null,
        }))
      : [];
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ live: mock.live, results }) });
  });

  return mock;
}

export async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(1);
}

/** Reads the hero canvas back and summarises it, so a blank or white image cannot pass. */
export async function heroPixels(page: Page) {
  return page.evaluate(() => {
    const src = document.querySelector('.hf-scene__canvas') as HTMLCanvasElement;
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 100;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(src, 0, 0, c.width, c.height);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let r = 0, g = 0, b = 0, white = 0, dark = 0;
    const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) {
      r += d[i]; g += d[i + 1]; b += d[i + 2];
      if (d[i] > 250 && d[i + 1] > 250 && d[i + 2] > 250) white++;
      if (d[i] + d[i + 1] + d[i + 2] < 90) dark++;
    }
    const mean = [r / n, g / n, b / n];
    return { mean, luminance: (0.2126 * mean[0] + 0.7152 * mean[1] + 0.0722 * mean[2]) / 255, whiteShare: white / n, darkShare: dark / n };
  });
}

/** Wait until the hero has painted something other than the initial blank canvas. */
export const waitForHeroPainted = (page: Page) =>
  page.waitForFunction(
    () => {
      const src = document.querySelector('.hf-scene__canvas') as HTMLCanvasElement | null;
      if (!src || src.width < 4) return false;
      const c = document.createElement('canvas');
      c.width = 16;
      c.height = 10;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(src, 0, 0, 16, 10);
      const d = ctx.getImageData(0, 0, 16, 10).data;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0 && (d[i] !== 0 || d[i + 1] !== 0 || d[i + 2] !== 0)) return true;
      return false;
    },
    undefined,
    { timeout: 10_000 }
  );