import { test, expect, type Page } from '@playwright/test';
import { SHOTS, instrument, makeRoomPng, seedElegantSeen, signIn } from './helpers';

/**
 * The Haunted Design Studio is a Ouija board with a blank polaroid. The photograph appears in the polaroid; touching it
 * opens the Gothic Moonlit Ritual Chamber, where five candles are lit in any order. Each lit candle speaks its line
 * (script1..5.mp3, by how many are lit) and shows it in the middle; lighting the fifth begins the design.
 * Demo rendering is used, so no real AI is involved.
 */

const MESSAGES = [
  'By the first flame, awaken the secrets buried beneath these walls.',
  'By the second flame, bind the restless echoes wandering between worlds.',
  'By the third flame, purge the darkness from every forgotten memory.',
  'By the fourth flame, let all corrupted spirits dissolve into eternal silence.',
  'By the fifth and final flame, the power of the circle COMPELS YOU!',
];

async function seedHaunted(page: Page, options: { sound: boolean }) {
  await page.addInitScript((sound) => {
    localStorage.setItem(
      'hoomefy_haunting',
      JSON.stringify({ state: { experience: 'haunted', horrorEnabled: true, takeoverSeen: true, audioEnabled: sound, candleCursor: false, candleDarkness: false }, version: 0 })
    );
    // Record every recording the page starts playing.
    const w = window as unknown as { __played: string[] };
    w.__played = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      w.__played.push(new URL(this.currentSrc || this.src, location.href).pathname);
      return play.call(this);
    };
  }, options.sound);
}

const played = (page: Page) => page.evaluate(() => (window as unknown as { __played: string[] }).__played.filter((p) => p.includes('/audio/ritual/')));

async function uploadRoom(page: Page) {
  const png = await makeRoomPng(page);
  await page.locator('input[type="file"]').setInputFiles({ name: 'room.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByTestId('polaroid-photo')).toBeVisible({ timeout: 15_000 });
}

async function chooseRoomAndStyle(page: Page) {
  await page.getByRole('button', { name: /Living Room/ }).click();
  await page.getByRole('button', { name: /^Scandinavian/ }).click();
}

const candle = (page: Page, id: string) => page.locator(`button.rt-candle[data-candle="${id}"]`);
const message = (page: Page) => page.getByTestId('ritual-message');

test.describe('The Haunted studio: Ouija board and polaroid', () => {
  test('the whole studio sits on the Ouija board, and the photograph appears in the polaroid in the middle', async ({ page }) => {
    const { errors } = await instrument(page);
    await seedHaunted(page, { sound: false });
    await signIn(page);

    await expect(page.getByTestId('ouija-board')).toBeAttached();
    const stage = page.getByTestId('polaroid-stage');
    await expect(stage).toBeVisible();
    await expect(page.getByRole('heading', { name: 'The Seance Table' })).toBeVisible();
    await expect(page.getByTestId('polaroid-dropzone')).toBeVisible();
    await expect(page.getByTestId('stage-line')).toContainText('Lay a photograph');
    // The board really is the page background: its picture is loaded and fills the screen.
    const board = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="ouija-board"] img') as HTMLImageElement;
      const r = el.getBoundingClientRect();
      return { loaded: el.complete && el.naturalWidth === 1672, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight };
    });
    expect(board.loaded).toBe(true);
    expect(board.w).toBeGreaterThanOrEqual(board.vw - 1);
    expect(board.h).toBeGreaterThanOrEqual(board.vh - 1);
    await page.screenshot({ path: `${SHOTS}/60-ritual-board-empty.png` });

    await uploadRoom(page);
    // The photograph is in the middle of the screen and inside the polaroid.
    const box = (await page.getByTestId('polaroid-photo').boundingBox())!;
    const card = (await stage.boundingBox())!;
    const vp = page.viewportSize()!;
    expect(box.x).toBeGreaterThan(card.x);
    expect(box.x + box.width).toBeLessThan(card.x + card.width);
    expect(box.y).toBeGreaterThan(card.y);
    expect(box.y + box.height).toBeLessThan(card.y + card.height);
    expect(Math.abs(box.x + box.width / 2 - vp.width / 2)).toBeLessThan(30);
    expect(box.width).toBeGreaterThan(200);
    await page.screenshot({ path: `${SHOTS}/61-ritual-board-photo.png` });
    expect(errors).toEqual([]);
  });

  test('"Whisper your wishes" has a spooky guide whose phrases fill the box', async ({ page }) => {
    await seedHaunted(page, { sound: false });
    await signIn(page);
    const box = page.getByLabel(/Whisper your wishes/);
    await expect(box).toBeVisible();
    await page.getByText('How to whisper to the spirits').click();
    await page.getByRole('button', { name: 'Keep the fireplace exactly as it is' }).click();
    await page.getByRole('button', { name: 'Warm lamps, like candles in the dark' }).click();
    await expect(box).toHaveValue('Keep the fireplace exactly as it is. Warm lamps, like candles in the dark');
  });

  test('touching the photograph before the room and style are chosen explains what is missing', async ({ page }) => {
    await seedHaunted(page, { sound: false });
    await signIn(page);
    await uploadRoom(page);
    await expect(page.getByTestId('begin-ritual')).toContainText('Name the room and style first');
    await page.getByTestId('begin-ritual').click();
    await expect(page.getByText('The flames are not ready')).toBeVisible();
    await expect(page.getByTestId('candle-ritual')).toHaveCount(0);
  });
});

