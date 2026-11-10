import { test, expect } from '@playwright/test';
import {
  SHOTS,
  bodyBackground,
  gotoHome,
  instrument,
  makeRoomPng,
  noHorizontalOverflow,
  openSettings,
  phases,
  seedElegantSeen,
  developPhotograph,
  signIn,
  waitForHaunted,
  waitForPhase,
} from './helpers';

// Runs only in the "mobile" project (Pixel 5, coarse pointer, touch).

test.describe('Mobile', () => {
  test('elegant home fits the viewport and uses the lighter effect budget', async ({ page }) => {
    const { errors } = await instrument(page);
    await gotoHome(page);

    await noHorizontalOverflow(page);
    const lite = await page.evaluate(() => ({
      strips: document.querySelectorAll('.hf-strip').length,
      coarse: matchMedia('(pointer: coarse), (max-width: 767px)').matches,
    }));
    expect(lite.coarse).toBe(true);
    expect(lite.strips, 'fewer tearing strips on mobile').toBeLessThanOrEqual(5);

    const toggle = await page.getByRole('button', { name: 'Experience settings' }).boundingBox();
    expect(toggle!.width).toBeGreaterThanOrEqual(44);
    expect(toggle!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: `${SHOTS}/20-mobile-elegant.png` });
    expect(errors).toEqual([]);
  });

  test('takeover completes on mobile with a reduced filter count, then the UI is usable', async ({ page }) => {
    test.setTimeout(90_000);
    const { errors } = await instrument(page);
    await gotoHome(page);

    // Scroll with touch-like wheel steps until the reveal
    await page.mouse.move(180, 400);
    for (let i = 0; i < 80; i++) {
      if (await page.evaluate(() => !!document.documentElement.dataset.takeover)) break;
      await page.mouse.wheel(0, 380);
      await page.waitForTimeout(110);
    }
    await waitForPhase(page, 'A');

    const skip = await page.getByTestId('skip-transition').boundingBox();
    expect(skip!.height, 'Skip is a 44px touch target').toBeGreaterThanOrEqual(44);

    await waitForPhase(page, 'B');
    await page.waitForTimeout(400);
    const filtered = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('[data-distort]')).filter((e) => e.style.filter).length);
    expect(filtered, 'at most 3 filtered elements on mobile').toBeLessThanOrEqual(3);
    await page.screenshot({ path: `${SHOTS}/21-mobile-phase-B.png` });

    await waitForHaunted(page, 15_000);
    expect(await phases(page)).toEqual(['A', 'B', 'C', 'D', 'none']);
    const bg = await bodyBackground(page);
    expect([bg.r, bg.g, bg.b]).toEqual([11, 8, 9]);
    await noHorizontalOverflow(page);

    // Hamburger navigation still works after the possession
    await page.evaluate(() => window.scrollTo(0, 0));
    const menuButton = page.getByRole('button', { name: 'Toggle navigation menu' });
    await menuButton.tap();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    await page.locator('header').getByRole('link', { name: 'About' }).tap();
    await expect(page).toHaveURL(/\/about$/);
    // The new page starts at the top and the menu has closed.
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(5);
    await noHorizontalOverflow(page);

    // A navigation that does NOT come from the menu (a footer link) must also leave the menu closed.
    await menuButton.tap();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.locator('footer').getByRole('link', { name: 'How It Works' }).tap();
    await expect(page).toHaveURL(/\/how-it-works$/);
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(5);
    await page.screenshot({ path: `${SHOTS}/22-mobile-haunted-about.png` });

    // The settings control remains reachable and large enough
    await openSettings(page);
    await expect(page.getByRole('button', { name: 'Elegant mode' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('touch devices keep the normal pointer (no candle) and see at most two ghosts', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('hoomefy_haunting', JSON.stringify({ state: { experience: 'haunted', horrorEnabled: true, takeoverSeen: true, candleCursor: true }, version: 0 }));
    });
    await gotoHome(page);
    await expect(page.locator('[data-testid="candle-cursor"]')).toHaveCount(0);
    await expect(page.locator('html')).not.toHaveAttribute('data-candle', /.*/);
    const ghosts = await page.getByTestId('floating-ghost').count();
    expect(ghosts).toBeGreaterThanOrEqual(1);
    expect(ghosts).toBeLessThanOrEqual(2);
    await noHorizontalOverflow(page);
    await page.screenshot({ path: `${SHOTS}/36-mobile-haunted-home.png` });
  });
  test('photo upload and generation work on mobile after the transformation', async ({ page }) => {
    test.setTimeout(150_000);
    await page.addInitScript(() => {
      localStorage.setItem('hoomefy_haunting', JSON.stringify({ state: { experience: 'haunted', horrorEnabled: true, takeoverSeen: true }, version: 0 }));
    });
    const { errors } = await instrument(page);
    await signIn(page);
    await expect(page.locator('html')).toHaveAttribute('data-experience', 'haunted');
    await noHorizontalOverflow(page);

    const png = await makeRoomPng(page);
    await page.locator('input[type="file"]').setInputFiles({ name: 'room.png', mimeType: 'image/png', buffer: png });
    await expect(page.locator('img[alt="room.png"]')).toBeVisible({ timeout: 15_000 });
    // On a phone the choices live under Settings in the bottom bar.
    await expect(page.getByTestId('settings-callout')).toBeVisible();
    await page.getByTestId('mobile-nav').getByRole('button', { name: 'Settings' }).tap();
    await page.getByRole('button', { name: /Japandi/ }).tap();
    await developPhotograph(page, { tap: true });

    await expect(page.getByRole('heading', { name: 'Reconstructing your space...' })).toBeVisible();
    await expect(page.getByTestId('result-panel')).toBeVisible({ timeout: 40_000 });
    await noHorizontalOverflow(page);
    await page.screenshot({ path: `${SHOTS}/23-mobile-haunted-result.png` });
    expect(errors).toEqual([]);
  });
});

