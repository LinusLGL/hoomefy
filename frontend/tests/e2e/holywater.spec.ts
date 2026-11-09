import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { gotoHome, instrument } from './helpers';

/**
 * The Haunted rooms and the holy water hunt: three room paintings that open full-screen, a holy water
 * hidden in each, the ghost that guides the visitor (bottom right, 3 seconds after the page), the
 * jumpscare when the candle has been at its lowest for 12 seconds, and the cure that returns the site
 * to Elegant.
 */

const ROOMS = [
  { id: 'drawing-room', name: 'The Drawing Room', file: 'drawing-room', clue: /never finished/i },
  { id: 'library', name: 'The Library', file: 'library', clue: /between the inkwell and the great tome/i },
  { id: 'grand-ballroom', name: 'The Grand Ballroom', file: 'grand-ballroom', clue: /mask beside the wine/i },
] as const;

interface Seed {
  candle?: boolean;
  experience?: 'haunted' | 'elegant';
  /** What the tab session already remembers. */
  session?: { foundIn?: string | null; scared?: boolean; cured?: boolean };
}

async function seed(page: Page, { candle = false, experience = 'haunted', session }: Seed = {}) {
  await page.addInitScript(
    ({ candle, experience, session }) => {
      localStorage.setItem(
        'hoomefy_haunting',
        JSON.stringify({
          state: { experience, horrorEnabled: true, takeoverSeen: true, candleCursor: candle, candleDarkness: candle, audioEnabled: false },
          version: 0,
        })
      );
      if (session && !sessionStorage.getItem('hoomefy_holywater')) {
        sessionStorage.setItem('hoomefy_holywater', JSON.stringify({ state: { foundIn: null, scared: false, cured: false, ...session }, version: 0 }));
      }
    },
    { candle, experience, session }
  );
}

const ghost = (page: Page) => page.getByTestId('ghost-target');
const bubble = (page: Page) => page.getByTestId('ghost-bubble');
const viewer = (page: Page) => page.getByTestId('room-viewer');
const video = (page: Page) => page.getByTestId('holy-video');
const slot = (page: Page) => page.getByTestId('holy-water-slot');
const stored = (page: Page) =>
  page.evaluate(() => JSON.parse(sessionStorage.getItem('hoomefy_holywater') ?? '{}').state ?? {});

async function openRoom(page: Page, id: string) {
  const card = page.getByTestId(`room-card-${id}`);
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await expect(viewer(page)).toHaveAttribute('data-room', id);
  await expect(viewer(page).locator('img')).toBeVisible();
}

const centre = (box: { x: number; y: number; width: number; height: number }) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

async function dragBottleOntoGhost(page: Page) {
  const from = centre((await slot(page).boundingBox())!);
  const to = centre((await ghost(page).boundingBox())!);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 6 });
  await expect(page.getByTestId('holy-water-drag')).toBeVisible();
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await expect(ghost(page)).toHaveAttribute('data-over', 'true');
  await page.mouse.up();
}

