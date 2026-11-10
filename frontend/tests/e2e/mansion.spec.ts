import { test, expect, type Page } from '@playwright/test';
import {
  SHOTS,
  gotoHome,
  instrument,
  makeRoomPng,
  openSettings,
  openSignInForm,
  seedElegantSeen,
  signIn,
} from './helpers';

/** Start as a returning visitor who has already seen the reveal. */
async function seedHaunted(page: Page, opts: { candle?: boolean; darkness?: boolean; mansion?: unknown } = {}) {
  await page.addInitScript(
    ({ candle, darkness, mansion }) => {
      // Seed once per browser context. This script re-runs on every navigation and reload, and must
      // never overwrite what the app has saved since (e.g. a changed preference or cleared rooms).
      if (localStorage.getItem('__e2e_seeded')) return;
      localStorage.setItem('__e2e_seeded', '1');
      localStorage.setItem(
        'hoomefy_haunting',
        JSON.stringify({ state: { experience: 'haunted', horrorEnabled: true, takeoverSeen: true, candleCursor: candle, candleDarkness: darkness }, version: 0 })
      );
      if (mansion) localStorage.setItem('hoomefy_mansion', JSON.stringify({ state: mansion, version: 0 }));
    },
    { candle: opts.candle ?? true, darkness: opts.darkness ?? true, mansion: opts.mansion ?? null }
  );
}

const room = (spirits: string[], cleared = false) => ({ spirits: cleared ? [] : spirits, initial: spirits, cleared });

/** A house where the given rooms are already cleared and living-room has known spirits. */
function mansionWith(clearedRooms: string[], livingSpirits: string[] = ['seating', 'lighting']) {
  const rooms: Record<string, unknown> = {};
  for (const r of clearedRooms) rooms[r] = room(['lighting'], true);
  rooms['living-room'] = room(livingSpirits);
  return { houses: [{ id: 'house-1', name: 'The First House', rooms }], activeId: 'house-1', appliedJobs: [] };
}

/** Rooms cleared in the active house, read from the saved game state (the progress panel no longer exists). */
const clearedRooms = (page: Page) =>
  page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('hoomefy_mansion') ?? '{}').state as { houses: { id: string; rooms: Record<string, { cleared: boolean }> }[]; activeId: string } | undefined;
    const house = state?.houses.find((h) => h.id === state.activeId);
    return Object.values(house?.rooms ?? {}).filter((r) => r.cleared).length;
  });
const candle = (page: Page) => page.locator('[data-testid="candle-cursor"]');

