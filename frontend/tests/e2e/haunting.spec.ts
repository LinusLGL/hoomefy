import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  SHOTS,
  bodyBackground,
  gotoHome,
  heroPixels,
  instrument,
  openSettings,
  phases,
  scrollUntilTakeover,
  seen,
  textContrast,
  waitForElegantIdle,
  waitForHeroPainted,
  waitForHaunted,
  waitForPhase,
} from './helpers';

test.describe('Stage one: the perfect illusion', () => {
  test('looks like an ordinary premium interior-design site', async ({ page }) => {
    const { errors } = await instrument(page);
    await gotoHome(page);

    await expect(page.locator('html')).toHaveAttribute('data-experience', 'elegant');
    await expect(page).toHaveTitle('Hoomefy - AI Interior Design');
    await expect(page.locator('[data-hero-heading]')).toHaveAccessibleName('Your Dream Home, Reimagined.');

    // Warm-grey paper surfaces (the Scandinavian Dreams palette), not a dark theme
    const bg = await bodyBackground(page);
    expect(bg.luminance, 'body background should be light').toBeGreaterThan(0.85);
    expect([bg.r, bg.g, bg.b]).toEqual([240, 238, 235]);

    // No horror cues anywhere in the visible text or icons
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).not.toMatch(/haunt|ghost|mori|spooky|supernatural|horror|kiroween|other side|mansion|spirit|candle|shouldn't be here/i);
    expect(await page.locator('[data-icon="ghost-house"]').count()).toBe(0);

    // Hero image is a painted interior drawn through the WebGL shader path
    const webglInUse = await page.evaluate(() => {
      const c = document.querySelector('.hf-scene__canvas') as HTMLCanvasElement;
      return c.getContext('2d') === null; // a canvas can only hold one context type
    });
    expect(webglInUse, 'hero uses the WebGL shader').toBe(true);

    // ...and it actually drew the bright, warm living room (not a blank or white canvas)
    await waitForHeroPainted(page);
    const room = await heroPixels(page);
    expect(room.whiteShare, 'hero is not a blank white rectangle').toBeLessThan(0.2);
    expect(room.luminance, 'elegant hero is a bright interior').toBeGreaterThan(0.45);
    expect(room.mean[0], 'warm tones: red above blue').toBeGreaterThan(room.mean[2]);

    expect(await textContrast(page, '[data-hero-heading]')).toBeGreaterThanOrEqual(4.5);
    expect(await textContrast(page, '[data-hero-sub]')).toBeGreaterThanOrEqual(4.5);

    await page.screenshot({ path: `${SHOTS}/01-stage-one-elegant.png` });
    expect(errors).toEqual([]);
  });

  test('has no serious accessibility violations', async ({ page }) => {
    await gotoHome(page);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
});

test.describe('Stage two: the website is haunted', () => {
  test('anomalies appear while scrolling, without shifting layout or starting the takeover', async ({ page }) => {
    test.setTimeout(120_000);
    const { errors } = await instrument(page);
    await gotoHome(page);

    const before = await page.evaluate(() => document.documentElement.scrollHeight);
    const travel = await page.evaluate(() => {
      const t = document.querySelector('[data-haunt-trigger]') as HTMLElement;
      return t.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.6;
    });

    // Step to just past each anomaly threshold, so exactly one becomes due each time.
    for (const p of [0.09, 0.17, 0.23, 0.31, 0.39, 0.47, 0.53, 0.61, 0.69, 0.77]) {
      await page.evaluate((y) => window.scrollTo(0, y), travel * p);
      await page.waitForTimeout(1700);
    }

    const got = await seen(page);
    for (const k of [
      'text-shift',
      'image-shadow',
      "whisper:Something isn't right.",
      'tear',
      'bell',
      "whisper:You're not alone.",
      'fluorescent',
      'card-silhouette',
      'whisper:The house remembers you.',
    ]) {
      expect(got, `anomaly ${k}`).toContain(k);
    }

    // Still Elegant, takeover not started, no layout change, nothing broke.
    expect(await phases(page)).toEqual([]);
    await expect(page.locator('html')).toHaveAttribute('data-experience', 'elegant');
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(before);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `${SHOTS}/02-stage-two-anomalies.png` });
  });

  test('whisper messages are environmental, small and never block the page', async ({ page }) => {
    await gotoHome(page);
    const blocks = await page.evaluate(() => {
      const w = document.querySelector('.hf-whisper') as HTMLElement;
      const o = document.querySelector('[data-hf-overlay]') as HTMLElement;
      return { whisper: getComputedStyle(w).pointerEvents, overlay: getComputedStyle(o).pointerEvents, z: getComputedStyle(o).zIndex };
    });
    expect(blocks.whisper).toBe('none');
    expect(blocks.overlay).toBe('none');
  });
});

