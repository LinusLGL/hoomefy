import { test, expect, type Page } from '@playwright/test';
import { SHOTS, instrument, makeRoomPng, mockItemFinder, seedElegantSeen, signIn } from './helpers';

/**
 * The working design studio in the Elegant experience, using the built-in demo renderer so no real AI
 * (and no one's free GPU time) is used. The real model is covered by the opt-in live smoke test.
 */

async function uploadRoom(page: Page, name = 'room.png') {
  const png = await makeRoomPng(page);
  await page.locator('input[type="file"]').setInputFiles({ name, mimeType: 'image/png', buffer: png });
  await expect(page.locator(`.hf-evidence img[alt="${name}"]`)).toBeVisible({ timeout: 15_000 });
}

async function configure(page: Page, style: RegExp = /^Scandinavian/) {
  await page.getByRole('button', { name: style }).click();
}

async function generate(page: Page) {
  await page.getByRole('button', { name: 'Generate Design' }).click();
  await expect(page.getByTestId('result-panel')).toBeVisible({ timeout: 30_000 });
}

test.beforeEach(async ({ page }) => {
  await seedElegantSeen(page);
});

test.describe('Design studio: from photo to saved design', () => {
  test('upload, pick a theme, generate, compare, zoom, regenerate, download and save', async ({ page }) => {
    test.setTimeout(120_000);
    const { errors } = await instrument(page);
    const finder = await mockItemFinder(page);
    await signIn(page);
    await expect(page.getByRole('heading', { name: 'Design Studio' })).toBeVisible();

    // The three panels are there.
    await expect(page.getByRole('complementary', { name: 'Design controls' })).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Design assistant' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate Design' })).toBeDisabled();

    await uploadRoom(page);
    await configure(page);
    await expect(page.getByRole('button', { name: 'Generate Design' })).toBeEnabled();
    await page.screenshot({ path: `${SHOTS}/20-studio-ready.png` });

    await generate(page);
    await expect(page.getByRole('slider', { name: /Compare Before and After/ })).toBeVisible();
    await expect(page.getByTestId('demo-note')).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/21-studio-result.png` });

    // The pieces in the design are found by themselves, priced, and put on the shopping list.
    await page.getByRole('tab', { name: 'Summary' }).click();
    await expect(page.getByTestId('summary-item')).toHaveCount(3);
    await expect(page.getByTestId('summary-total')).toHaveText(/^\$[\d,]+$/);
    await expect(page.getByTestId('summary-items')).toContainText('3 of 3 prices come from shops');
    await expect(page.getByRole('tab', { name: /Shopping list/ })).toContainText('3');
    expect(finder.detectCalls).toBe(1);
    expect(finder.searchQueries.sort()).toEqual(['grey linen sofa', 'jute area rug', 'round walnut coffee table']);

    // The prompt that was sent names the theme and keeps the layout.
    await page.getByText('View the prompt that was sent').click();
    const prompt = await page.getByTestId('prompt-text').innerText();
    expect(prompt).toMatch(/^Edit this photograph of a room\./);
    expect(prompt).toMatch(/Scandinavian style/);
    expect(prompt).toMatch(/Keep the exact room layout/);

    // View modes and zoom.
    await page.getByRole('button', { name: 'After', exact: true }).click();
    await expect(page.getByRole('img', { name: 'Your redesigned room' })).toBeVisible();
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await expect(page.getByTestId('zoom-level')).toHaveText('200%');
    await page.getByRole('button', { name: 'Reset zoom' }).click();
    await expect(page.getByTestId('zoom-level')).toHaveText('100%');
    await page.getByRole('button', { name: 'Before', exact: true }).click();
    await expect(page.getByRole('img', { name: 'Your original room photo' })).toBeVisible();
    await page.getByRole('button', { name: 'Compare', exact: true }).click();

    // Download is a real image file.
    const download = page.getByTestId('download-design');
    await expect(download).toHaveAttribute('href', /^blob:/);
    await expect(download).toHaveAttribute('download', /^hoomefy-scandinavian-\d+\.jpg$/);

    // Regenerating adds a version and keeps the first.
    await page.getByTestId('regenerate').click();
    await expect(page.getByTestId('generation-progress')).toBeVisible();
    await expect(page.getByTestId('result-panel')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('history').getByRole('button')).toHaveCount(2);
    // A new design is looked through again, and the list is replaced, not doubled.
    await expect.poll(() => finder.detectCalls).toBe(2);
    await expect(page.getByTestId('summary-item')).toHaveCount(3);
    await page.getByRole('tab', { name: /Shopping list/ }).click();
    await expect(page.getByTestId('shopping-list').getByRole('listitem')).toHaveCount(3);
    await page.getByRole('tab', { name: 'Summary' }).click();
    await page.getByRole('button', { name: /^Version 1/ }).click();
    await expect(page.getByRole('button', { name: /^Version 1/ })).toHaveAttribute('aria-pressed', 'true');

    // Saving needs a name and an explicit yes.
    await page.getByTestId('save-design').click();
    const dialog = page.getByTestId('save-dialog');
    await expect(dialog).toBeVisible();
    const submit = dialog.getByRole('button', { name: 'Save design' });
    await expect(submit).toBeDisabled();
    await dialog.getByTestId('save-consent').check();
    await expect(submit).toBeEnabled();
    await dialog.getByLabel('Name').fill('Sunny living room');
    await submit.click();
    await expect(dialog).toHaveCount(0);

    // It shows up under My Designs and can be opened again.
    await page.locator('header').getByRole('link', { name: 'My Designs' }).click();
    await expect(page.getByRole('heading', { name: 'My Designs' })).toBeVisible();
    await expect(page.getByTestId('saved-design')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Sunny living room' })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/22-gallery.png` });

    await page.getByRole('button', { name: 'Open', exact: true }).click();
    await expect(page).toHaveURL(/\/studio$/);
    await expect(page.getByTestId('result-panel')).toBeVisible({ timeout: 15_000 });
    // An opened design keeps the list it was saved with and is not looked through again until asked.
    await page.getByRole('tab', { name: /Shopping list/ }).click();
    await expect(page.getByTestId('shopping-list').getByRole('listitem')).toHaveCount(3);
    await page.getByRole('tab', { name: 'Furniture' }).click();
    await expect(page.getByTestId('scan-items')).toBeVisible();
    expect(finder.detectCalls).toBe(2);

    // Deleting asks first.
    await page.locator('header').getByRole('link', { name: 'My Designs' }).click();
    await page.getByRole('button', { name: 'Delete Sunny living room' }).click();
    await page.getByRole('button', { name: 'Delete for good' }).click();
    await expect(page.getByText('No designs yet.')).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('each theme changes what the model is asked to do', async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page);
    await uploadRoom(page);

    const prompts: Record<string, string> = {};
    for (const [name, key] of [
      ['Japandi', 'japandi'],
      ['Halloween', 'halloween'],
    ] as const) {
      await page.getByRole('button', { name: new RegExp(`^${name}`) }).click();
      await generate(page);
      await page.getByRole('tab', { name: 'Summary' }).click();
      const details = page.getByText('View the prompt that was sent');
      if (!(await page.getByTestId('prompt-text').isVisible())) await details.click();
      prompts[key] = await page.getByTestId('prompt-text').innerText();
    }
    expect(prompts.japandi).toMatch(/Japandi style/);
    expect(prompts.halloween).toMatch(/pumpkins/i);
    expect(prompts.japandi).not.toBe(prompts.halloween);
  });

  test('the custom style needs the visitor\'s own words and puts them in the prompt', async ({ page }) => {
    test.setTimeout(90_000);
    await signIn(page);
    await uploadRoom(page);
    await page.getByRole('button', { name: /^Custom/ }).click();

    // No words yet: not ready.
    await expect(page.getByRole('button', { name: 'Generate Design' })).toBeDisabled();
    const text = 'a modern Japanese-inspired interior with warm oak furniture and a low platform bed';
    await page.getByLabel('Describe your style').fill(text);
    await expect(page.getByRole('button', { name: 'Generate Design' })).toBeEnabled();

    await generate(page);
    await page.getByRole('tab', { name: 'Summary' }).click();
    await page.getByText('View the prompt that was sent').click();
    const prompt = await page.getByTestId('prompt-text').innerText();
    expect(prompt).toContain(text);
    expect(prompt).toMatch(/^Edit this photograph of a room\./);
  });

  test('the wishes box sits in the left panel, next to the style, and its words reach the prompt', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);
    await uploadRoom(page);

    // The box is in the controls on the left, with the style, and not in the assistant on the right.
    const controls = page.getByRole('complementary', { name: 'Design controls' });
    await expect(controls.getByLabel(/Extra instructions/)).toBeVisible();
    await expect(controls.getByRole('button', { name: /^Scandinavian/ })).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Design assistant' }).getByLabel(/Extra instructions/)).toHaveCount(0);
    const [box, assistant] = await Promise.all([controls.getByLabel(/Extra instructions/).boundingBox(), page.getByRole('complementary', { name: 'Design assistant' }).boundingBox()]);
    expect(box!.x + box!.width).toBeLessThan(assistant!.x);

    // The style is still chosen alongside it.
    await configure(page, /^Minimalist/);
    await page.getByLabel(/Extra instructions/).fill('paint the walls deep red and add a green velvet sofa.');
    await page.getByLabel('Transformation intensity').fill('1');
    await generate(page);
    // The demo renderer says plainly that only the real AI can follow wishes.
    await expect(page.getByText(/Only the real AI can follow your wishes/)).toBeVisible();
    await page.getByRole('tab', { name: 'Summary' }).click();
    await expect(page.getByTestId('design-summary')).toContainText('paint the walls deep red and add a green velvet sofa.');
    await page.getByText('View the prompt that was sent').click();
    const prompt = await page.getByTestId('prompt-text').innerText();
    // The visitor's words come first, as the priority, ahead of the style.
    expect(prompt).toContain('"paint the walls deep red and add a green velvet sofa"');
    expect(prompt).toMatch(/request comes first and must be clearly visible/);
    expect(prompt.indexOf('deep red')).toBeLessThan(prompt.indexOf('restyle the interior in this look'));
    expect(prompt).toMatch(/dramatic redesign/);
  });

  test('there is no room type, no colour palette and no furniture to replace', async ({ page }) => {
    await signIn(page);
    await uploadRoom(page);
    const controls = page.getByRole('complementary', { name: 'Design controls' });
    await expect(controls.getByRole('button', { name: /^Scandinavian/ })).toBeVisible();
    for (const gone of [/Living Room/, /Bedroom/, /^Warm/, /^Cool/]) await expect(page.getByRole('button', { name: gone })).toHaveCount(0);
    await expect(controls.getByText(/Room Type|Colour palette|Furniture to replace/i)).toHaveCount(0);
    await expect(page.getByTestId('furniture-picker')).toHaveCount(0);

    // A photo and a style are all it takes.
    await expect(page.getByRole('button', { name: 'Generate Design' })).toBeDisabled();
    await configure(page);
    await expect(page.getByRole('button', { name: 'Generate Design' })).toBeEnabled();
  });
  test('a photo with the wrong contents is refused with a clear message', async ({ page }) => {
    await signIn(page);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'room.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('this is not really a photo'),
    });
    await expect(page.getByText('This photo cannot be used')).toBeVisible();
    await expect(page.locator('.hf-evidence img')).toHaveCount(0);
  });

  test('a photo that is too small is refused', async ({ page }) => {
    await signIn(page);
    const tiny = await page.evaluate(async () => {
      const c = document.createElement('canvas');
      c.width = 300;
      c.height = 300;
      c.getContext('2d')!.fillRect(0, 0, 300, 300);
      const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/png'));
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    });
    await page.locator('input[type="file"]').setInputFiles({ name: 'tiny.png', mimeType: 'image/png', buffer: Buffer.from(tiny) });
    await expect(page.getByText(/too small/i).first()).toBeVisible();
  });

  test('replacing and removing the photo', async ({ page }) => {
    await signIn(page);
    await uploadRoom(page, 'first.png');
    await expect(page.getByTestId('photo-row')).toContainText('first.png');
    await page.getByTestId('photo-row').getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByTestId('photo-row')).toHaveCount(0);
    await expect(page.locator('input[type="file"]')).toHaveCount(1);
    await uploadRoom(page, 'second.png');
    await expect(page.getByTestId('photo-row')).toContainText('second.png');
  });
});

