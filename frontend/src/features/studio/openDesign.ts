/**
 * Loads a saved design back into the studio: the photo, the result, the choices and the shopping list.
 */

import { useStudioStore } from '@/stores/studioStore';
import { useShoppingStore } from '@/features/furniture/shoppingStore';
import { resetScan } from '@/features/furniture/scan';
import type { SavedDesign } from '@/services/designsService';
import { fitToModelSize } from './dimensions';

async function fetchBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

async function imageSize(blob: Blob): Promise<{ width: number; height: number }> {
  try {
    const bitmap = await createImageBitmap(blob);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return { width: 1024, height: 768 };
  }
}

export async function openDesignInStudio(design: SavedDesign): Promise<void> {
  if (!design.originalUrl || !design.generatedUrl) throw new Error('This design has no images to open.');
  const [original, generated] = await Promise.all([fetchBlob(design.originalUrl), fetchBlob(design.generatedUrl)]);
  const size = await imageSize(original);
  const model = fitToModelSize(size.width, size.height);

  const store = useStudioStore.getState();
  store.setUploadedImage({
    file: new File([original], `${design.name}.jpg`, { type: 'image/jpeg' }),
    preview: URL.createObjectURL(original),
    inference: original,
    width: model.width,
    height: model.height,
    originalWidth: size.width,
    originalHeight: size.height,
  });
  store.setStyle(design.style);
  store.setPreferences(design.preferences);
  store.addVersion({
    id: `saved-${design.id}`,
    url: URL.createObjectURL(generated),
    blob: generated,
    createdAt: design.createdAt,
    style: design.style,
    prompt: design.prompt,
    providerId: 'saved',
    demo: false,
  });

  useShoppingStore.setState({ items: design.shopping });
  resetScan();
}
