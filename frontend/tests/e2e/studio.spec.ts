import { test, expect, type Page } from '@playwright/test';
import {
  SHOTS,
  gotoHome,
  instrument,
  seedElegantSeen,
  makeRoomPng,
  openSettings,
  signIn,
  textContrast,
  waitForHaunted,
  waitForPhase,
} from './helpers';

async function uploadAndConfigure(page: Page) {
  const png = await makeRoomPng(page);
  await page.locator('input[type="file"]').setInputFiles({ name: 'room.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('img[alt="room.png"]')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /Living Room/ }).click();
  await page.getByRole('button', { name: /^Scandinavian/ }).click();
}

/** Polls the on-screen generation stage while the real mock job runs. */
async function watchStages(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __stages: string[] };
    w.__stages = [];
    setInterval(() => {
      const el = document.querySelector('[data-testid="generation-progress"]');
      const s = el?.getAttribute('data-stage');
      if (s && w.__stages[w.__stages.length - 1] !== s) w.__stages.push(s);
    }, 120);
  });
}
const stages = (page: Page) => page.evaluate(() => (window as unknown as { __stages: string[] }).__stages);

test.describe('Studio in the Elegant experience', () => {
  test('upload, choose, generate and compare', async ({ page }) => {
    test.setTimeout(90_000);
    const { errors } = await instrument(page);
    await seedElegantSeen(page);
    await signIn(page);

    await expect(page.getByRole('heading', { name: 'Design Studio' })).toBeVisible();
    expect(await textContrast(page, 'h1')).toBeGreaterThanOrEqual(4.5);
    await page.screenshot({ path: `${SHOTS}/10-studio-elegant-empty.png` });

    await uploadAndConfigure(page);
    await page.screenshot({ path: `${SHOTS}/11-studio-elegant-ready.png` });

    await watchStages(page);
    await page.getByRole('button', { name: 'Generate Design' }).click();

    await expect(page.getByTestId('generation-progress')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Designing your space...' })).toBeVisible();
    await expect(page.getByTestId('result-panel')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('slider', { name: /Compare Before and After/ })).toBeVisible();

    const seenStages = await stages(page);
    expect(seenStages[0]).toBe('queued');
    expect(seenStages).toContain('developing');
    expect(seenStages.indexOf('queued')).toBeLessThan(seenStages.indexOf('developing'));
    await page.screenshot({ path: `${SHOTS}/12-studio-elegant-result.png` });
    expect(errors).toEqual([]);
  });
});

test.describe('Photo upload and AI generation after the transformation', () => {
  test('the real flow works end-to-end inside the haunted mansion', async ({ page }) => {
    test.setTimeout(150_000);
    const { errors } = await instrument(page);

    // Sign in as an Elegant visitor, then choose Haunted mode from the settings.
    await seedElegantSeen(page);
    await signIn(page);
    await openSettings(page);
    await page.getByRole('button', { name: 'Haunted mode' }).click();
    await waitForHaunted(page, 10_000);
    await page.keyboard.press('Escape'); // close the settings panel

    // Client-side navigation into the Studio, still possessed.
    await page.locator('header').getByRole('link', { name: 'Design Studio' }).click();
    await expect(page).toHaveURL(/\/studio$/);
    await expect(page.locator('html')).toHaveAttribute('data-experience', 'haunted');

    // Seance-table upload panel
    await expect(page.getByRole('heading', { name: 'The Seance Table' })).toBeVisible();
    await expect(page.getByText('Every room has a story. Show us yours.')).toBeVisible();
    expect(await textContrast(page, 'h1')).toBeGreaterThanOrEqual(4.5);
    await page.screenshot({ path: `${SHOTS}/13-studio-haunted-empty.png` });

    await uploadAndConfigure(page);
    await expect(page.locator('.hf-evidence img[alt="room.png"]')).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/14-studio-haunted-ready.png` });

    await watchStages(page);
    await page.getByRole('button', { name: 'Develop the Photograph' }).click();

    // "Reconstructing your space..." and a stage that follows the real job status
    await expect(page.getByRole('heading', { name: 'Reconstructing your space...' })).toBeVisible();
    await expect(page.locator('.hf-develop')).toBeVisible();
    await expect(page.getByTestId('generation-progress')).toHaveAttribute('data-stage', 'developing', { timeout: 20_000 });
    await page.screenshot({ path: `${SHOTS}/15-studio-haunted-developing.png` });

    await expect(page.getByTestId('result-panel')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('What developed')).toBeVisible();
    const seenStages = await stages(page);
    expect(seenStages[0]).toBe('queued');
    expect(seenStages).toContain('developing');
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${SHOTS}/16-studio-haunted-result.png` });

    await expect(page.locator('html')).toHaveAttribute('data-experience', 'haunted');
    expect(errors).toEqual([]);
  });

  test('replaying the haunting mid-generation does not interrupt the generation or lose any input', async ({ page }) => {
    test.setTimeout(120_000);
    // A returning visitor who has already seen the reveal, so the Replay control exists.
    await page.addInitScript(() => {
      localStorage.setItem(
        'hoomefy_haunting',
        JSON.stringify({ state: { experience: 'elegant', horrorEnabled: true, takeoverSeen: true }, version: 0 })
      );
    });
    const { errors } = await instrument(page);
    await signIn(page);
    await uploadAndConfigure(page);
    await watchStages(page);

    await page.getByRole('button', { name: 'Generate Design' }).click();
    await expect(page.getByTestId('generation-progress')).toBeVisible();

    // Deliberate replay while the job is running.
    await openSettings(page);
    await page.getByRole('button', { name: 'Replay the Haunting' }).click();
    await waitForPhase(page, 'A');

    // The sequence runs, and the generation is untouched by it.
    await expect(page.getByTestId('generation-progress').or(page.getByTestId('result-panel'))).toBeVisible();
    await waitForHaunted(page, 15_000);

    await expect(page.getByTestId('result-panel')).toBeVisible({ timeout: 40_000 });
    // The photo is still the one that was uploaded.
    await expect(page.getByTestId('photo-row')).toContainText('room.png');
    await expect(page.getByRole('slider', { name: /Compare Before and After/ })).toBeVisible();
    const seenStages = await stages(page);
    expect(seenStages).toContain('developing');
    expect(seenStages[seenStages.length - 1]).not.toBe('failed');
    expect(errors).toEqual([]);
  });
});
test('home page works for a visitor who is not signed in', async ({ page }) => {
  await seedElegantSeen(page);
  await gotoHome(page);
  await expect(page.getByRole('link', { name: 'Design My Room' })).toBeVisible();
  await page.getByRole('link', { name: 'Design My Room' }).click();
  await expect(page).toHaveURL(/\/signin$/); // protected route redirects to sign in
});
