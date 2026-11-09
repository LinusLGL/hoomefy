/**
 * Scales a photograph down so its longest side is at most `maxSide` and re-encodes it as JPEG.
 * It never scales up. Used for the backup AI source, whose model only accepts reference images smaller than 512 pixels.
 */
export async function shrinkToJpeg(image: Blob, maxSide: number, quality = 0.9): Promise<Blob> {
  const bitmap = await createImageBitmap(image);
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available.');
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!jpeg) throw new Error('Could not encode the image.');
    return jpeg;
  } finally {
    bitmap.close();
  }
}