test.describe('The room paintings', () => {
  test('the three Haunted Styles cards show the drawing room, the library and the grand ballroom', async ({ page }) => {
    const { errors } = await instrument(page);
    await seed(page);
    await gotoHome(page);

    await expect(page.locator('.hf-room__image')).toHaveCount(3);
    for (const room of ROOMS) {
      const card = page.getByTestId(`room-card-${room.id}`);
      await card.scrollIntoViewIfNeeded();
      const img = card.locator('xpath=preceding-sibling::img');
      await expect(img).toHaveAttribute('src', `/images/haunted/rooms/${room.file}-thumb.webp`);
      await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth), { message: `${room.name} image loaded` }).toBe(800);
      await expect(card).toHaveAccessibleName(`${room.name}: view the room full-screen`);
    }
    expect(errors).toEqual([]);
  });

  test('Elegant keeps its colour swatches and has no room buttons', async ({ page }) => {
    await seed(page, { experience: 'elegant' });
    await gotoHome(page);
    await expect(page.locator('.hf-room')).toHaveCount(0);
    await expect(page.locator('[data-testid^="room-card-"]')).toHaveCount(0);
    await expect(page.getByTestId('ghost-target')).toHaveCount(0);
  });

  for (const room of ROOMS) {
    test(`clicking ${room.name} expands its painting; Escape closes it and focus returns to the card`, async ({ page }) => {
      await seed(page);
      await gotoHome(page);
      await openRoom(page, room.id);

      await expect(page.getByRole('dialog', { name: `${room.name}, enlarged` })).toBeVisible();
      const img = viewer(page).locator('img');
      await expect(img).toHaveAttribute('src', `/images/haunted/rooms/${room.file}.webp`);
      await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBe(1672);

      // the painting fits the window, whole
      const box = (await img.boundingBox())!;
      const vp = page.viewportSize()!;
      expect(box.width).toBeLessThanOrEqual(vp.width);
      expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
      expect(box.width / box.height).toBeCloseTo(1672 / 941, 1);
      expect(box.width, 'much bigger than the card').toBeGreaterThan(700);

      await page.keyboard.press('Escape');
      await expect(viewer(page)).toHaveCount(0);
      await expect(page.getByTestId(`room-card-${room.id}`)).toBeFocused();
    });
  }

  test('the close button, and a click outside the painting, also close it', async ({ page }) => {
    await seed(page);
    await gotoHome(page);

    await openRoom(page, 'library');
    await page.getByRole('button', { name: 'Close the room' }).click();
    await expect(viewer(page)).toHaveCount(0);

    await openRoom(page, 'library');
    await page.mouse.click(6, 400);
    await expect(viewer(page)).toHaveCount(0);

    await openRoom(page, 'library');
    await viewer(page).locator('img').click({ position: { x: 300, y: 200 } });
    await expect(viewer(page)).toHaveCount(1); // clicking the painting does not close it
  });

  test('the page behind cannot be used while a room is open, and works again afterwards', async ({ page }) => {
    await seed(page);
    await gotoHome(page);
    await openRoom(page, 'library');

    await expect(page.locator('.hf-app')).toHaveAttribute('inert', '');
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await page.keyboard.press('Escape');
    await expect(page.locator('.hf-app')).not.toHaveAttribute('inert', '');
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  });

  test('is shown above the dark room, so the whole painting can be searched', async ({ page }) => {
    await seed(page, { candle: true });
    await gotoHome(page);
    await page.mouse.move(640, 400);
    await openRoom(page, 'library');

    const lit = await viewer(page).locator('img').evaluate((img) => {
      const r = img.getBoundingClientRect();
      // a corner of the painting, far from the candle, must be the painting and not the darkness
      return document.elementFromPoint(r.x + 12, r.y + 12) === img;
    });
    expect(lit).toBe(true);
    const zViewer = await viewer(page).evaluate((e) => Number(getComputedStyle(e).zIndex));
    const zDark = await page.getByTestId('candle-light').evaluate((e) => Number(getComputedStyle(e).zIndex));
    expect(zViewer).toBeGreaterThan(zDark);
  });
});