test.describe('The candle ritual', () => {
  test('five candles, lit in any order: each speaks its line in order, and the fifth begins the design', async ({ page }) => {
    test.setTimeout(120_000);
    const { errors } = await instrument(page);
    await seedHaunted(page, { sound: true });
    await signIn(page);
    await uploadRoom(page);
    await chooseRoomAndStyle(page);
    await expect(page.getByTestId('begin-ritual')).toContainText('Light the candles');
    await expect(page.getByTestId('stage-line')).toContainText('Touch the photograph to light the five flames');

    // Touch the photograph.
    await page.getByTestId('begin-ritual').click();
    const ritual = page.getByTestId('candle-ritual');
    await expect(ritual).toBeVisible();
    await expect(ritual).toHaveAttribute('role', 'dialog');
    await expect(page.locator('button.rt-candle')).toHaveCount(5);
    await expect(message(page)).toContainText('Five flames wait in the circle');
    await expect(ritual).toHaveAttribute('data-ready', 'true', { timeout: 10_000 });
    await page.screenshot({ path: `${SHOTS}/62-ritual-unlit.png` });

    // Not left to right: lower right, top, left, lower left, right.
    const order = ['bottom-right', 'top', 'left', 'bottom-left', 'right'];
    for (let i = 0; i < 4; i++) {
      await candle(page, order[i]).click();
      await expect(candle(page, order[i])).toHaveAttribute('data-lit', 'true');
      await expect(message(page)).toHaveText(MESSAGES[i]);
      await expect(page.getByTestId('ritual-count')).toHaveAttribute('aria-label', `${i + 1} of 5 flames lit`);
      expect(await played(page)).toEqual([1, 2, 3, 4, 5].slice(0, i + 1).map((n) => `/audio/ritual/script${n}.mp3`));
      if (i === 1) await page.screenshot({ path: `${SHOTS}/63-ritual-two-lit.png` });
    }
    // The candles that were not touched are still dark; nothing has started yet.
    await expect(candle(page, 'right')).toHaveAttribute('data-lit', 'false');
    await expect(page.getByTestId('generation-progress')).toHaveCount(0);

    // A lit candle is marked disabled for assistive technology and does nothing when touched again (force: Playwright
    // would otherwise refuse to click an aria-disabled button).
    await expect(candle(page, 'top')).toHaveAttribute('aria-disabled', 'true');
    await candle(page, 'top').click({ force: true });
    expect((await played(page)).length).toBe(4);

    // The fifth: the final words, the voice, and the design begins.
    await candle(page, order[4]).click();
    await expect(message(page)).toHaveText(MESSAGES[4]);
    await expect(ritual).toHaveAttribute('data-complete', 'true');
    expect(await played(page)).toEqual([1, 2, 3, 4, 5].map((n) => `/audio/ritual/script${n}.mp3`));
    await page.screenshot({ path: `${SHOTS}/64-ritual-complete.png` });

    // The room fades away by itself once the last voice has finished, leaving the design on its way.
    await expect(ritual).toHaveCount(0, { timeout: 25_000 });
    await expect(page.getByTestId('result-panel')).toBeVisible({ timeout: 40_000 });
    await expect(page.getByRole('slider', { name: /Compare Before and After/ })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/65-ritual-result.png` });
    expect(errors).toEqual([]);
  });

  test('the toolbar button "Develop the Photograph" opens the same ritual', async ({ page }) => {
    await seedHaunted(page, { sound: false });
    await signIn(page);
    await uploadRoom(page);
    await chooseRoomAndStyle(page);
    await page.getByRole('button', { name: 'Develop the Photograph' }).click();
    await expect(page.getByTestId('candle-ritual')).toBeVisible();
  });

  test('without sound the words still appear, nothing is played, and the ritual still completes', async ({ page }) => {
    test.setTimeout(90_000);
    await seedHaunted(page, { sound: false });
    await signIn(page);
    await uploadRoom(page);
    await chooseRoomAndStyle(page);
    await page.getByTestId('begin-ritual').click();
    for (const [i, id] of ['left', 'right', 'top', 'bottom-left', 'bottom-right'].entries()) {
      await candle(page, id).click();
      await expect(message(page)).toHaveText(MESSAGES[i]);
    }
    expect(await played(page)).toEqual([]);
    await expect(page.getByTestId('candle-ritual')).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByTestId('result-panel')).toBeVisible({ timeout: 40_000 });
  });

  test('leaving early with Escape starts nothing and the next ritual begins from zero', async ({ page }) => {
    await seedHaunted(page, { sound: false });
    await signIn(page);
    await uploadRoom(page);
    await chooseRoomAndStyle(page);
    await page.getByTestId('begin-ritual').click();
    await candle(page, 'top').click();
    await candle(page, 'left').click();
    await expect(page.getByTestId('ritual-count')).toHaveAttribute('aria-label', '2 of 5 flames lit');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('candle-ritual')).toHaveCount(0);
    await expect(page.getByTestId('generation-progress')).toHaveCount(0);
    await expect(page.getByTestId('result-panel')).toHaveCount(0);

    await page.getByTestId('begin-ritual').click();
    await expect(page.getByTestId('ritual-count')).toHaveAttribute('aria-label', '0 of 5 flames lit');
    await expect(message(page)).toContainText('Five flames wait');
    await page.getByRole('button', { name: 'Leave the circle' }).click();
    await expect(page.getByTestId('candle-ritual')).toHaveCount(0);
  });

  test('can be done from the keyboard alone', async ({ page }) => {
    await seedHaunted(page, { sound: false });
    await signIn(page);
    await uploadRoom(page);
    await chooseRoomAndStyle(page);
    await page.getByTestId('begin-ritual').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('candle-ritual')).toBeVisible();
    // Focus starts on the first candle; Enter lights it, Tab goes to the next.
    await expect(candle(page, 'top')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(candle(page, 'top')).toHaveAttribute('data-lit', 'true');
    await page.keyboard.press('Tab');
    await expect(candle(page, 'left')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(message(page)).toHaveText(MESSAGES[1]);
  });

  test('under reduced motion the flames and words appear without animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedHaunted(page, { sound: false });
    await signIn(page);
    await uploadRoom(page);
    await chooseRoomAndStyle(page);
    await page.getByTestId('begin-ritual').click();
    await candle(page, 'top').click();
    const styles = await page.evaluate(() => {
      const flame = document.querySelector('.rt-flamebox[data-lit="true"]') as HTMLElement;
      const word = document.querySelector('.rt-word') as HTMLElement;
      return {
        flameAnim: getComputedStyle(flame).animationName,
        flameOpacity: getComputedStyle(flame).opacity,
        wordAnim: getComputedStyle(word).animationName,
        wordOpacity: getComputedStyle(word).opacity,
        boardAnim: getComputedStyle(document.querySelector('.rt-board__glow') as HTMLElement).animationName,
      };
    });
    expect(styles).toEqual({ flameAnim: 'none', flameOpacity: '1', wordAnim: 'none', wordOpacity: '1', boardAnim: 'none' });
  });

  test('with motion allowed the candles flicker and the board is alive', async ({ page }) => {
    await seedHaunted(page, { sound: false });
    await signIn(page);
    await uploadRoom(page);
    await chooseRoomAndStyle(page);
    const board = await page.evaluate(() => ({
      glow: getComputedStyle(document.querySelector('.rt-board__glow') as HTMLElement).animationName,
      wander: getComputedStyle(document.querySelector('.rt-board__wander') as HTMLElement).animationName,
    }));
    expect(board.glow).toBe('rt-flicker-glow');
    expect(board.wander).toContain('rt-wander');
    await page.getByTestId('begin-ritual').click();
    await candle(page, 'right').click();
    const flicker = await page.evaluate(() => getComputedStyle(document.querySelector('.rt-flamebox[data-lit="true"]') as HTMLElement).animationName);
    expect(flicker).toBe('rt-flicker');
  });
});

test.describe('The Elegant studio is unchanged', () => {
  test('no board, no polaroid, no ritual: Generate Design starts the design at once', async ({ page }) => {
    test.setTimeout(90_000);
    await seedElegantSeen(page);
    await signIn(page);
    await expect(page.getByTestId('ouija-board')).toHaveCount(0);
    await expect(page.getByTestId('polaroid-stage')).toHaveCount(0);
    await expect(page.getByLabel(/Extra instructions/)).toBeVisible();
    await expect(page.getByTestId('whisper-guide')).toHaveCount(0);
    await expect(page.locator('html')).not.toHaveAttribute('data-studio-board', /.*/);
    await uploadRoom2(page);
    await chooseRoomAndStyle(page);
    await page.getByRole('button', { name: 'Generate Design' }).click();
    await expect(page.getByTestId('candle-ritual')).toHaveCount(0);
    await expect(page.getByTestId('result-panel')).toBeVisible({ timeout: 40_000 });
  });
});

/** Elegant has no polaroid; its photo shows in the ordinary preview. */
async function uploadRoom2(page: Page) {
  const png = await makeRoomPng(page);
  await page.locator('input[type="file"]').setInputFiles({ name: 'room.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('.hf-evidence img[alt="room.png"]')).toBeVisible({ timeout: 15_000 });
}