/** Current translate of the candle in px (the cursor eases toward the pointer, so compare with a tolerance). */
const candleAt = (page: Page) =>
  candle(page).evaluate((el) => {
    const m = (el as HTMLElement).style.transform.match(/translate3d\(([-\d.]+)px, ([-\d.]+)px/);
    return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
  });
const near = (a: number, b: number) => Math.abs(a - b) <= 1;

test.describe('Candle cursor', () => {
  test('replaces the mouse pointer, the flame follows it, and it never blocks a click', async ({ page }) => {
    const { errors } = await instrument(page);
    await seedHaunted(page);
    await gotoHome(page);

    // Until the candle is actually drawn the normal pointer must stay available (it used to vanish).
    await expect(candle(page)).toHaveAttribute('data-visible', 'false');
    await expect(page.locator('html')).not.toHaveAttribute('data-candle', /.*/);
    expect(await page.evaluate(() => getComputedStyle(document.body).cursor)).not.toBe('none');

    await page.mouse.move(420, 260);
    await expect(candle(page)).toHaveAttribute('data-visible', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-candle', 'on');
    expect(await page.evaluate(() => getComputedStyle(document.body).cursor), 'native cursor hidden').toBe('none');
    await expect.poll(async () => { const p = await candleAt(page); return !!p && near(p.x, 420) && near(p.y, 260); }, { message: 'flame sits on the pointer' }).toBe(true);

    await page.mouse.move(900, 540);
    await expect.poll(async () => { const p = await candleAt(page); return !!p && near(p.x, 900) && near(p.y, 540); }).toBe(true);
    await page.screenshot({ path: `${SHOTS}/30-candle-cursor.png` });

    // It is inert: a real click goes straight through to the link underneath.
    await page.locator('header').getByRole('link', { name: 'How It Works' }).click();
    await expect(page).toHaveURL(/\/how-it-works$/);
    expect(errors).toEqual([]);
  });

  test('is purely visual: pointer-events none and above everything, including the settings controls', async ({ page }) => {
    await seedHaunted(page);
    await gotoHome(page);
    await page.mouse.move(300, 300);
    const s = await candle(page).evaluate((el) => {
      const cs = getComputedStyle(el);
      return { events: cs.pointerEvents, z: Number(cs.zIndex), hidden: el.getAttribute('aria-hidden') };
    });
    expect(s.events).toBe('none');
    expect(s.hidden).toBe('true');
    // The settings and skip controls sit at 9600; the candle must never disappear behind them.
    expect(s.z).toBeGreaterThan(9600);
  });

  test('recovers when the text field under a still pointer goes away', async ({ page }) => {
    await seedHaunted(page);
    await openSignInForm(page);
    const email = page.getByLabel('Email Address');
    await email.hover();
    await expect(candle(page)).toHaveAttribute('data-text', 'true');

    // The field disappears (e.g. the form submits) and the mouse does not move.
    await email.evaluate((el) => el.remove());
    await expect(candle(page)).toHaveAttribute('data-text', 'false', { timeout: 3000 });
    await expect(candle(page)).toHaveCSS('opacity', '1'); // fades back in
  });

  test('shows over the settings controls instead of disappearing behind them', async ({ page }) => {
    await seedHaunted(page);
    await gotoHome(page);
    const settings = page.getByRole('button', { name: 'Experience settings' });
    await settings.hover();
    await expect(candle(page)).toHaveAttribute('data-visible', 'true');
    await expect(candle(page)).toHaveCSS('opacity', '1');
  });

  test('the flame grows over interactive elements', async ({ page }) => {
    await seedHaunted(page);
    await gotoHome(page);
    await page.mouse.move(640, 700);
    await page.getByRole('link', { name: 'Design My Room' }).hover();
    await expect(candle(page)).toHaveAttribute('data-hot', 'true');
    await page.mouse.move(40, 420);
    await expect(candle(page)).toHaveAttribute('data-hot', 'false');
  });

  test('text fields keep the I-beam and hide the candle', async ({ page }) => {
    await seedHaunted(page);
    await openSignInForm(page);
    const email = page.getByLabel('Email Address');
    await email.hover();
    await expect(candle(page)).toHaveAttribute('data-text', 'true');
    expect(await email.evaluate((el) => getComputedStyle(el).cursor)).toBe('text');
    // The candle fades out over 0.18s, so wait for the fade instead of sampling mid-transition.
    await expect(candle(page)).toHaveCSS('opacity', '0');
  });

  test('can be switched off in settings, restores the normal pointer, and remembers the choice', async ({ page }) => {
    await seedHaunted(page);
    await gotoHome(page);
    await page.mouse.move(500, 400);
    await expect(page.locator('html')).toHaveAttribute('data-candle', 'on');

    await openSettings(page);
    await page.getByLabel(/Candle cursor/).uncheck();

    await expect(page.locator('html')).not.toHaveAttribute('data-candle', /.*/);
    await expect(candle(page)).toHaveCount(0);
    expect(await page.evaluate(() => getComputedStyle(document.body).cursor)).not.toBe('none');

    await page.reload();
    await expect(candle(page)).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-experience', 'haunted');
  });

  test('does not exist in the Elegant experience', async ({ page }) => {
    await gotoHome(page);
    await expect(page.locator('html')).toHaveAttribute('data-experience', 'elegant');
    await expect(candle(page)).toHaveCount(0);
    await expect(page.locator('html')).not.toHaveAttribute('data-candle', /.*/);
  });

  test('is gone when horror effects are disabled', async ({ page }) => {
    await seedHaunted(page);
    await gotoHome(page);
    await openSettings(page);
    await page.getByLabel(/Horror effects/).uncheck();
    await expect(candle(page)).toHaveCount(0);
    await expect(page.locator('html')).not.toHaveAttribute('data-candle', /.*/);
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('still follows the pointer, with no flicker animation', async ({ page }) => {
      await seedHaunted(page);
      await gotoHome(page);
      await page.mouse.move(333, 222);
      await expect.poll(async () => { const p = await candleAt(page); return !!p && near(p.x, 333) && near(p.y, 222); }).toBe(true);
      const anim = await page.locator('.hf-candle__flame').evaluate((el) => getComputedStyle(el).animationName);
      expect(anim).toBe('none');
    });
  });
});

/** Mean luminance (0..1) of a square of a screenshot buffer centred on (cx, cy). */
async function lumaAt(page: Page, shot: Buffer, cx: number, cy: number, half = 24): Promise<number> {
  return page.evaluate(
    async ({ b64, cx, cy, half }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d') as CanvasRenderingContext2D;
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(Math.max(0, cx - half), Math.max(0, cy - half), half * 2, half * 2).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) sum += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      return sum / (d.length / 4);
    },
    { b64: shot.toString('base64'), cx, cy, half }
  );
}

const light = (page: Page) => page.locator('[data-testid="candle-light"]');
const lightRadiusPx = (page: Page) => light(page).evaluate((el) => parseFloat((el as HTMLElement).style.getPropertyValue('--hf-light-r')));

test.describe('Candlelight: a dark room lit by the candle', () => {
  test('the room is dark and the candle lights a circle that is clear in the middle and dark at the edge', async ({ page }) => {
    const { errors } = await instrument(page);
    await seedHaunted(page);
    await gotoHome(page);

    await expect(light(page)).toHaveAttribute('data-level', '0');
    await expect(light(page)).toHaveAttribute('data-lit', 'false');
    const viewport = page.viewportSize() as { width: number; height: number };
    const expected = Math.round(0.3 * Math.min(viewport.width, viewport.height));
    expect(await lightRadiusPx(page), 'starts at 30% of the shorter window side').toBeCloseTo(expected, -1);

    // Park the candle on a well-lit part of the page: the middle of the hero heading.
    const box = (await page.locator('[data-hero-heading]').boundingBox()) as { x: number; y: number; width: number; height: number };
    const cx = Math.round(box.x + box.width / 2);
    const cy = Math.round(box.y + box.height / 2);
    await page.mouse.move(cx, cy);
    await expect.poll(async () => { const p = await candleAt(page); return !!p && near(p.x, cx) && near(p.y, cy); }).toBe(true);

    // Same frame, with and without the darkness: only the darkness may differ. The mansion's own flicker and
    // slow push-in are paused so they cannot differ between the two shots.
    await page.addStyleTag({ content: '.hf-bg, .hf-bg *, .hf-art, .hf-art * { animation: none !important; }' });
    // Artwork that finishes loading between the two shots would also differ, so wait for it.
    await page.waitForFunction(() => Array.from(document.images).every((img) => img.complete) && document.querySelector('.hf-scene')?.getAttribute('data-ready') === 'true');
    await page.waitForTimeout(400);
    const dark = await page.screenshot();
    await light(page).evaluate((el) => ((el as HTMLElement).style.display = 'none'));
    const bright = await page.screenshot();
    await light(page).evaluate((el) => ((el as HTMLElement).style.display = ''));

    // The middle of the hero room card: far from the candle and full of real content. (Near-black
    // corners and the ghosts/settings buttons, which sit above the darkness, make poor samples.)
    const card = (await page.locator('.hf-hero-card').boundingBox()) as { x: number; y: number; width: number; height: number };
    const farX = Math.round(card.x + card.width / 2);
    const farY = Math.round(card.y + card.height / 2);
    const centreRatio = (await lumaAt(page, dark, cx, cy)) / Math.max(0.001, await lumaAt(page, bright, cx, cy));
    const edgeRatio = (await lumaAt(page, dark, farX, farY)) / Math.max(0.001, await lumaAt(page, bright, farX, farY));
    // The background and the candle's halo animate between the two shots, so allow some noise.
    expect(centreRatio, 'inside the light almost nothing is dimmed').toBeGreaterThan(0.85);
    expect(centreRatio - edgeRatio, 'the lit circle is far brighter than the dark room').toBeGreaterThan(0.5);
    // 80% dark leaves 20%; the soft background and gamma keep it from being exactly 0.2.
    expect(edgeRatio, 'far from the light the room is ~80% dark').toBeLessThan(0.4);
    expect(edgeRatio).toBeGreaterThan(0.1);

    await page.screenshot({ path: `${SHOTS}/36-candlelight-start.png` });
    expect(errors).toEqual([]);
  });

  test('the light follows the candle and never blocks the page', async ({ page }) => {
    await seedHaunted(page);
    await gotoHome(page);
    await page.mouse.move(700, 300);
    await page.mouse.move(900, 500);
    await expect.poll(() => light(page).evaluate((el) => (el as HTMLElement).style.getPropertyValue('--hf-lx'))).toBe('900px');
    expect(await light(page).evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
    // below the ghosts and the controls, above the page
    const z = await light(page).evaluate((el) => Number(getComputedStyle(el).zIndex));
    expect(z).toBeGreaterThan(1);
    expect(z).toBeLessThan(8000);
  });

  test('every click lifts the light one step (30 -> 50 -> 80 -> 100), flares the flame, and the circle grows', async ({ page }) => {
    test.setTimeout(60_000);
    await seedHaunted(page);
    await gotoHome(page);
    await expect(light(page)).toHaveAttribute('data-radius', '30');
    const glow0 = Number(await candle(page).evaluate((el) => (el as HTMLElement).style.getPropertyValue('--hf-glow')));
    const px0 = await lightRadiusPx(page);

    // Click on plain text so nothing is activated.
    const plain = page.locator('main p').first();
    const box = (await plain.boundingBox()) as { x: number; y: number; width: number; height: number };
    const at = { x: box.x + 6, y: box.y + box.height / 2 };
    await page.mouse.move(at.x, at.y);

    await page.mouse.click(at.x, at.y);
    await expect(light(page)).toHaveAttribute('data-radius', '50');
    await expect(candle(page)).toHaveAttribute('data-flare', 'true'); // the flame flares...
    await expect(candle(page)).toHaveAttribute('data-flare', 'false', { timeout: 2000 }); // ...and settles
    await expect.poll(() => lightRadiusPx(page)).toBeGreaterThan(px0 * 1.5); // the circle grows
    await expect.poll(async () => Number(await candle(page).evaluate((el) => (el as HTMLElement).style.getPropertyValue('--hf-glow')))).toBeGreaterThan(glow0);

    await page.waitForTimeout(300);
    await page.mouse.click(at.x, at.y);
    await expect(light(page)).toHaveAttribute('data-radius', '80');
    await page.waitForTimeout(300);
    await page.mouse.click(at.x, at.y);
    await expect(light(page)).toHaveAttribute('data-radius', '100');
    await expect(light(page)).toHaveAttribute('data-lit', 'true'); // the whole room is lit
    await expect(light(page)).toHaveCSS('opacity', '0', { timeout: 3000 }); // the darkness has finished fading out
    await page.screenshot({ path: `${SHOTS}/37-candlelight-full.png` });

    // ...and it starts burning down again (and goes dark again) a few seconds later.
    await expect.poll(async () => Number(await light(page).getAttribute('data-radius')), { timeout: 10_000 }).toBeLessThan(100);
    await expect(light(page)).toHaveAttribute('data-lit', 'false');
  });

  test('a click also restarts the 5 seconds, so it is not followed by an instant shrink', async ({ page }) => {
    test.setTimeout(60_000);
    await seedHaunted(page);
    await gotoHome(page);
    const plain = page.locator('main p').first();
    const box = (await plain.boundingBox()) as { x: number; y: number; width: number; height: number };
    await page.mouse.move(box.x + 6, box.y + box.height / 2);

    await page.waitForTimeout(3500); // the first burn-down is about 1.5 s away
    await page.mouse.click(box.x + 6, box.y + box.height / 2);
    await expect(light(page)).toHaveAttribute('data-radius', '50');
    await page.waitForTimeout(2500); // past the original burn-down moment
    expect(Number(await light(page).getAttribute('data-radius'))).toBe(50);
    await expect.poll(async () => Number(await light(page).getAttribute('data-radius')), { timeout: 6000 }).toBeLessThan(50);
  });

  test('burns lower: the circle shrinks by 10% about every 5 seconds', async ({ page }) => {
    test.setTimeout(60_000);
    await seedHaunted(page);
    await gotoHome(page);
    const start = Number(await light(page).getAttribute('data-radius'));
    expect(start).toBe(30);
    await expect.poll(async () => Number(await light(page).getAttribute('data-radius')), { timeout: 9000 }).toBeLessThan(start);
    const afterOne = Number(await light(page).getAttribute('data-radius'));
    expect(afterOne).toBeCloseTo(27, 0);
    const px = await lightRadiusPx(page);
    await expect.poll(() => lightRadiusPx(page), { timeout: 9000 }).toBeLessThan(px);
  });

  test('the whole room lights up once the house is built', async ({ page }) => {
    const rooms: Record<string, unknown> = {};
    for (const r of ['living-room', 'bedroom', 'kitchen', 'dining-room', 'office', 'bathroom', 'other']) rooms[r] = room(['lighting'], true);
    await seedHaunted(page, { mansion: { houses: [{ id: 'house-1', name: 'The First House', rooms }], activeId: 'house-1', appliedJobs: [] } });
    await gotoHome(page);
    await expect(light(page)).toHaveAttribute('data-lit', 'true');
    await expect(light(page)).toHaveCSS('opacity', '0');
  });

  test('can be switched off in settings while keeping the candle, and remembers the choice', async ({ page }) => {
    await seedHaunted(page);
    await gotoHome(page);
    await page.mouse.move(500, 400);
    await expect(light(page)).toHaveCount(1);

    await openSettings(page);
    await page.getByLabel(/Candlelight darkness/).uncheck();
    await expect(light(page)).toHaveCount(0);
    await expect(candle(page)).toHaveCount(1);

    await page.reload();
    await expect(light(page)).toHaveCount(0);
    await expect(candle(page)).toHaveCount(1);
  });

  test('is off when the candle cursor is off', async ({ page }) => {
    await seedHaunted(page, { candle: false });
    await gotoHome(page);
    await expect(light(page)).toHaveCount(0);
    await openSettings(page);
    await expect(page.getByLabel(/Candlelight darkness/)).toBeDisabled();
  });

  test('does not exist in the Elegant experience', async ({ page }) => {
    await gotoHome(page);
    await expect(page.locator('html')).toHaveAttribute('data-experience', 'elegant');
    await expect(light(page)).toHaveCount(0);
  });

  test('keyboard users are not left in the dark: the light moves to the focused control', async ({ page }) => {
    await seedHaunted(page);
    await gotoHome(page);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const result = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const r = el.getBoundingClientRect();
      const l = document.querySelector('[data-testid="candle-light"]') as HTMLElement;
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, lx: parseFloat(l.style.getPropertyValue('--hf-lx')), ly: parseFloat(l.style.getPropertyValue('--hf-ly')) };
    });
    expect(Math.abs(result.lx - result.cx)).toBeLessThan(2);
    expect(Math.abs(result.ly - result.cy)).toBeLessThan(2);
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('does not ease the radius', async ({ page }) => {
      await seedHaunted(page);
      await gotoHome(page);
      // Chrome reports "no transition" as 0s or a vanishing 1e-05s.
      const seconds = await light(page).evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
      expect(seconds).toBeLessThan(0.01);
    });
  });
});