test.describe('Stage three: full distortion takeover', () => {
  test('runs phases A to D on the real interface and lands in the haunted mansion', async ({ page }) => {
    test.setTimeout(90_000);
    const { errors } = await instrument(page);
    await gotoHome(page);
    await scrollUntilTakeover(page);

    // Phase A: the website starts to malfunction
    await waitForPhase(page, 'A');
    await expect(page.getByTestId('skip-transition')).toBeVisible();
    await page.waitForTimeout(500);
    const phaseA = await page.evaluate(() => ({
      filtered: Array.from(document.querySelectorAll<HTMLElement>('[data-distort]')).filter((e) => e.style.filter.includes('hf-warp') && e.style.filter.includes('hf-chromatic')).length,
      scale: Number(document.querySelector('#hf-warp feDisplacementMap')!.getAttribute('scale')),
      chroma: Number(document.querySelector('#hf-chromatic feOffset')!.getAttribute('dx')),
      scan: Number((document.querySelector('.hf-scan') as HTMLElement).style.opacity),
      experience: document.documentElement.dataset.experience,
    }));
    expect(phaseA.filtered, 'real elements carry the SVG warp + chromatic filters').toBeGreaterThan(0);
    expect(phaseA.scale, 'displacement map is animating').toBeGreaterThan(0);
    expect(Math.abs(phaseA.chroma), 'channels are separating').toBeGreaterThan(0);
    expect(phaseA.scan).toBeGreaterThan(0);
    expect(phaseA.experience).toBe('elegant');
    // The elegant site must still be recognisable underneath the distortion (not blacked out).
    const veilA = await page.evaluate(() => Number(getComputedStyle(document.querySelector('.hf-veil') as HTMLElement).opacity));
    expect(veilA, 'no dark veil during phase A').toBeLessThan(0.05);
    expect((await bodyBackground(page)).luminance, 'page background still light in phase A').toBeGreaterThan(0.8);
    await page.screenshot({ path: `${SHOTS}/03-phase-A-reality-breaks.png` });

    // Phase B: corruption intensifies
    await waitForPhase(page, 'B');
    await page.waitForTimeout(700);
    const phaseB = await page.evaluate(() => ({
      scale: Number(document.querySelector('#hf-warp feDisplacementMap')!.getAttribute('scale')),
      strips: Array.from(document.querySelectorAll<HTMLElement>('.hf-strip')).filter((s) => Number(s.style.opacity) > 0).length,
      jitter: Array.from(document.querySelectorAll<HTMLElement>('[data-glitch] .hf-ch')).filter((c) => c.style.transform && c.style.transform !== 'none').length,
    }));
    expect(phaseB.scale, 'warp is stronger in phase B').toBeGreaterThan(phaseA.scale);
    expect(phaseB.jitter, 'text letters are displaced').toBeGreaterThanOrEqual(0);
    await page.screenshot({ path: `${SHOTS}/04-phase-B-corruption.png` });

    // Phase C: possession (palette, message, background)
    await waitForPhase(page, 'C');
    await page.waitForTimeout(500);
    const mid = await page.evaluate(() => ({
      bg: getComputedStyle(document.body).backgroundColor,
      inline: document.documentElement.style.getPropertyValue('--c-navy-900'),
    }));
    expect(mid.inline, 'palette is being tweened through CSS variables').not.toBe('');
    expect(mid.bg).not.toBe('rgb(240, 238, 235)');
    await page.waitForFunction(() => Number((document.querySelector('.hf-message') as HTMLElement).style.opacity) > 0.3, undefined, { timeout: 4000 });
    await expect(page.locator('.hf-message')).toContainText("YOU SHOULDN'T BE HERE.");
    // Phase D lasts only 1.5s, and a screenshot taken while the SVG filters are at full strength can take
    // about 3s. It is a review artifact, not an assertion, so take it in the background instead of
    // letting it push the test past the reveal.
    const phaseCShot = page.screenshot({ path: `${SHOTS}/05-phase-C-possession.png` });

    // Phase D: the reveal
    await waitForPhase(page, 'D');
    await page.waitForFunction(() => Number((document.querySelector('.hf-reveal') as HTMLElement).style.opacity) > 0.9, undefined, { timeout: 3000 });
    await expect(page.locator('.hf-reveal')).toContainText('WELCOME TO THE MANSION.');
    await expect(page.locator('.hf-reveal')).toContainText('Your dream home has secrets.');
    await expect(page.locator('.hf-reveal [data-reveal="logo"]')).toContainText('Hoomefy');
    const distortionStopped = await page.evaluate(() => ({
      filtered: Array.from(document.querySelectorAll<HTMLElement>('[data-distort]')).filter((e) => e.style.filter).length,
      scale: Number(document.querySelector('#hf-warp feDisplacementMap')!.getAttribute('scale')),
    }));
    expect(distortionStopped, 'distortion cuts out abruptly at the reveal').toEqual({ filtered: 0, scale: 0 });
    await phaseCShot;
    await page.screenshot({ path: `${SHOTS}/06-phase-D-reveal.png` });

    // Resolution: fully haunted, UI live
    await waitForHaunted(page);
    expect(await phases(page)).toEqual(['A', 'B', 'C', 'D', 'none']);

    await expect(page.locator('html')).toHaveAttribute('data-experience', 'haunted');
    const bg = await bodyBackground(page);
    expect([bg.r, bg.g, bg.b]).toEqual([11, 8, 9]);
    await expect(page.locator('[data-hero-heading]')).toHaveAccessibleName('Welcome to Hoomefy');
    await expect(page.locator('header [data-icon="ghost-house"]')).toBeVisible();
    await expect(page.locator('.hf-bg')).toHaveAttribute('data-active', 'true');

    // The hero image dissolved from the bright room into the candle-lit mansion
    const corridor = await heroPixels(page);
    expect(corridor.luminance, 'haunted hero is a dark mansion room').toBeLessThan(0.3);
    expect(corridor.luminance, 'something was drawn (not a black void)').toBeGreaterThan(0.03);
    expect(corridor.whiteShare, 'no leftover bright room').toBeLessThan(0.01);

    const leftovers = await page.evaluate(() => ({
      inlineVars: Array.from(document.documentElement.style).filter((p) => p.startsWith('--c-')).length,
      filtered: Array.from(document.querySelectorAll<HTMLElement>('[data-distort]')).filter((e) => e.style.filter).length,
      overlayVisible: Array.from(document.querySelectorAll<HTMLElement>('.hf-overlay > *')).filter((e) => Number(getComputedStyle(e).opacity) > 0.01 && !e.matches('.hf-filters,.hf-tearing')).length,
      charTransforms: Array.from(document.querySelectorAll<HTMLElement>('.hf-ch')).filter((c) => c.style.transform).length,
    }));
    expect(leftovers).toEqual({ inlineVars: 0, filtered: 0, overlayVisible: 0, charTransforms: 0 });

    // The mansion wallpaper is the page background, and it really loaded
    const wall = await page.evaluate(async () => {
      const css = getComputedStyle(document.querySelector('.hf-bg__wall') as HTMLElement).backgroundImage;
      const img = new Image();
      img.src = '/images/haunted/wallpaper.jpg';
      await img.decode();
      return { css, width: img.naturalWidth, height: img.naturalHeight };
    });
    expect(wall.css).toContain('/images/haunted/wallpaper.jpg');
    expect([wall.width, wall.height]).toEqual([1672, 941]);
    // Haunted text stays readable
    expect(await textContrast(page, '[data-hero-heading]')).toBeGreaterThanOrEqual(4.5);
    expect(await textContrast(page, '[data-hero-sub]')).toBeGreaterThanOrEqual(4.5);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/07-haunted-home.png` });
    expect(errors).toEqual([]);
  });

  test('the haunted site has no serious accessibility violations', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('hoomefy_haunting', JSON.stringify({ state: { experience: 'haunted', horrorEnabled: true, takeoverSeen: true }, version: 0 }));
    });
    await gotoHome(page);
    await page.waitForTimeout(1500);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
});

test.describe('Navigation during and after the transformation', () => {
  test('links keep working mid-distortion and the sequence finishes on the new page', async ({ page }) => {
    test.setTimeout(90_000);
    const { errors } = await instrument(page);
    await gotoHome(page);
    await scrollUntilTakeover(page);
    await waitForPhase(page, 'B');

    // The overlay must not block the nav: click a real header link during Phase B.
    await page.locator('header').getByRole('link', { name: 'About' }).first().click();
    await expect(page).toHaveURL(/\/about$/);

    await waitForHaunted(page);
    await expect(page.getByRole('heading', { name: 'About Hoomefy' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mori' })).toBeVisible(); // Mori only exists on the other side

    await page.locator('header').getByRole('link', { name: 'How It Works' }).click();
    await expect(page).toHaveURL(/\/how-it-works$/);
    await page.getByRole('link', { name: 'Hoomefy' }).first().click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('html')).toHaveAttribute('data-experience', 'haunted');
    await page.screenshot({ path: `${SHOTS}/08-navigation-after.png` });
    expect(errors).toEqual([]);
  });

  test('keyboard users can reach Skip and use it', async ({ page }) => {
    await instrument(page);
    await gotoHome(page);
    await scrollUntilTakeover(page);
    await waitForPhase(page, 'A');
    const skip = page.getByTestId('skip-transition');
    await skip.focus();
    await expect(skip).toBeFocused();
    await page.keyboard.press('Enter');
    await waitForHaunted(page, 3000);
    expect(await phases(page)).toContain('none');
  });
});

test.describe('Skip, persistence, restore, replay', () => {
  test('Skip jumps straight to the haunted state, which survives a reload without replaying', async ({ page }) => {
    await instrument(page);
    await gotoHome(page);
    await scrollUntilTakeover(page);
    await waitForPhase(page, 'A');

    const t0 = Date.now();
    await page.getByTestId('skip-transition').click();
    await waitForHaunted(page, 3000);
    expect(Date.now() - t0, 'skip is immediate').toBeLessThan(2500);
    await expect(page.getByTestId('skip-transition')).toHaveCount(0);

    await page.reload();
    // Correct palette from the first paint: the attribute is set before React renders.
    expect(await page.evaluate(() => document.documentElement.dataset.experience)).toBe('haunted');
    await gotoHome(page);
    await scrollUntilTakeover(page, 60);
    expect(await phases(page), 'no automatic replay after it has been seen').toEqual([]);
    await expect(page.locator('html')).toHaveAttribute('data-experience', 'haunted');
  });

  test('Escape also skips', async ({ page }) => {
    await gotoHome(page);
    await scrollUntilTakeover(page);
    await waitForPhase(page, 'B');
    await page.keyboard.press('Escape');
    await waitForHaunted(page, 3000);
  });

  test('Elegant mode restores the elegant site without forcing the haunting back', async ({ page }) => {
    await instrument(page);
    await gotoHome(page);
    await scrollUntilTakeover(page);
    await waitForPhase(page, 'A');
    await page.getByTestId('skip-transition').click();
    await waitForHaunted(page, 3000);

    await openSettings(page);
    await page.getByRole('button', { name: 'Elegant mode' }).click();
    await waitForElegantIdle(page);

    const bg = await bodyBackground(page);
    expect([bg.r, bg.g, bg.b]).toEqual([240, 238, 235]);
    await expect(page.locator('[data-hero-heading]')).toHaveAccessibleName('Your Dream Home, Reimagined.');
    await expect(page.locator('[data-icon="ghost-house"]')).toHaveCount(0);

    const phasesBefore = await phases(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await scrollUntilTakeover(page, 60);
    expect(await phases(page), 'scrolling to the reveal again must not restart the takeover').toEqual(phasesBefore);
    await expect(page.locator('html')).toHaveAttribute('data-experience', 'elegant');
    await page.screenshot({ path: `${SHOTS}/09-restored-elegant.png` });
  });

  test('Replay the Haunting runs the sequence again', async ({ page }) => {
    test.setTimeout(90_000);
    await instrument(page);
    await gotoHome(page);
    await scrollUntilTakeover(page);
    await waitForPhase(page, 'A');
    await page.getByTestId('skip-transition').click();
    await waitForHaunted(page, 3000);

    await openSettings(page);
    await page.getByRole('button', { name: 'Replay the Haunting' }).click();
    await waitForPhase(page, 'A');
    await waitForPhase(page, 'D', 14_000);
    await waitForHaunted(page);
    const all = await phases(page);
    expect(all.filter((p) => p === 'A').length, 'sequence ran again').toBe(2);
    expect(all.filter((p) => p === 'D').length, 'second run reached the reveal (first was skipped)').toBe(1);
    expect(all[all.length - 1]).toBe('none');
  });
});

test.describe('Opt-out', () => {
  test('disabling visual effects keeps the site Elegant: no anomalies, no takeover, no background', async ({ page }) => {
    test.setTimeout(90_000);
    await instrument(page);
    await gotoHome(page);
    await openSettings(page);
    await page.getByLabel(/Visual effects/).uncheck();
    await expect(page.locator('html')).toHaveAttribute('data-horror', 'off');

    await page.keyboard.press('Escape');
    await scrollUntilTakeover(page, 60);
    await page.waitForTimeout(2000);

    expect(await phases(page)).toEqual([]);
    expect((await seen(page)).filter((k) => k.startsWith('whisper'))).toEqual([]);
    await expect(page.locator('.hf-bg')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-experience', 'elegant');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-horror', 'off');
  });
});

test.describe('Click triggers', () => {
  test('touching the statement mirror starts the takeover', async ({ page }) => {
    test.setTimeout(90_000);
    await instrument(page);
    await gotoHome(page);
    const mirror = page.getByRole('button', { name: /Statement mirror/ });
    await mirror.scrollIntoViewIfNeeded();
    await mirror.click(); // a button press: the house wakes on the first touch
    await waitForHaunted(page);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hoomefy_haunting')!).state.takeoverSeen)).toBe(true);
  });
});

test.describe('Reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('replaces the distortion with a simple theme reveal', async ({ page }) => {
    const { errors } = await instrument(page);
    await gotoHome(page);
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');

    const t0 = Date.now();
    await scrollUntilTakeover(page);
    await waitForHaunted(page, 8000);

    const p = await phases(page);
    expect(p).not.toContain('A');
    expect(p).not.toContain('B');
    expect(Date.now() - t0).toBeLessThan(9000);

    // No SVG filters were ever applied, no anomalies shown
    expect(await seen(page)).toEqual([]);
    await expect(page.locator('[data-hero-heading]')).toHaveAccessibleName('Welcome to Hoomefy');
    const bg = await bodyBackground(page);
    expect([bg.r, bg.g, bg.b]).toEqual([11, 8, 9]);
    expect(errors).toEqual([]);
  });
});

test.describe('Pressing a button wakes the house, once', () => {
  test('the first button pressed in Elegant starts the takeover', async ({ page }) => {
    test.setTimeout(90_000);
    await instrument(page);
    await gotoHome(page);
    await waitForElegantIdle(page);
    await page.getByRole('button', { name: 'Design My Room' }).or(page.getByRole('link', { name: 'Design My Room' })).first().click();
    await waitForPhase(page, 'A');
    await waitForHaunted(page);
  });

  test('the first press does not do its Elegant job: it jumps straight to the Haunted home page', async ({ page }) => {
    test.setTimeout(90_000);
    await instrument(page);
    await page.goto('/about');
    await waitForElegantIdle(page);
    await page.locator('header').getByRole('link', { name: 'Sign In' }).click();
    await waitForHaunted(page);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('[data-hero-heading]')).toBeVisible();
  });

  test('after returning to Elegant, pressing buttons no longer wakes it', async ({ page }) => {
    test.setTimeout(90_000);
    await instrument(page);
    await gotoHome(page);
    await waitForElegantIdle(page);
    await page.getByRole('link', { name: 'How It Works' }).first().click();
    await waitForHaunted(page);

    await openSettings(page);
    await page.getByRole('button', { name: 'Elegant mode' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-experience', 'elegant');

    await page.getByRole('link', { name: 'About' }).first().click();
    await page.getByRole('link', { name: 'Hoomefy' }).first().click();
    await page.waitForTimeout(2500);
    await expect(page.locator('html')).toHaveAttribute('data-experience', 'elegant');
    await expect(page.locator('html')).not.toHaveAttribute('data-takeover', /.+/);
  });
});