test.describe('The ghost', () => {
  test('appears at the bottom right no sooner than 3 seconds after the haunted page, and stays', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __ghostAt?: number };
      new MutationObserver(() => {
        if (!w.__ghostAt && document.querySelector('[data-testid="ghost-target"]')) w.__ghostAt = performance.now();
      }).observe(document, { subtree: true, childList: true });
    });
    await seed(page);
    await page.goto('/');

    await expect(ghost(page)).toBeVisible({ timeout: 10_000 });
    const at = await page.evaluate(() => (window as unknown as { __ghostAt: number }).__ghostAt);
    expect(at, 'not before 3 seconds').toBeGreaterThanOrEqual(3000);
    expect(at, 'and soon after').toBeLessThan(8000);

    const vp = page.viewportSize()!;
    const box = (await ghost(page).boundingBox())!;
    expect(vp.width - (box.x + box.width)).toBeLessThan(32);
    expect(vp.height - (box.y + box.height)).toBeLessThan(32);
    expect(box.width).toBeLessThanOrEqual(140);

    // it stays: still there much later, and it does not move off
    await page.waitForTimeout(1500);
    await expect(ghost(page)).toBeVisible();
  });

  test('the picture is the avatar, animated, and its black background is blended away', async ({ page }) => {
    await seed(page);
    await gotoHome(page);
    await expect(ghost(page)).toBeVisible({ timeout: 10_000 });

    const img = ghost(page).locator('img');
    await expect(img).toHaveAttribute('src', '/images/haunted/avatar.webp');
    await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBe(256);
    expect(await ghost(page).evaluate((e) => getComputedStyle(e).mixBlendMode)).toBe('screen');
  });

  test('a speech bubble on its head asks the visitor to explore the Haunted Styles and collect holy water', async ({ page }) => {
    await seed(page);
    await gotoHome(page);
    await expect(ghost(page)).toBeVisible({ timeout: 10_000 });

    await expect(bubble(page)).toBeVisible();
    await expect(bubble(page)).toContainText(/explore the haunted styles and collect the holy water/i);
    await expect(bubble(page)).toContainText(/scare you when the fire is gone/i);

    // sits on top of the ghost's head, tail pointing at it
    const b = (await bubble(page).boundingBox())!;
    const g = (await ghost(page).boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(g.y + 8);
    expect(b.x + b.width).toBeGreaterThan(g.x);
  });

  test('stays on every Haunted page, and never blocks the page', async ({ page }) => {
    await seed(page);
    await gotoHome(page);
    await expect(ghost(page)).toBeVisible({ timeout: 10_000 });

    await page.getByRole('link', { name: 'How It Works' }).first().click();
    await expect(page).toHaveURL(/how-it-works/);
    await expect(ghost(page)).toBeVisible();
    await page.getByRole('link', { name: 'About' }).first().click();
    await expect(page).toHaveURL(/about/);
    await expect(ghost(page)).toBeVisible();

    // the layer holding the bubble lets every click through
    expect(await page.locator('.hf-avatar').evaluate((e) => getComputedStyle(e).pointerEvents)).toBe('none');
  });

  test('pressing the ghost says it again after the bubble has gone', async ({ page }) => {
    await seed(page);
    await gotoHome(page);
    await expect(ghost(page)).toBeVisible({ timeout: 10_000 });
    await expect(bubble(page)).toBeVisible();
    await expect(bubble(page)).toBeHidden({ timeout: 20_000 });

    await ghost(page).click();
    await expect(bubble(page)).toBeVisible();
  });

  test('with reduced motion it shows a still picture and does not bob', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seed(page);
    await gotoHome(page);
    await expect(ghost(page)).toBeVisible({ timeout: 10_000 });
    await expect(ghost(page).locator('img')).toHaveAttribute('src', '/images/haunted/avatar-still.webp');
    expect(await ghost(page).locator('img').evaluate((e) => getComputedStyle(e).animationName)).toBe('none');
  });

  test('the ghost does not exist in Elegant mode', async ({ page }) => {
    await seed(page, { experience: 'elegant' });
    await gotoHome(page);
    await page.waitForTimeout(3600);
    await expect(ghost(page)).toHaveCount(0);
  });
});

