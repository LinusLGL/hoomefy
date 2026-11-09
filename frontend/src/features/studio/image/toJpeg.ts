/**
 * Models often answer with WebP. JPEG downloads open everywhere, so convert once when the result arrives.
 * If the browser cannot do it the original is kept as it is.
 */
export async function toJpeg(blob: Blob, quality = 0.95): Promise<Blob> {
  if (blob.type === 'image/jpeg') return blob;
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    return jpeg ?? blob;
  } catch {
    return blob;
  }
}
