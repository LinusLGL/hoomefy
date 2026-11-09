import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { gotoHome, instrument, openSignInForm, seedElegantSeen, signIn } from './helpers';

async function seedHaunted(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'hoomefy_haunting',
      JSON.stringify({
        state: { experience: 'haunted', horrorEnabled: true, takeoverSeen: true, candleCursor: false, audioEnabled: false },
        version: 0,
      })
    );
  });
}

const QUESTION = 'Are You a Revisiting Companion or New Soul?';
const videoIn = (page: Page) => page.locator('[data-testid="haunted-backdrop"] video');
const isPlaying = (page: Page) =>
  videoIn(page).evaluate((v: HTMLVideoElement) => v.readyState >= 2 && !v.paused && v.currentTime > 0.3);

test.describe('Haunted sign-in gate: Revisiting Companion or New Soul?', () => {
  test('is at /signin, asks the question, and loops the video behind it', async ({ page }) => {
    const { errors } = await instrument(page);
    await seedHaunted(page);
    await page.goto('/signin');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(QUESTION);
    await expect(page.getByText('The mansion remembers its familiar guests...')).toBeVisible();
    await expect(page.getByText('or will you be stepping inside for the first time?')).toBeVisible();
    await expect(page.getByRole('button', { name: /Revisiting Companion/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /New Soul/ })).toBeVisible();
    await expect(page.getByText('Welcome back...')).toBeVisible();
    await expect(page.getByText('Begin your design journey')).toBeVisible();

    await expect(videoIn(page)).toHaveAttribute('src', '/video/signup-background.mp4');
    expect(await videoIn(page).evaluate((v: HTMLVideoElement) => ({ loop: v.loop, muted: v.muted }))).toEqual({ loop: true, muted: true });
    await expect.poll(() => isPlaying(page), { timeout: 20_000 }).toBe(true);
    expect(errors).toEqual([]);
  });

  test('/signup is not the gate: it goes straight to the sign-up form', async ({ page }) => {
    await seedHaunted(page);
    await page.goto('/signup');

    await expect(page.getByRole('heading', { name: 'Create Your Account' })).toBeVisible();
    await expect(page.getByText(QUESTION)).toHaveCount(0);
  });

  test('both cards fit in the window and are clickable at their centre', async ({ page }) => {
    await seedHaunted(page);
    await page.goto('/signin');

    for (const target of [page.getByRole('button', { name: /Revisiting Companion/ }), page.getByRole('link', { name: /New Soul/ })]) {
      const box = (await target.boundingBox()) as { x: number; width: number };
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(1280);
      const hit = await target.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return !!top && el.contains(top);
      });
      expect(hit).toBe(true);
    }
  });

  test('Revisiting Companion opens the sign-in form, the video keeps playing, and the way back returns', async ({ page }) => {
    await seedHaunted(page);
    await page.goto('/signin');
    await page.getByRole('button', { name: /Revisiting Companion/ }).click();

    await expect(page).toHaveURL(/\/signin$/);
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
    await expect(videoIn(page)).toHaveCount(1);
    await expect.poll(() => isPlaying(page), { timeout: 20_000 }).toBe(true);

    await page.getByRole('button', { name: 'Not a returning companion? Go back' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(QUESTION);
  });

  test('New Soul goes to /signup, which shows the sign-up form over the same video', async ({ page }) => {
    await seedHaunted(page);
    await page.goto('/signin');
    await page.getByRole('link', { name: /New Soul/ }).click();

    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole('heading', { name: 'Create Your Account' })).toBeVisible();
    await expect(videoIn(page)).toHaveCount(1);
    await expect.poll(() => isPlaying(page), { timeout: 20_000 }).toBe(true);
  });

  test('the sign-up form links back to sign in without asking the question again', async ({ page }) => {
    await seedHaunted(page);
    await page.goto('/signup');
    await page.getByRole('link', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/signin$/);
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  });

  test('Design My Room asks the question, then signing in lands in the studio', async ({ page }) => {
    await seedHaunted(page);
    await gotoHome(page);
    await page.getByRole('link', { name: 'Design My Room' }).click();

    await expect(page).toHaveURL(/\/signin$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(QUESTION);

    await page.getByRole('button', { name: /Revisiting Companion/ }).click();
    await page.getByLabel('Email Address').fill('tester@example.com');
    await page.getByLabel('Password').fill('TestPass123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/studio$/);
  });

  test('Design My Room also lets a new soul register instead', async ({ page }) => {
    await seedHaunted(page);
    await gotoHome(page);
    await page.getByRole('link', { name: 'Design My Room' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(QUESTION);

    await page.getByRole('link', { name: /New Soul/ }).click();
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole('heading', { name: 'Create Your Account' })).toBeVisible();
  });

  test('Get Started in the header asks the question too', async ({ page }) => {
    await seedHaunted(page);
    await gotoHome(page);
    await page.getByRole('link', { name: 'Get Started' }).click();

    await expect(page).toHaveURL(/\/signin$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(QUESTION);
    await expect(page.getByRole('button', { name: /Revisiting Companion/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /New Soul/ })).toBeVisible();
  });

  test('typing a protected address asks the question as well', async ({ page }) => {
    await seedHaunted(page);
    await page.goto('/studio');

    await expect(page).toHaveURL(/\/signin$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(QUESTION);
  });

  test('a visitor who has just reset a password is not asked again', async ({ page }) => {
    await seedHaunted(page);
    await page.goto('/forgot-password');
    await page.getByRole('link', { name: 'Back to Sign In' }).click();

    await expect(page).toHaveURL(/\/signin$/);
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  });

  test('a returning companion can sign in', async ({ page }) => {
    await seedHaunted(page);
    await signIn(page);
    await expect(page).toHaveURL(/\/studio$/);
  });

  test('a new soul can finish signing up', async ({ page }) => {
    await seedHaunted(page);
    await page.goto('/signup');
    await page.getByLabel('Full Name').fill('Jane Doe');
    await page.getByLabel('Email Address').fill('jane@example.com');
    await page.getByLabel('Password', { exact: true }).fill('ValidPass1');
    await page.getByLabel('Confirm Password').fill('ValidPass1');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByRole('heading', { name: 'Check Your Email' })).toBeVisible({ timeout: 15_000 });
    await expect(videoIn(page)).toHaveCount(1);
  });

  test('keyboard: Tab moves between the cards, and Enter on Revisiting Companion continues', async ({ page }) => {
    await seedHaunted(page);
    await page.goto('/signin');
    const companion = page.getByRole('button', { name: /Revisiting Companion/ });
    await companion.focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: /New Soul/ })).toBeFocused();
    await companion.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  });
});