test.describe('Floating ghosts', () => {
  test('drift slowly along the bottom of the screen, translucent and untouchable', async ({ page }) => {
    const { errors } = await instrument(page);
    await seedHaunted(page);
    await gotoHome(page);

    const layer = page.getByTestId('floating-ghosts');
    await expect(layer).toHaveAttribute('data-count', '3');
    await expect(page.getByTestId('floating-ghost')).toHaveCount(3);

    const info = await page.evaluate(() => {
      const vh = window.innerHeight;
      const root = document.querySelector('[data-testid="floating-ghosts"]') as HTMLElement;
      return {
        pointer: getComputedStyle(root).pointerEvents,
        hidden: root.getAttribute('aria-hidden'),
        blend: getComputedStyle(root).mixBlendMode,
        ghosts: Array.from(document.querySelectorAll<HTMLElement>('[data-testid="floating-ghost"]')).map((g) => {
          const r = g.getBoundingClientRect();
          return { top: r.top / vh, opacity: Number(getComputedStyle(g).opacity), x: r.left };
        }),
      };
    });
    expect(info.pointer).toBe('none');
    expect(info.hidden).toBe('true');
    expect(info.blend).toBe('screen');
    for (const g of info.ghosts) {
      expect(g.top, 'ghost lives in the lower part of the screen').toBeGreaterThan(0.5);
      expect(g.opacity, 'translucent').toBeLessThan(0.3);
    }

    // They actually move, and slowly (a few px/s, not a jump).
    await page.waitForTimeout(3500);
    const later = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('[data-testid="floating-ghost"]')).map((g) => g.getBoundingClientRect().left));
    const moved = later.map((x, i) => Math.abs(x - info.ghosts[i].x));
    expect(Math.max(...moved), 'at least one ghost has drifted').toBeGreaterThan(3);
    expect(Math.max(...moved), 'but slowly').toBeLessThan(150);
    await page.screenshot({ path: `${SHOTS}/31-floating-ghosts.png` });
    expect(errors).toEqual([]);
  });

  test('never intercept clicks on the page', async ({ page }) => {
    await seedHaunted(page);
    await gotoHome(page);
    const hit = await page.evaluate(() => {
      const ghost = document.querySelector('[data-testid="floating-ghost"]') as HTMLElement;
      const r = ghost.getBoundingClientRect();
      const top = document.elementFromPoint(Math.min(window.innerWidth - 2, r.left + r.width / 2), Math.min(window.innerHeight - 2, r.top + r.height / 2));
      return top ? top.closest('[data-testid="floating-ghosts"]') !== null : false;
    });
    expect(hit, 'elementFromPoint must never land on a ghost').toBe(false);
  });

  test('are absent from the Elegant experience and when horror is off', async ({ page }) => {
    await gotoHome(page);
    await expect(page.getByTestId('floating-ghosts')).toHaveCount(0);
    await seedHaunted(page);
    await page.reload();
    await expect(page.getByTestId('floating-ghosts')).toHaveCount(1);
    await openSettings(page);
    await page.getByLabel(/Horror effects/).uncheck();
    await expect(page.getByTestId('floating-ghosts')).toHaveCount(0);
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('stand still', async ({ page }) => {
      await seedHaunted(page);
      await gotoHome(page);
      await expect(page.getByTestId('floating-ghosts')).toHaveAttribute('data-still', 'true');
      const name = await page.locator('.hf-ghost').first().evaluate((el) => getComputedStyle(el).animationName);
      expect(name).toBe('none');
      const a = await page.locator('.hf-ghost').first().evaluate((el) => el.getBoundingClientRect().left);
      await page.waitForTimeout(1500);
      const b = await page.locator('.hf-ghost').first().evaluate((el) => el.getBoundingClientRect().left);
      expect(b).toBe(a);
    });
  });

  test('thin out as rooms are cleared (but one always remains)', async ({ page }) => {
    await seedHaunted(page, { mansion: mansionWith(['bedroom', 'kitchen', 'dining-room', 'office', 'bathroom']) }); // 2 uncleared
    await gotoHome(page);
    await expect(page.getByTestId('floating-ghosts')).toHaveAttribute('data-count', '2');

    const all = ['living-room', 'bedroom', 'kitchen', 'dining-room', 'office', 'bathroom', 'other'];
    await page.evaluate((rooms) => {
      const state = JSON.parse(localStorage.getItem('hoomefy_mansion') as string);
      for (const r of rooms) state.state.houses[0].rooms[r] = { spirits: [], initial: ['lighting'], cleared: true };
      localStorage.setItem('hoomefy_mansion', JSON.stringify(state));
    }, all);
    await page.reload();
    await expect(page.getByTestId('floating-ghosts')).toHaveAttribute('data-count', '1');
  });
});