test.describe('Mobile: the rooms, the ghost and the holy water', () => {
  test('rooms open full-screen, the ghost and its bubble fit, and the holy water can be found and used by touch', async ({ page }) => {
    test.setTimeout(90_000);
    await page.addInitScript(() => {
      localStorage.setItem('hoomefy_haunting', JSON.stringify({ state: { experience: 'haunted', horrorEnabled: true, takeoverSeen: true, audioEnabled: false }, version: 0 }));
    });
    const { errors } = await instrument(page);
    await gotoHome(page);
    await noHorizontalOverflow(page);
    const vp = page.viewportSize()!;

    // the ghost: small enough to leave room, big enough to tap, and its bubble stays on screen
    const ghost = page.getByTestId('ghost-target');
    await expect(ghost).toBeVisible({ timeout: 10_000 });
    const g = (await ghost.boundingBox())!;
    expect(g.width).toBeGreaterThanOrEqual(44);
    expect(g.width).toBeLessThanOrEqual(110);
    const b = (await page.getByTestId('ghost-bubble').boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(vp.width);

    // open the library by touch
    const card = page.getByTestId('room-card-library');
    await card.scrollIntoViewIfNeeded();
    await card.tap();
    const viewer = page.getByTestId('room-viewer');
    await expect(viewer).toBeVisible();
    await noHorizontalOverflow(page);
    const img = (await viewer.locator('img').boundingBox())!;
    expect(img.x).toBeGreaterThanOrEqual(0);
    expect(img.x + img.width).toBeLessThanOrEqual(vp.width + 1);
    const close = (await page.getByRole('button', { name: 'Close the room' }).boundingBox())!;
    expect(close.width).toBeGreaterThanOrEqual(44);
    expect(close.height).toBeGreaterThanOrEqual(44);

    // find the holy water
    const bottle = page.getByTestId('holy-water-library');
    const bb = (await bottle.boundingBox())!;
    expect(bb.width).toBeGreaterThanOrEqual(44);
    expect(bb.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: `${SHOTS}/24-mobile-room-viewer.png` });
    await bottle.tap();
    await page.getByRole('button', { name: 'Close the room' }).tap();
    await expect(viewer).toHaveCount(0);

    // use it: tap the bottle, then the ghost; the effect plays, Skip returns the site to Elegant
    const slot = page.getByTestId('holy-water-slot');
    await expect(slot).toBeVisible();
    const s = (await slot.boundingBox())!;
    expect(s.width).toBeGreaterThanOrEqual(44);
    expect(s.height).toBeGreaterThanOrEqual(44);
    await slot.tap();
    await expect(slot).toHaveAttribute('aria-pressed', 'true');
    await ghost.tap();
    const video = page.getByTestId('holy-video');
    await expect(video).toBeVisible();
    const skip = (await video.getByRole('button', { name: 'Skip' }).boundingBox())!;
    expect(skip.height).toBeGreaterThanOrEqual(44);
    await video.getByRole('button', { name: 'Skip' }).tap();
    await expect(page.locator('html')).toHaveAttribute('data-experience', 'elegant');
    await expect(ghost).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('there is no candle on a touch screen, so the jumpscare never starts', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('hoomefy_haunting', JSON.stringify({ state: { experience: 'haunted', horrorEnabled: true, takeoverSeen: true, audioEnabled: false }, version: 0 }));
    });
    await gotoHome(page);
    await expect(page.getByTestId('candle-cursor')).toHaveCount(0);
    await expect(page.getByTestId('candle-light')).toHaveCount(0);
    await expect(page.getByTestId('ghost-target')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('holy-video')).toHaveCount(0);
  });
});

