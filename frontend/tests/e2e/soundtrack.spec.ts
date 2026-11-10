import { expect, test, type Page } from '@playwright/test';
import { gotoHome, instrument, scrollUntilTakeover, waitForHaunted, waitForPhase } from './helpers';

const STING = '/audio/haunting-start.mp3';
const AMBIENT = '/audio/haunted-ambient.mp3';

interface MediaLog {
  plays: { src: string; loop: boolean; volume: number }[];
  pauses: string[];
  els: HTMLMediaElement[];
  refuse: boolean;
}

/** Replaces play()/pause() so the test can see what the page asked for (and refuse it like an autoplay policy). */
async function stubMedia(page: Page, opts: { refuseFirst?: boolean } = {}) {
  await page.addInitScript((refuse) => {
    const log: MediaLog = { plays: [], pauses: [], els: [], refuse };
    (window as unknown as { __media: MediaLog }).__media = log;
    HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) {
      if (!log.els.includes(this)) log.els.push(this);
      if (log.refuse) {
        const err = new Error('play() refused: no user gesture');
        err.name = 'NotAllowedError';
        log.plays.push({ src: new URL(this.src).pathname + ':refused', loop: this.loop, volume: this.volume });
        return Promise.reject(err);
      }
      log.plays.push({ src: new URL(this.src).pathname, loop: this.loop, volume: this.volume });
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function pause(this: HTMLMediaElement) {
      log.pauses.push(new URL(this.src).pathname);
    };
  }, !!opts.refuseFirst);
}

const plays = (page: Page) => page.evaluate(() => (window as unknown as { __media: MediaLog }).__media.plays);
/** Which files were asked to play, in order, once each (the dev server mounts effects twice under React StrictMode). */
const played = async (page: Page) => [...new Set((await plays(page)).map((p) => p.src))];
/** Every click in the Haunted site also crackles like a flame (see features/haunting/clickSound.ts); it is not the soundtrack. */
const CLICK_SOUND = '/audio/firesound.mp3';
const soundtrackOnly = async (page: Page) => (await played(page)).filter((src) => src !== CLICK_SOUND);
const pauses = (page: Page) => page.evaluate(() => (window as unknown as { __media: MediaLog }).__media.pauses);

async function endSting(page: Page) {
  await page.evaluate((src) => {
    const log = (window as unknown as { __media: MediaLog }).__media;
    log.els.find((e) => new URL(e.src).pathname === src)?.dispatchEvent(new Event('ended'));
  }, STING);
}

async function seed(page: Page, state: Record<string, unknown>) {
  // Once per session, so a reload keeps whatever the app has stored since (e.g. a mute).
  await page.addInitScript((s) => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    localStorage.setItem('hoomefy_haunting', JSON.stringify({ state: s, version: 0 }));
  }, state);
}

test.describe('Haunted soundtrack', () => {
  test('the real audio files are served and decode', async ({ page }) => {
    await page.goto('/');
    const durations = await page.evaluate(async ([a, b]) => {
      const load = (src: string) =>
        new Promise<number>((resolve, reject) => {
          const el = new Audio(src);
          el.preload = 'metadata';
          el.onloadedmetadata = () => resolve(el.duration);
          el.onerror = () => reject(new Error(`cannot load ${src}`));
        });
      return [await load(a), await load(b)];
    }, [STING, AMBIENT]);
    expect(durations[0]).toBeGreaterThan(8);
    expect(durations[0]).toBeLessThan(9);
    expect(durations[1]).toBeGreaterThan(60);
  });

  test('triggering the haunting plays the sting first, then loops the ambient track', async ({ page }) => {
    test.setTimeout(90_000);
    const { errors } = await instrument(page);
    await stubMedia(page);
    await gotoHome(page);
    expect(await plays(page), 'nothing plays in the Elegant experience').toEqual([]);

    await scrollUntilTakeover(page);
    await waitForPhase(page, 'A');
    await expect.poll(() => played(page)).toEqual([STING]);
    const sting = (await plays(page))[0];
    expect(sting.loop).toBe(false);
    expect(sting.volume).toBeGreaterThan(0.5);

    // The ambient loop must not start on top of the sting.
    await waitForHaunted(page);
    expect(await played(page)).toEqual([STING]);

    await endSting(page);
    await expect.poll(() => played(page)).toEqual([STING, AMBIENT]);
    expect((await plays(page)).at(-1)?.loop).toBe(true);
    expect(errors).toEqual([]);
  });

  test('a page that is already Haunted plays only the ambient loop', async ({ page }) => {
    await stubMedia(page);
    await seed(page, { experience: 'haunted', horrorEnabled: true, takeoverSeen: true, candleCursor: false });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-experience', 'haunted');

    await expect.poll(() => played(page)).toEqual([AMBIENT]);
  });

  test('the mute control silences the sound, and the choice is remembered', async ({ page }) => {
    await stubMedia(page);
    await seed(page, { experience: 'haunted', horrorEnabled: true, takeoverSeen: true, candleCursor: false });
    await page.goto('/');
    await expect.poll(() => played(page)).toEqual([AMBIENT]);

    await page.getByRole('button', { name: 'Mute sound' }).click();
    await expect.poll(() => pauses(page)).toContain(AMBIENT);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('hoomefy_haunting') as string).state.audioEnabled);
    expect(stored).toBe(false);
    await expect(page.getByRole('button', { name: 'Unmute sound' })).toBeVisible();

    // Muted stays muted after a reload
    await page.reload();
    await expect(page.getByRole('button', { name: 'Unmute sound' })).toBeVisible();
    await page.waitForTimeout(600);
    // (the media log starts empty again after a reload)
    expect(await plays(page), 'nothing plays while muted').toEqual([]);

    await page.getByRole('button', { name: 'Unmute sound' }).click();
    await expect.poll(() => played(page)).toEqual([AMBIENT]);
  });

  test('there is no sound and no sound control in the Elegant experience, or with horror effects off', async ({ page }) => {
    await stubMedia(page);
    await page.goto('/');
    await expect(page.getByRole('button', { name: /mute sound/i })).toHaveCount(0);

    await seed(page, { experience: 'haunted', horrorEnabled: false, takeoverSeen: true });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-experience', 'elegant');
    await expect(page.getByRole('button', { name: /mute sound/i })).toHaveCount(0);
    expect(await plays(page)).toEqual([]);
  });

  test('when the browser refuses autoplay, the first click starts the sound', async ({ page }) => {
    await stubMedia(page, { refuseFirst: true });
    await seed(page, { experience: 'haunted', horrorEnabled: true, takeoverSeen: true, candleCursor: false });
    await page.goto('/');
    await expect.poll(() => played(page)).toEqual([`${AMBIENT}:refused`]);

    await page.evaluate(() => {
      (window as unknown as { __media: MediaLog }).__media.refuse = false;
    });
    await page.mouse.click(300, 300);
    await expect.poll(() => soundtrackOnly(page)).toEqual([`${AMBIENT}:refused`, AMBIENT]);
    // The same click also made the fire crackle.
    expect(await played(page)).toContain(CLICK_SOUND);
  });
});
