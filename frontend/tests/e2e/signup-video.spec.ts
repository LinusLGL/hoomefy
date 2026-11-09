import { expect, test } from '@playwright/test';
import { instrument } from './helpers';

async function seed(page: import('@playwright/test').Page, state: Record<string, unknown>) {
  await page.addInitScript((s) => {
    localStorage.setItem('hoomefy_haunting', JSON.stringify({ state: s, version: 0 }));
  }, state);
}

const HAUNTED = { experience: 'haunted', horrorEnabled: true, takeoverSeen: true, candleCursor: false, audioEnabled: false };

test.describe('Haunted sign-up background video', () => {
  test('loops a muted video behind the form, and it really plays', async ({ page }) => {
    const { errors } = await instrument(page);
    await seed(page, HAUNTED);
    await page.goto('/signup');

    const video = page.locator('[data-testid="haunted-backdrop"] video');
    await expect(video).toHaveCount(1);
    await expect(video).toHaveAttribute('src', '/video/signup-background.mp4');
    expect(await video.evaluate((v: HTMLVideoElement) => ({ loop: v.loop, muted: v.muted, autoplay: v.autoplay }))).toEqual({
      loop: true,
      muted: true,
      autoplay: true,
    });

    // It is decoded and advancing, not just present
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState >= 2 && !v.paused && v.currentTime > 0.3), { timeout: 20_000 })
      .toBe(true);
    const info = await video.evaluate((v: HTMLVideoElement) => ({ w: v.videoWidth, h: v.videoHeight, d: v.duration }));
    expect(info.w).toBe(1280);
    expect(info.h).toBe(720);
    expect(info.d).toBeGreaterThan(11);

    // "Keep looping": seek to the end and it comes back to the start while still playing.
    await video.evaluate((v: HTMLVideoElement) => {
      v.currentTime = v.duration - 0.2;
    });
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime < 5 && !v.paused && !v.ended), { timeout: 10_000 })
      .toBe(true);

    expect(errors).toEqual([]);
  });

  test('the form stays usable and readable over the video', async ({ page }) => {
    await seed(page, HAUNTED);
    await page.goto('/signup');

    await expect(page.getByRole('heading', { name: 'Create Your Account' })).toBeVisible();
    await page.getByLabel('Full Name').fill('Jane Doe');
    await expect(page.getByLabel('Full Name')).toHaveValue('Jane Doe');
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeEnabled();

    // The card is on top of the video and receives clicks
    const topElementIsCard = await page.evaluate(() => {
      const card = document.querySelector('.hf-auth__card') as HTMLElement;
      const r = card.getBoundingClientRect();
      const el = document.elementFromPoint(r.x + r.width / 2, r.y + 8);
      return !!el && card.contains(el);
    });
    expect(topElementIsCard).toBe(true);
    await page.screenshot({ path: `${process.env.PW_OUTPUT_DIR ?? process.env.TEMP ?? '.'}/hoomefy-signup-haunted.png` });
  });

  test('shows a still poster instead of the video when the visitor prefers reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seed(page, HAUNTED);
    await page.goto('/signup');

    await expect(page.locator('[data-testid="haunted-backdrop"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="haunted-backdrop"] video')).toHaveCount(0);
    await expect(page.locator('[data-testid="haunted-backdrop"] img')).toHaveAttribute('src', '/video/signup-poster.jpg');
  });

  test('the Elegant sign-up page has no video', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: 'Create Your Account' })).toBeVisible();
    await expect(page.locator('video')).toHaveCount(0);
    await expect(page.locator('[data-testid="haunted-backdrop"]')).toHaveCount(0);
  });

});