test.describe('Mobile: the design studio', () => {
  test('a full-width canvas with a bottom bar for Design, Furniture and Settings', async ({ page }) => {
    test.setTimeout(120_000);
    await seedElegantSeen(page);
    const { errors } = await instrument(page);
    await signIn(page);
    await noHorizontalOverflow(page);

    const nav = page.getByTestId('mobile-nav');
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Design' })).toHaveAttribute('aria-current', 'page');

    // Design is the first thing seen: the upload area, full width, with the other panels out of the way.
    await expect(page.getByRole('region', { name: 'Design canvas' })).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Design controls' })).toBeHidden();
    await expect(page.getByRole('complementary', { name: 'Design assistant' })).toBeHidden();
    const vp = page.viewportSize()!;
    const canvas = (await page.getByRole('region', { name: 'Design canvas' }).boundingBox())!;
    expect(canvas.width).toBeGreaterThan(vp.width - 48);
    await page.screenshot({ path: `${SHOTS}/40-mobile-studio-design.png` });

    await nav.getByRole('button', { name: 'Settings' }).tap();
    await expect(page.getByRole('complementary', { name: 'Design controls' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Design canvas' })).toBeHidden();
    await noHorizontalOverflow(page);
    await page.screenshot({ path: `${SHOTS}/41-mobile-studio-settings.png` });

    await nav.getByRole('button', { name: 'Furniture' }).tap();
    await expect(page.getByRole('complementary', { name: 'Design assistant' })).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Design controls' })).toBeHidden();
    await noHorizontalOverflow(page);

    // Generating brings the result back to the Design tab.
    await nav.getByRole('button', { name: 'Design' }).tap();
    const png = await makeRoomPng(page);
    await page.locator('input[type="file"]').setInputFiles({ name: 'room.png', mimeType: 'image/png', buffer: png });
    await expect(page.locator('.hf-evidence img[alt="room.png"]')).toBeVisible({ timeout: 15_000 });
    await nav.getByRole('button', { name: 'Settings' }).tap();
    await page.getByRole('button', { name: /^Scandinavian/ }).tap();
    await page.getByRole('button', { name: 'Generate Design' }).tap();
    await expect(page.getByTestId('result-panel')).toBeVisible({ timeout: 40_000 });
    await expect(nav.getByRole('button', { name: 'Design' })).toHaveAttribute('aria-current', 'page');
    await noHorizontalOverflow(page);
    await page.screenshot({ path: `${SHOTS}/42-mobile-studio-result.png` });
    expect(errors).toEqual([]);
  });
});