test.describe('Furniture and shopping', () => {
  test('the pieces in the design are found, priced online and listed', async ({ page }) => {
    test.setTimeout(120_000);
    const finder = await mockItemFinder(page);
    await signIn(page);
    await uploadRoom(page);
    await configure(page);
    await page.getByLabel(/Furniture budget/).fill('2000');
    await generate(page);

    // Nothing to press: the finder runs by itself and the shops are searched for each piece it names.
    await page.getByRole('tab', { name: 'Furniture' }).click();
    await expect(page.getByTestId('furniture-panel')).toBeVisible();
    const rows = page.getByTestId('furniture-item');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText('Grey linen sofa');
    await expect(rows.nth(1)).toContainText('Round walnut coffee table');
    await expect(rows.nth(2)).toContainText('Jute area rug');
    // The product priced nearest the middle of the three shop prices ($300, $450, $900) is the one counted.
    for (let i = 0; i < 3; i++) await expect(rows.nth(i)).toContainText('$450');
    await expect(page.getByTestId('item-scan')).toContainText('Found 3 pieces in your design.');
    expect(finder.searchQueries).toHaveLength(3);

    await rows.first().click();
    const detail = page.getByTestId('piece-detail');
    await expect(detail).toBeVisible();
    await expect(detail).toContainText('grey linen sofa');
    await expect(detail).toContainText('3 shop prices found, from $300 to $900');
    await expect(detail.getByTestId('product')).toHaveCount(3);
    for (const shop of ['IKEA', 'Wayfair', 'Target', 'Amazon']) {
      const link = detail.getByRole('link', { name: new RegExp(`^${shop}`) });
      await expect(link).toHaveAttribute('href', new RegExp(`^https://.*${shop.toLowerCase()}`));
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
    }
    for (const link of await detail.getByTestId('product').getByRole('link', { name: /View/ }).all()) {
      await expect(link).toHaveAttribute('rel', /noopener/);
      await expect(link).toHaveAttribute('href', /^https:\/\/shop\.example\//);
    }

    // The shopping list already holds one line per piece, so there is nothing to do but read it.
    await page.getByRole('tab', { name: /Shopping list/ }).click();
    const list = page.getByTestId('shopping-list');
    await expect(list.getByRole('listitem')).toHaveCount(3);
    await expect(list).toContainText('grey linen sofa 450');
    await expect(page.getByTestId('shopping-total')).toHaveText('$1,350');
    await expect(list).toContainText('$650 left of your $2,000 budget');
    await expect(list).not.toContainText('est.');
    await page.screenshot({ path: `${SHOTS}/23-shopping-list.png` });

    // The Summary agrees.
    await page.getByRole('tab', { name: 'Summary' }).click();
    await expect(page.getByTestId('summary-total')).toHaveText('$1,350');
    await page.screenshot({ path: `${SHOTS}/23b-summary-items.png` });

    // A piece can still be added by hand, and the list survives a reload.
    await page.getByRole('tab', { name: 'Furniture' }).click();
    await page.getByTestId('furniture-item').nth(1).click();
    await page.getByTestId('piece-detail').getByTestId('product').first().getByRole('button', { name: /Add/ }).click();
    await page.getByRole('tab', { name: /Shopping list/ }).click();
    await expect(page.getByTestId('shopping-list').getByRole('listitem')).toHaveCount(4);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Design Studio' })).toBeVisible();
    await page.getByRole('tab', { name: /Shopping list/ }).click();
    await expect(page.getByTestId('shopping-list').getByRole('listitem')).toHaveCount(4);

    await page.getByRole('button', { name: /^Remove / }).first().click();
    await expect(page.getByTestId('shopping-list').getByRole('listitem')).toHaveCount(3);
  });

  test('a new design replaces the pieces the last one added, and keeps the ones added by hand', async ({ page }) => {
    test.setTimeout(120_000);
    const finder = await mockItemFinder(page);
    await signIn(page);
    await uploadRoom(page);
    await configure(page);
    await generate(page);

    await page.getByRole('tab', { name: 'Furniture' }).click();
    await expect(page.getByTestId('furniture-item')).toHaveCount(3);
    await page.getByTestId('furniture-item').first().click();
    await page.getByTestId('piece-detail').getByRole('button', { name: 'Add estimate to list' }).click();

    finder.items = [{ kind: 'bed', name: 'oak bed frame', query: 'oak bed frame' }];
    await page.getByTestId('regenerate').click();
    await expect(page.getByTestId('history').getByRole('button')).toHaveCount(2);
    await expect(page.getByTestId('furniture-item')).toHaveCount(1);
    await expect(page.getByTestId('furniture-item')).toContainText('Oak bed frame');

    await page.getByRole('tab', { name: /Shopping list/ }).click();
    const list = page.getByTestId('shopping-list');
    await expect(list.getByRole('listitem')).toHaveCount(2);
    await expect(list).toContainText('Grey linen sofa (estimate)');
    await expect(list).toContainText('oak bed frame 450');
    await expect(list).not.toContainText('round walnut coffee table');
  });

  test('without a shop search the pieces carry typical prices for the style, marked as estimates', async ({ page }) => {
    test.setTimeout(90_000);
    await mockItemFinder(page, { live: false });
    await signIn(page);
    await uploadRoom(page);
    await configure(page);
    await generate(page);

    await page.getByRole('tab', { name: 'Summary' }).click();
    await expect(page.getByTestId('summary-item')).toHaveCount(3);
    await expect(page.getByTestId('summary-items')).toContainText('No shop prices were found');
    for (const row of await page.getByTestId('summary-item').all()) await expect(row).toContainText('est.');

    await page.getByRole('tab', { name: 'Furniture' }).click();
    await page.getByTestId('furniture-item').first().click();
    const detail = page.getByTestId('piece-detail');
    await expect(detail).toContainText('Live prices are not available right now');
    await expect(detail.getByRole('link', { name: /^IKEA/ })).toBeVisible();

    await page.getByRole('tab', { name: /Shopping list/ }).click();
    await expect(page.getByTestId('shopping-list').getByRole('listitem')).toHaveCount(3);
    await expect(page.getByTestId('shopping-list')).toContainText('Items marked “est.”');
  });

  test('when the finder cannot be used it says why, and trying again works', async ({ page }) => {
    test.setTimeout(90_000);
    const finder = await mockItemFinder(page, { status: 401 });
    await signIn(page);
    await uploadRoom(page);
    await configure(page);
    await generate(page);

    await page.getByRole('tab', { name: 'Furniture' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Sign in to find the items in your design.' })).toBeVisible();
    await expect(page.getByTestId('furniture-item')).toHaveCount(0);
    await expect(page.getByTestId('scan-items-device')).toBeVisible();
    // The design itself is fine, and the list is left alone.
    await expect(page.getByTestId('result-panel')).toBeVisible();
    await page.getByRole('tab', { name: /Shopping list/ }).click();
    await expect(page.getByText('Nothing here yet.')).toBeVisible();

    finder.status = 200;
    await page.getByRole('tab', { name: 'Furniture' }).click();
    await page.getByTestId('scan-items').click();
    await expect(page.getByTestId('furniture-item')).toHaveCount(3);
    await expect(page.getByTestId('item-scan')).toContainText('Found 3 pieces');
    expect(finder.detectCalls).toBe(2);
  });

  test('a design with no furniture in it says so', async ({ page }) => {
    test.setTimeout(90_000);
    await mockItemFinder(page, { items: [] });
    await signIn(page);
    await uploadRoom(page);
    await configure(page);
    await generate(page);
    await page.getByRole('tab', { name: 'Furniture' }).click();
    await expect(page.getByTestId('item-scan')).toContainText('No furniture was recognised in this design.');
    await expect(page.getByTestId('furniture-item')).toHaveCount(0);
  });
});
test.describe('Photo privacy in a real browser', () => {
  test('straightens the photo and removes camera and location data', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async () => {
      // A JPEG that claims a rotation and carries GPS-looking EXIF text.
      const c = document.createElement('canvas');
      c.width = 1200;
      c.height = 800;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#c33';
      ctx.fillRect(0, 0, 1200, 800);
      const plain = new Uint8Array(await (await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.9))).arrayBuffer());
      const exif = new TextEncoder().encode('Exif\0\0MM\0*GPSLatitude 51.5074 GPSLongitude -0.1278 Make:SecretCam');
      const seg = new Uint8Array(4 + exif.length);
      seg[0] = 0xff;
      seg[1] = 0xe1;
      seg[2] = ((exif.length + 2) >> 8) & 0xff;
      seg[3] = (exif.length + 2) & 0xff;
      seg.set(exif, 4);
      // Insert the APP1 segment right after the start-of-image marker.
      const withExif = new Uint8Array(plain.length + seg.length);
      withExif.set(plain.subarray(0, 2), 0);
      withExif.set(seg, 2);
      withExif.set(plain.subarray(2), 2 + seg.length);

      const file = new File([withExif], 'phone.jpg', { type: 'image/jpeg' });
      const mod = await import(/* @vite-ignore */ '/src/features/studio/image/prepareImage.ts');
      const backend = await import(/* @vite-ignore */ '/src/features/studio/image/browserBackend.ts');
      const prepared = await mod.prepareImage(file, backend.createBrowserBackend());

      const text = async (b: Blob) => new TextDecoder('latin1').decode(new Uint8Array(await b.arrayBuffer()));
      const before = await text(file);
      const inference = await text(prepared.inference);
      const display = await text(prepared.display);
      return {
        beforeHasGps: before.includes('GPSLatitude') && before.includes('SecretCam'),
        inferenceHasExif: inference.includes('Exif') || inference.includes('GPS') || inference.includes('SecretCam'),
        displayHasExif: display.includes('Exif') || display.includes('GPS') || display.includes('SecretCam'),
        inferenceIsJpeg: prepared.inference.type === 'image/jpeg',
        width: prepared.width,
        height: prepared.height,
        originalSizeKept: prepared.original.size === file.size,
      };
    });
    expect(result.beforeHasGps).toBe(true);
    expect(result.inferenceHasExif).toBe(false);
    expect(result.displayHasExif).toBe(false);
    expect(result.inferenceIsJpeg).toBe(true);
    expect(result.width).toBe(1024);
    expect(result.height).toBe(680);
    expect(result.originalSizeKept).toBe(true);
  });
});

