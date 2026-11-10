import { test, expect, type Page } from '@playwright/test';
import { SHOTS, completeRitual, makeRoomPng, mockItemFinder, seedElegantSeen, signIn } from './helpers';

/**
 * The Design Studio is one fixed screen on laptop and desktop: the page never scrolls, none of its three
 * columns needs to scroll, and every control can be reached without scrolling, in both experiences, with no
 * photo, with a photo, and with a finished design. Screens shorter than about 740px may scroll inside a column,
 * so the sizes here start at the common 1366x768 laptop.
 */
const SIZES = [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

/**
 * Haunted, with the most spirits a room can have (three), because each one adds a line to the haunting report
 * and that is the tallest the left column ever gets. The seed is applied once per browser context.
 */
async function seedHaunted(page: Page) {
  await page.addInitScript(() => {
    if (localStorage.getItem('__e2e_seeded')) return;
    localStorage.setItem('__e2e_seeded', '1');
    localStorage.setItem(
      'hoomefy_haunting',
      JSON.stringify({ state: { experience: 'haunted', horrorEnabled: true, takeoverSeen: true, audioEnabled: false, candleCursor: false, candleDarkness: false }, version: 0 })
    );
    const spirits = ['seating', 'lighting', 'tables'];
    const house = { id: 'house-1', name: 'The First House', rooms: { 'living-room': { spirits, initial: spirits, cleared: false } } };
    localStorage.setItem('hoomefy_mansion', JSON.stringify({ state: { houses: [house], activeId: 'house-1', appliedJobs: [] }, version: 0 }));
  });
}

/** How far the page and each column would have to scroll (0 means everything is on screen). */
const overflow = (page: Page) =>
  page.evaluate(() => {
    const over = (el: Element | null) => (el ? el.scrollHeight - el.clientHeight : 0);
    return {
      page: document.documentElement.scrollHeight - window.innerHeight,
      left: over(document.querySelector('aside[aria-label="Design controls"]')),
      centre: over(document.querySelector('section[aria-label="Design canvas"]')),
      right: over(document.querySelector('aside[aria-label="Design assistant"]')),
    };
  });

const rect = (page: Page, selector: string) =>
  page.evaluate((s) => {
    const els = [...document.querySelectorAll(s)];
    return els.map((e) => {
      const r = e.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, name: (e.textContent ?? '').trim().slice(0, 30) };
    });
  }, selector);

async function expectFits(page: Page, label: string) {
  const o = await overflow(page);
  expect(o, `${label}: nothing may scroll`).toEqual({ page: 0, left: 0, centre: 0, right: 0 });
  const vh = page.viewportSize()!.height;

  // Every control is inside the screen, top and bottom.
  const controls = await rect(
    page,
    [
      '[data-style]',
      'aside[aria-label="Design controls"] button[aria-pressed]',
      '#intensity',
      '#custom-instructions',
      '#budget',
      '[role="tablist"] [role="tab"]',
    ].join(',')
  );
  expect(controls.length, `${label}: controls found`).toBeGreaterThan(10);
  for (const c of controls) {
    expect(c.top, `${label}: ${c.name} top`).toBeGreaterThanOrEqual(0);
    expect(c.bottom, `${label}: ${c.name} bottom`).toBeLessThanOrEqual(vh + 1);
  }

  // The fixed sound / settings buttons must not sit on top of anything clickable in the left column.
  const floating = await rect(page, '[data-hf-controls]');
  if (floating.length) {
    const leftControls = await rect(page, 'aside[aria-label="Design controls"] button, aside[aria-label="Design controls"] input');
    for (const f of floating) {
      for (const c of leftControls) {
        const overlaps = c.left < f.right && c.right > f.left && c.top < f.bottom && c.bottom > f.top;
        expect(overlaps, `${label}: "${c.name}" is covered by the sound/settings buttons`).toBe(false);
      }
    }
  }
}

for (const mode of ['elegant', 'haunted'] as const) {
  test.describe(`Design studio fits the screen (${mode})`, () => {
    test.beforeEach(async ({ page }) => {
      if (mode === 'elegant') await seedElegantSeen(page);
      else await seedHaunted(page);
    });

    for (const size of SIZES) {
      test(`${size.width}x${size.height}: no scrolling with no photo, with a photo and with a finished design`, async ({ page }) => {
        test.setTimeout(120_000);
        await page.setViewportSize(size);
        await mockItemFinder(page);
        await signIn(page);
        await expect(page.getByRole('heading', { name: 'Design Studio' })).toBeVisible();
        const tag = `${mode}-${size.width}x${size.height}`;

        // 1. Nothing uploaded yet.
        await expectFits(page, `${tag} empty`);
        await page.screenshot({ path: `${SHOTS}/40-fit-${tag}-empty.png` });

        // 2. Photo uploaded and a style chosen.
        const png = await makeRoomPng(page);
        await page.locator('input[type="file"]').setInputFiles({ name: 'room.png', mimeType: 'image/png', buffer: png });
        await expect(page.getByTestId('photo-row')).toContainText('room.png', { timeout: 15_000 });
        await page.getByRole('button', { name: /^Scandinavian/ }).click();
        await expectFits(page, `${tag} photo`);
        await page.screenshot({ path: `${SHOTS}/41-fit-${tag}-photo.png` });

        // 3. A finished design, with the history strip (two versions) and the tools showing.
        const generate = page.getByRole('button', { name: /Generate Design|Develop the Photograph/ });
        await generate.click();
        if (mode === 'haunted') await completeRitual(page);
        await expect(page.getByTestId('result-panel')).toBeVisible({ timeout: 40_000 });
        await page.getByTestId('regenerate').click();
        await expect(page.getByTestId('history').getByRole('button')).toHaveCount(2, { timeout: 40_000 });
        await expectFits(page, `${tag} result`);
        // The image and every tool are on screen, and the image is not squashed to nothing.
        const stage = (await rect(page, '[data-testid="canvas-stage"]'))[0];
        expect(stage.bottom).toBeLessThanOrEqual(page.viewportSize()!.height);
        expect(stage.bottom - stage.top, `${tag}: the canvas has room`).toBeGreaterThan(300);
        for (const name of ['Download', 'Regenerate', 'Save design', 'Zoom in']) {
          const box = await page.getByRole('button', { name }).first().boundingBox();
          expect(box, `${tag}: ${name}`).not.toBeNull();
          expect(box!.y + box!.height, `${tag}: ${name} on screen`).toBeLessThanOrEqual(page.viewportSize()!.height);
        }
        await page.screenshot({ path: `${SHOTS}/42-fit-${tag}-result.png` });
      });
    }
  });
}
