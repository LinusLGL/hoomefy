/**
 * Turns the file a visitor picked into the copies the studio needs.
 *
 *   original   the file exactly as supplied. Kept only in memory; never uploaded.
 *   display    upright, EXIF-free copy up to 2048 px, shown in the studio and saved with a design.
 *   inference  upright, EXIF-free copy up to 1024 px, the only image sent to the AI service.
 *
 * Re-encoding through a canvas drops every metadata block (GPS position, camera, owner), and decoding
 * with `imageOrientation: from-image` rotates phone photographs upright first.
 */

import { fitToModelSize, MODEL_MAX } from '../dimensions';
import { sniffImageType } from './sniff';

export const IMAGE_LIMITS = {
  maxFileBytes: 10 * 1024 * 1024,
  /** Both sides must be at least this long. */
  minSide: 512,
  /** Larger photographs are refused rather than decoded, to protect the browser's memory. */
  maxSide: 12_000,
  displayMax: 2048,
  inferenceMax: MODEL_MAX,
} as const;

export type ImageErrorCode = 'type' | 'size' | 'tooSmall' | 'tooLarge' | 'decode';

export class ImageError extends Error {
  constructor(
    public readonly code: ImageErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'ImageError';
  }
}

export interface DecodedImage {
  width: number;
  height: number;
}

/** The browser-specific parts, swapped for a fake in unit tests. */
export interface ImageBackend {
  /** Decodes the file, already rotated upright. */
  decode(file: File): Promise<DecodedImage>;
  /** Re-encodes the decoded image at the given size as a JPEG. */
  encode(width: number, height: number, quality: number): Promise<Blob>;
  /** Frees the decoded image. */
  release(): void;
}

export type PrepareStage = 'checking' | 'decoding' | 'resizing' | 'encoding' | 'done';

export interface PreparedImage {
  original: File;
  display: Blob;
  inference: Blob;
  previewUrl: string;
  width: number;
  height: number;
  displayWidth: number;
  displayHeight: number;
  originalWidth: number;
  originalHeight: number;
}

const PROGRESS: Record<PrepareStage, number> = { checking: 10, decoding: 35, resizing: 60, encoding: 85, done: 100 };

function scaleToFit(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Reads the first bytes of a file. Falls back to FileReader where Blob.arrayBuffer is missing. */
function readHead(file: Blob, length = 16): Promise<Uint8Array> {
  const slice = file.slice(0, length);
  if (typeof slice.arrayBuffer === 'function') return slice.arrayBuffer().then((buffer) => new Uint8Array(buffer));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(slice);
  });
}

/** Checks the file's real format (not just its name or reported type) and its size. */
export async function checkFile(file: File): Promise<void> {
  if (file.size > IMAGE_LIMITS.maxFileBytes) {
    throw new ImageError('size', 'This photo is larger than 10 MB. Please choose a smaller file.');
  }
  const head = await readHead(file);
  if (!sniffImageType(head)) {
    throw new ImageError('type', 'Please choose a JPEG, PNG or WebP photo.');
  }
}

export async function prepareImage(
  file: File,
  backend: ImageBackend,
  onProgress?: (percent: number, stage: PrepareStage) => void
): Promise<PreparedImage> {
  const report = (stage: PrepareStage) => onProgress?.(PROGRESS[stage], stage);

  report('checking');
  await checkFile(file);

  report('decoding');
  let decoded: DecodedImage;
  try {
    decoded = await backend.decode(file);
  } catch {
    throw new ImageError('decode', 'We could not read this photo. Try saving it again as a JPEG or PNG.');
  }

  try {
    if (decoded.width < IMAGE_LIMITS.minSide || decoded.height < IMAGE_LIMITS.minSide) {
      throw new ImageError('tooSmall', `This photo is too small. Both sides need to be at least ${IMAGE_LIMITS.minSide} pixels.`);
    }
    if (decoded.width > IMAGE_LIMITS.maxSide || decoded.height > IMAGE_LIMITS.maxSide) {
      throw new ImageError('tooLarge', 'This photo is extremely large. Please choose one under 12,000 pixels on each side.');
    }

    report('resizing');
    const display = scaleToFit(decoded.width, decoded.height, IMAGE_LIMITS.displayMax);
    const model = fitToModelSize(decoded.width, decoded.height, IMAGE_LIMITS.inferenceMax);

    report('encoding');
    const displayBlob = await backend.encode(display.width, display.height, 0.92);
    const inferenceBlob = await backend.encode(model.width, model.height, 0.92);

    report('done');
    return {
      original: file,
      display: displayBlob,
      inference: inferenceBlob,
      previewUrl: URL.createObjectURL(displayBlob),
      width: model.width,
      height: model.height,
      displayWidth: display.width,
      displayHeight: display.height,
      originalWidth: decoded.width,
      originalHeight: decoded.height,
    };
  } finally {
    backend.release();
  }
}