test.describe('Haunted sign-in and sign-up share one design', () => {
  test('same video, same Hoomefy mark and rule, same gilded frame; gold for companions, crimson for new souls', async ({ page }) => {
    await seedHaunted(page);

    await openSignInForm(page);
    const signin = await page.evaluate(() => {
      const card = document.querySelector('.hf-auth__card') as HTMLElement;
      const h3 = card.querySelector('h3') as HTMLElement;
      const beforeClip = getComputedStyle(card, '::before').clipPath;
      return {
        tone: card.dataset.tone,
        font: getComputedStyle(h3).fontFamily,
        clipped: beforeClip !== 'none',
        brand: !!document.querySelector('.hf-gate__brand'),
        rule: !!document.querySelector('.hf-gate__rule'),
        video: document.querySelectorAll('[data-testid="haunted-backdrop"] video').length,
      };
    });

    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: 'Create Your Account' })).toBeVisible();
    const signup = await page.evaluate(() => {
      const card = document.querySelector('.hf-auth__card') as HTMLElement;
      const h3 = card.querySelector('h3') as HTMLElement;
      const beforeClip = getComputedStyle(card, '::before').clipPath;
      return {
        tone: card.dataset.tone,
        font: getComputedStyle(h3).fontFamily,
        clipped: beforeClip !== 'none',
        brand: !!document.querySelector('.hf-gate__brand'),
        rule: !!document.querySelector('.hf-gate__rule'),
        video: document.querySelectorAll('[data-testid="haunted-backdrop"] video').length,
      };
    });

    expect(signin.tone).toBe('companion');
    expect(signup.tone).toBe('soul');
    expect(signin.font).toBe(signup.font);
    expect(signin.font).toContain('Cormorant');
    expect([signin.clipped, signup.clipped]).toEqual([true, true]);
    expect([signin.brand, signup.brand]).toEqual([true, true]);
    expect([signin.rule, signup.rule]).toEqual([true, true]);
    expect([signin.video, signup.video]).toEqual([1, 1]);
  });

  test('the password reset page shares the design and the video', async ({ page }) => {
    await seedHaunted(page);
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: 'Reset Your Password' })).toBeVisible();
    await expect(videoIn(page)).toHaveCount(1);
    await expect(page.locator('.hf-gate__brand')).toBeVisible();
  });

  test('the card is on top of the video: inputs take focus and typing', async ({ page }) => {
    await seedHaunted(page);
    await openSignInForm(page);
    await page.getByLabel('Email Address').fill('tester@example.com');
    await expect(page.getByLabel('Email Address')).toHaveValue('tester@example.com');
    const topIsCard = await page.evaluate(() => {
      const card = document.querySelector('.hf-auth__card') as HTMLElement;
      const r = card.getBoundingClientRect();
      const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return !!el && card.contains(el);
    });
    expect(topIsCard).toBe(true);
  });

  test('Elegant sign-in and sign-up are unchanged: straight to the form, no gate, no video', async ({ page }) => {
    for (const [path, heading] of [
      ['/signin', 'Welcome Back'],
      ['/signup', 'Create Your Account'],
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
      await expect(page.getByText(/New Soul|Revisiting Companion/)).toHaveCount(0);
      await expect(page.locator('video')).toHaveCount(0);
      await expect(page.locator('.hf-gate__brand')).toHaveCount(0);
    }
  });

  test('Elegant: Get Started still goes straight to sign-up, and Design My Room to the plain sign-in form', async ({ page }) => {
    await seedElegantSeen(page);
    await gotoHome(page);
    await page.getByRole('link', { name: 'Get Started' }).click();
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole('heading', { name: 'Create Your Account' })).toBeVisible();

    await gotoHome(page);
    await page.getByRole('link', { name: 'Design My Room' }).click();
    await expect(page).toHaveURL(/\/signin$/);
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.getByText(/New Soul|Revisiting Companion/)).toHaveCount(0);
  });

  test('reduced motion shows the still poster behind the gate and the forms', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedHaunted(page);
    for (const path of ['/signin', '/signup']) {
      await page.goto(path);
      await expect(page.locator('[data-testid="haunted-backdrop"] img')).toHaveAttribute('src', '/video/signup-poster.jpg');
      await expect(page.locator('video')).toHaveCount(0);
    }
  });

  test('has no serious accessibility violations on the gate or on either form', async ({ page }) => {
    await seedHaunted(page);
    const check = async (label: string) => {
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${label} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    };
    await page.goto('/signin');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await check('gate');
    await page.getByRole('button', { name: /Revisiting Companion/ }).click();
    await expect(page.getByLabel('Email Address')).toBeVisible();
    await check('sign-in');
    await page.goto('/signup');
    await expect(page.getByLabel('Full Name')).toBeVisible();
    await check('sign-up');
  });
});