test.describe('Finding the holy water', () => {
  for (const room of ROOMS) {
    test(`${room.name}: the ghost gives the clue, the holy water is there to find, and collecting it puts it beside the ghost`, async ({ page }) => {
      await seed(page);
      await gotoHome(page);
      await expect(ghost(page)).toBeVisible({ timeout: 10_000 });
      await openRoom(page, room.id);

      // hint: a chat bubble on top of the ghost
      await expect(bubble(page)).toContainText(room.clue);

      const bottle = page.getByTestId(`holy-water-${room.id}`);
      await expect(bottle).toBeVisible();
      const b = (await bottle.boundingBox())!;
      expect(b.width, 'a comfortable touch target').toBeGreaterThanOrEqual(44);
      // it is inside the painting
      const p = (await viewer(page).locator('img').boundingBox())!;
      expect(b.x).toBeGreaterThan(p.x);
      expect(b.x + b.width).toBeLessThan(p.x + p.width);
      expect(b.y).toBeGreaterThan(p.y);
      expect(b.y + b.height).toBeLessThan(p.y + p.height);

      await bottle.click();
      await expect(bottle).toHaveCount(0);
      await expect(viewer(page).getByRole('status')).toContainText('Holy water collected');
      expect((await stored(page)).foundIn).toBe(room.id);

      // beside the ghost, bottom right
      await expect(slot(page)).toBeVisible();
      const s = (await slot(page).boundingBox())!;
      const g = (await ghost(page).boundingBox())!;
      expect(s.x + s.width).toBeLessThanOrEqual(g.x + 8);
      expect(Math.abs(s.y + s.height - (g.y + g.height))).toBeLessThan(40);
      await expect(bubble(page)).toContainText(/found the holy water/i);
    });
  }

  test('one holy water is enough: the other rooms no longer hide one', async ({ page }) => {
    await seed(page, { session: { foundIn: 'library' } });
    await gotoHome(page);
    for (const other of ['drawing-room', 'grand-ballroom']) {
      await openRoom(page, other);
      await expect(page.locator('[data-testid^="holy-water-"]')).toHaveCount(0);
      await page.keyboard.press('Escape');
    }
  });

  test('keyboard: open a room with Enter, Tab to the holy water, collect it with Enter', async ({ page }) => {
    await seed(page);
    await gotoHome(page);
    await expect(ghost(page)).toBeVisible({ timeout: 10_000 });

    const card = page.getByTestId('room-card-grand-ballroom');
    await card.scrollIntoViewIfNeeded();
    await card.focus();
    await page.keyboard.press('Enter');
    await expect(viewer(page)).toHaveAttribute('data-room', 'grand-ballroom');
    await expect(page.getByRole('button', { name: 'Close the room' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByTestId('holy-water-grand-ballroom')).toBeFocused();
    await page.keyboard.press('Enter');
    expect((await stored(page)).foundIn).toBe('grand-ballroom');

    // Tab stays inside the dialog
    for (let i = 0; i < 4; i++) await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[data-testid="room-viewer"]'))).toBe(true);
  });

  test('the holy water is remembered through a reload in the same tab', async ({ page }) => {
    await seed(page);
    await gotoHome(page);
    await openRoom(page, 'library');
    await page.getByTestId('holy-water-library').click();
    await page.keyboard.press('Escape');

    await page.reload();
    await expect(slot(page)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Using the holy water on the ghost', () => {
  test('dragging the bottle onto the ghost plays the effect video, then the whole site returns to Elegant', async ({ page }) => {
    const { errors } = await instrument(page);
    await seed(page, { session: { foundIn: 'library' } });
    await gotoHome(page);
    await expect(slot(page)).toBeVisible({ timeout: 10_000 });

    await dragBottleOntoGhost(page);

    await expect(video(page)).toBeVisible();
    await expect(video(page)).toHaveAttribute('data-kind', 'cure');
    await expect(video(page).locator('video')).toHaveAttribute('src', '/video/holywater.mp4');
    await expect.poll(() => video(page).locator('video').evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 10_000 }).toBeGreaterThan(0);

    // let it play to the end
    await expect(video(page)).toHaveCount(0, { timeout: 20_000 });

    await expect(page.locator('html')).toHaveAttribute('data-experience', 'elegant');
    await expect(ghost(page)).toHaveCount(0);
    await expect(slot(page)).toHaveCount(0);
    await expect(page.locator('.hf-room')).toHaveCount(0);
    expect((await stored(page)).cured).toBe(true);
    expect(errors).toEqual([]);
  });

  test('Skip ends the effect straight away and still returns the site to Elegant', async ({ page }) => {
    await seed(page, { session: { foundIn: 'drawing-room' } });
    await gotoHome(page);
    await expect(slot(page)).toBeVisible({ timeout: 10_000 });
    await dragBottleOntoGhost(page);

    await video(page).getByRole('button', { name: 'Skip' }).click();
    await expect(video(page)).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-experience', 'elegant');
  });

  test('pressing the bottle and then the ghost works too (and with the keyboard)', async ({ page }) => {
    await seed(page, { session: { foundIn: 'grand-ballroom' } });
    await gotoHome(page);
    await expect(slot(page)).toBeVisible({ timeout: 10_000 });

    await ghost(page).click(); // without the bottle in hand: nothing is used
    await expect(video(page)).toHaveCount(0);

    await slot(page).focus();
    await page.keyboard.press('Enter');
    await expect(slot(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(ghost(page)).toHaveAttribute('data-armed', 'true');
    await expect(bubble(page)).toContainText(/touch me with it/i);

    await ghost(page).focus();
    await page.keyboard.press('Enter');
    await expect(video(page)).toHaveAttribute('data-kind', 'cure');
    await page.keyboard.press('Escape');
    await expect(page.locator('html')).toHaveAttribute('data-experience', 'elegant');
  });

  test('dropping the bottle anywhere else does nothing', async ({ page }) => {
    await seed(page, { session: { foundIn: 'library' } });
    await gotoHome(page);
    await expect(slot(page)).toBeVisible({ timeout: 10_000 });

    const from = centre((await slot(page).boundingBox())!);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(500, 300, { steps: 8 });
    await expect(page.getByTestId('holy-water-drag')).toBeVisible();
    await page.mouse.up();

    await expect(page.getByTestId('holy-water-drag')).toHaveCount(0);
    await expect(video(page)).toHaveCount(0);
    await expect(slot(page)).toBeVisible();
    await expect(slot(page)).toHaveAttribute('aria-pressed', 'false');
  });

  test('choosing Haunted mode again resets the hunt: the ghost returns and the holy water is hidden again', async ({ page }) => {
    await seed(page, { session: { foundIn: 'library' } });
    await gotoHome(page);
    await expect(slot(page)).toBeVisible({ timeout: 10_000 });
    await dragBottleOntoGhost(page);
    await video(page).getByRole('button', { name: 'Skip' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-experience', 'elegant');

    await page.getByRole('button', { name: 'Experience settings' }).click();
    await page.getByRole('button', { name: 'Haunted mode' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-experience', 'haunted');

    await expect(ghost(page)).toBeVisible({ timeout: 10_000 });
    await expect(slot(page)).toHaveCount(0);
    const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('hoomefy_holywater') ?? '{}').state);
    expect(saved).toMatchObject({ foundIn: null, scared: false, cured: false });
  });

  test('going back resets the hunt', async ({ page }) => {
    await seed(page, { session: { foundIn: 'library', scared: true } });
    await gotoHome(page);
    await expect(slot(page)).toBeVisible({ timeout: 10_000 });

    await page.evaluate(() => window.history.pushState({}, '', '/?step=2'));
    await page.goBack();
    await expect(ghost(page)).toBeVisible({ timeout: 10_000 });
    await expect(slot(page)).toHaveCount(0);
  });
});

test.describe('The jumpscare: the candle at its lowest for 12 seconds', () => {
  // Stepping a frozen clock 36 s forward makes the browser run about two thousand animation frames of
  // the page's own work, so these tests take 40 to 60 real seconds each.
  test.describe.configure({ timeout: 180_000 });

  /** A frozen clock, so the 5-second and 12-second timers can be stepped exactly. */
  async function startFrozen(page: Page, s: Seed) {
    await page.clock.install();
    await seed(page, { candle: true, ...s });
    await gotoHome(page);
    await page.mouse.move(640, 400);
    const now = await page.evaluate(() => Date.now());
    await page.clock.pauseAt(now + 1000);
  }
  const radius = (page: Page) => page.getByTestId('candle-light').getAttribute('data-radius');

  /**
   * Lets the candle burn down (30% loses a tenth of itself every 5 s: seven ticks to the 15% floor), one
   * second at a time, and stops the moment it reaches the floor. The 12 seconds are counted from there, so
   * the caller is at most one second past the start of them.
   */
  async function burnDown(page: Page) {
    for (let step = 0; step < 60 && (await radius(page)) !== '15'; step++) {
      await page.clock.runFor(1000);
      await page.waitForTimeout(40); // let the page draw the new light
    }
    await expect(page.getByTestId('candle-light')).toHaveAttribute('data-radius', '15');
    await page.waitForTimeout(100); // and set the 12-second timer
  }

  test('plays Jumpscare.mp4 full-screen after exactly 12 seconds at the lowest light, then never again', async ({ page }) => {
    await startFrozen(page, {});
    expect(await radius(page)).toBe('30');
    await burnDown(page);

    // The candle has been at its lowest for between 0 and 1 seconds: 10 more is not yet 12, 13 more is.
    await page.clock.runFor(10_000);
    await expect(video(page)).toHaveCount(0);
    await page.clock.runFor(3_000);

    await expect(video(page)).toBeVisible();
    await expect(video(page)).toHaveAttribute('data-kind', 'scare');
    await expect(video(page).locator('video')).toHaveAttribute('src', '/video/jumpscare.mp4');
    const covers = await video(page).evaluate((e) => {
      const r = e.getBoundingClientRect();
      return r.width === window.innerWidth && r.height === window.innerHeight;
    });
    expect(covers, 'covers the whole screen').toBe(true);
    // it really plays (muted if the browser refused sound)
    await expect.poll(() => video(page).locator('video').evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 10_000 }).toBeGreaterThan(0);

    // it ends by itself (12 s) and the page is back
    await expect(video(page)).toHaveCount(0, { timeout: 25_000 });
    expect((await stored(page)).scared).toBe(true);

    // once only: the candle is still at its lowest, and a further 12 s there does nothing
    await page.clock.runFor(20_000);
    await expect(video(page)).toHaveCount(0);
    await expect(page.getByTestId('candle-light')).toHaveAttribute('data-radius', '15');
  });

  test('Escape ends it early', async ({ page }) => {
    await startFrozen(page, {});
    await burnDown(page);
    await page.clock.runFor(12_500);
    await expect(video(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(video(page)).toHaveCount(0);
  });

  test('a click that brightens the candle in time cancels it', async ({ page }) => {
    await startFrozen(page, {});
    await burnDown(page);
    await page.clock.runFor(9_000);
    // a click anywhere brightens the candle; dispatched on the body so it cannot land on a link
    await page.evaluate(() => document.body.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await expect(page.getByTestId('candle-light')).not.toHaveAttribute('data-radius', '15');
    await page.clock.runFor(10_000);
    await expect(video(page)).toHaveCount(0);
  });

  test('does not happen to someone who already has the holy water', async ({ page }) => {
    await startFrozen(page, { session: { foundIn: 'library' } });
    await burnDown(page);
    await page.clock.runFor(30_000);
    await expect(video(page)).toHaveCount(0);
  });

  test('does not repeat after a reload in the same tab', async ({ page }) => {
    await startFrozen(page, { session: { scared: true } });
    await burnDown(page);
    await page.clock.runFor(30_000);
    await expect(video(page)).toHaveCount(0);
  });

  test('does nothing when the candle is switched off', async ({ page }) => {
    await page.clock.install();
    await seed(page, { candle: false });
    await gotoHome(page);
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
    // with no candle there is no light to burn down: a minute passes and nothing happens
    await page.clock.runFor(30_000);
    await expect(page.getByTestId('candle-light')).toHaveCount(0);
    await expect(video(page)).toHaveCount(0);
    expect((await stored(page)).scared ?? false).toBe(false);
  });

  test('does nothing in Elegant mode', async ({ page }) => {
    await startFrozen(page, { experience: 'elegant' });
    await page.clock.runFor(30_000);
    await expect(video(page)).toHaveCount(0);
  });
});

test.describe('Accessibility', () => {
  const serious = async (page: Page) => {
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
  };

  test('the cards, the open room with the ghost and its bubble, and the bottle have no serious violations', async ({ page }) => {
    await seed(page, { session: { foundIn: 'library' } });
    await gotoHome(page);
    await expect(slot(page)).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('room-card-library').scrollIntoViewIfNeeded();
    expect(await serious(page), 'home').toEqual([]);

    await openRoom(page, 'library');
    expect(await serious(page), 'viewer').toEqual([]);
  });

  test('the viewer and the ghost have a bubble that is a polite status message', async ({ page }) => {
    await seed(page);
    await gotoHome(page);
    await expect(ghost(page)).toBeVisible({ timeout: 10_000 });
    await expect(bubble(page)).toHaveAttribute('role', 'status');
    await expect(ghost(page)).toHaveAccessibleName(/ghost/i);
  });
});
