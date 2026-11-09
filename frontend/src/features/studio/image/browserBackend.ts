/**
 * The real browser implementation of ImageBackend.
 *
 * `createImageBitmap(file, { imageOrientation: 'from-image' })` applies the EXIF rotation while decoding;
 * a canvas then re-encodes the pixels, which leaves all metadata behind.
 */

import type { DecodedImage, ImageBackend } from './prepareImage';

type Drawable = ImageBitmap | HTMLImageElement;

async function decodeWithImageElement(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function createBrowserBackend(): ImageBackend {
  let source: Drawable | null = null;

  return {
    async decode(file: File): Promise<DecodedImage> {
      if (typeof createImageBitmap === 'function') {
        try {
          const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
          source = bitmap;
          return { width: bitmap.width, height: bitmap.height };
        } catch {
          // fall through to the <img> decoder
        }
      }
      const img = await decodeWithImageElement(file);
      source = img;
      return { width: img.naturalWidth, height: img.naturalHeight };
    },

    async encode(width: number, height: number, quality: number): Promise<Blob> {
      if (!source) throw new Error('No image has been decoded.');
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas is not available.');
      ctx.imageSmoothingQuality = 'high';
      // JPEG has no alpha: paint white first so transparent PNGs do not turn black.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(source, 0, 0, width, height);
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image.'))), 'image/jpeg', quality);
      });
    },

    release() {
      if (source && 'close' in source) source.close();
      source = null;
    },
  };
}