test.describe('Build the house, replace the furniture, clear the ghosts', () => {
  async function toStudioWithPhoto(page: Page, mansion: unknown) {
    await seedHaunted(page, { mansion });
    await signIn(page);
    const png = await makeRoomPng(page);
    await page.locator('input[type="file"]').setInputFiles({ name: 'room.png', mimeType: 'image/png', buffer: png });
    await expect(page.locator('img[alt="room.png"]')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /Living Room/ }).click();
    await page.getByRole('button', { name: /^Scandinavian/ }).click();
  }
  const chip = (page: Page, label: RegExp) => page.getByTestId('furniture-picker').getByRole('button', { name: label });

  test('the haunting report names the spirits and the furniture they are bound to', async ({ page }) => {
    await toStudioWithPhoto(page, mansionWith([]));
    const report = page.getByTestId('spirit-report');
    await expect(report).toContainText('2 spirits linger here');
    await expect(report).toContainText('The Lady on the Settee');
    await expect(report).toContainText('The Lamplighter');

    // The matching furniture chips carry the ghost marker; others do not.
    await expect(chip(page, /Sofas & seating/)).toHaveAttribute('data-bound', 'true');
    await expect(chip(page, /Lamps & lighting/)).toHaveAttribute('data-bound', 'true');
    await expect(chip(page, /Rugs & curtains/)).not.toHaveAttribute('data-bound', /.*/);
    await report.scrollIntoViewIfNeeded();
    await report.screenshot({ path: `${SHOTS}/32-haunting-report.png` });
  });

  test('the Haunted studio has no "Your mansion" panel, but the spirits are still there', async ({ page }) => {
    await toStudioWithPhoto(page, mansionWith(['bedroom']));
    await expect(page.getByText('Your mansion')).toHaveCount(0);
    await expect(page.getByText(/rooms cleared/)).toHaveCount(0);
    await expect(page.getByTestId('spirit-report')).toContainText('2 spirits linger here');
    await expect(page.getByTestId('floating-ghosts')).toBeAttached();
    await page.screenshot({ path: `${SHOTS}/36-studio-without-mansion-panel.png` });
  });
  test('replacing the right furniture drives a spirit out; the rest linger until replaced too', async ({ page }) => {
    test.setTimeout(150_000);
    const { errors } = await instrument(page);
    await toStudioWithPhoto(page, mansionWith(['bedroom', 'kitchen', 'dining-room', 'office', 'bathroom']));
    expect(await clearedRooms(page)).toBe(5);
    await expect(page.getByTestId('floating-ghosts')).toHaveAttribute('data-count', '2');

    // 1. Replace only the seating.
    await chip(page, /Sofas & seating/).click();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('hoomefy_studio_state') as string).state.preferences.replaceFurniture);
    expect(stored).toEqual(['seating']);
    await page.getByRole('button', { name: 'Develop the Photograph' }).click();
    await expect(page.getByTestId('result-panel')).toBeVisible({ timeout: 40_000 });

    const banner = page.getByTestId('outcome-banner');
    await expect(banner).toHaveAttribute('data-driven', '1');
    await expect(banner).toHaveAttribute('data-remaining', '1');
    await expect(banner).toHaveAttribute('data-room-cleared', 'false');
    await expect(banner).toContainText('The Lady on the Settee');
    await expect(banner).toContainText('Still lingering: The Lamplighter');
    await expect(banner).toContainText('Replace the lamps & lighting');
    expect(await clearedRooms(page)).toBe(5);
    await expect(page.getByTestId('spirit-report')).toContainText('A spirit lingers here');
    await expect(page.locator('[data-testid="spirit"][data-furniture="seating"]')).toHaveAttribute('data-state', /leaving|gone/);
    await expect(page.locator('[data-testid="spirit"][data-furniture="lighting"]')).toHaveAttribute('data-state', 'lingering');
    await page.waitForTimeout(700);
    await page.getByTestId('result-panel').scrollIntoViewIfNeeded();
    await page.getByTestId('result-panel').screenshot({ path: `${SHOTS}/33-spirit-leaving.png` });
    // after the animation the driven spirit is removed
    await expect(page.locator('[data-testid="spirit"][data-furniture="seating"]')).toHaveAttribute('data-state', 'gone', { timeout: 6000 });

    // 2. Replace the lighting too: the room is cleared and the haunting thins out.
    await chip(page, /Lamps & lighting/).click();
    await page.getByRole('button', { name: 'Develop the Photograph' }).click();
    await expect(banner).toHaveAttribute('data-room-cleared', 'true', { timeout: 40_000 });
    await expect(banner).toContainText('The Living Room is at peace');
    expect(await clearedRooms(page)).toBe(6);
    await expect(page.getByTestId('spirit-report')).toHaveAttribute('data-state', 'cleared');
    await expect(page.getByTestId('floating-ghosts')).toHaveAttribute('data-count', '1');

    expect(errors).toEqual([]);
  });

  test('replacing nothing clears nothing, and the user is told why', async ({ page }) => {
    test.setTimeout(100_000);
    await toStudioWithPhoto(page, mansionWith([]));
    await page.getByRole('button', { name: 'Develop the Photograph' }).click();
    await expect(page.getByTestId('result-panel')).toBeVisible({ timeout: 40_000 });
    const banner = page.getByTestId('outcome-banner');
    await expect(banner).toContainText('No furniture was replaced, so the spirits stay');
    await expect(banner).toHaveAttribute('data-driven', '0');
    expect(await clearedRooms(page)).toBe(0);
    await expect(page.getByTestId('spirit-report')).toContainText('2 spirits linger here');
  });

  test('clearing the last room builds the house and lights it', async ({ page }) => {
    test.setTimeout(100_000);
    await toStudioWithPhoto(page, mansionWith(['bedroom', 'kitchen', 'dining-room', 'office', 'bathroom', 'other']));
    expect(await clearedRooms(page)).toBe(6);
    await chip(page, /Sofas & seating/).click();
    await chip(page, /Lamps & lighting/).click();
    await page.getByRole('button', { name: 'Develop the Photograph' }).click();
    const banner = page.getByTestId('outcome-banner');
    await expect(banner).toContainText('is built', { timeout: 40_000 });
    expect(await clearedRooms(page)).toBe(7);
    await expect(light(page)).toHaveAttribute('data-lit', 'true'); // the whole house is lit
  });
  test('progress survives a reload', async ({ page }) => {
    await seedHaunted(page, { mansion: mansionWith(['bedroom', 'kitchen']) });
    await signIn(page);
    expect(await clearedRooms(page)).toBe(2);
    await page.reload();
    expect(await clearedRooms(page)).toBe(2);
  });

  test('the Elegant studio has the furniture picker but no ghosts, spirits or mansion', async ({ page }) => {
    await seedElegantSeen(page);
    await signIn(page);
    await expect(page.locator('html')).toHaveAttribute('data-experience', 'elegant');
    const picker = page.getByTestId('furniture-picker');
    await expect(picker).toBeVisible();
    expect(await picker.innerText()).not.toMatch(/spirit|ghost|haunt/i);
    await expect(page.getByTestId('spirit-report')).toHaveCount(0);
    await expect(page.getByTestId('floating-ghosts')).toHaveCount(0);
  });
});

test('the haunted gallery has no "Your mansion" panel', async ({ page }) => {
  await seedHaunted(page, { mansion: mansionWith(['bedroom']) });
  await signIn(page);
  await page.locator('header').getByRole('link', { name: 'My Designs' }).click();
  await expect(page).toHaveURL(/\/gallery$/);
  await expect(page.getByRole('heading', { name: 'The Archive' })).toBeVisible();
  await expect(page.getByText('Your mansion')).toHaveCount(0);
  await expect(page.getByText(/rooms cleared/)).toHaveCount(0);
});