test.describe('Responsive layout', () => {
  test('tablet: the controls panel can be collapsed to give the canvas the full width', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1100 });
    await signIn(page);
    const controls = page.getByRole('complementary', { name: 'Design controls' });
    await expect(controls).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/24-studio-tablet.png` });
    const before = await page.getByRole('region', { name: 'Design canvas' }).boundingBox();
    await page.getByTestId('toggle-controls').click();
    await expect(controls).toBeHidden();
    const after = await page.getByRole('region', { name: 'Design canvas' }).boundingBox();
    expect(after!.width).toBeGreaterThan(before!.width + 200);
    await page.getByTestId('toggle-controls').click();
    await expect(controls).toBeVisible();
  });

  test('desktop: three panels side by side', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);
    const [left, center, right] = await Promise.all([
      page.getByRole('complementary', { name: 'Design controls' }).boundingBox(),
      page.getByRole('region', { name: 'Design canvas' }).boundingBox(),
      page.getByRole('complementary', { name: 'Design assistant' }).boundingBox(),
    ]);
    expect(left!.x).toBeLessThan(center!.x);
    expect(center!.x).toBeLessThan(right!.x);
    expect(center!.width).toBeGreaterThan(left!.width);
    await expect(page.getByTestId('mobile-nav')).toBeHidden();
  });
});
