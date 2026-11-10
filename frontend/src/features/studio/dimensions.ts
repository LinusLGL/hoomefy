/**
 * Sizes for the image model.
 *
 * FLUX.2 klein takes widths and heights between 256 and 1024 that are multiples of 8. The output keeps
 * the photograph's proportions so the room is not squashed.
 */

export const MODEL_MAX = 1024;
export const MODEL_MIN = 256;
export const MODEL_STEP = 8;

export interface Size {
  width: number;
  height: number;
}

const snap = (value: number, step: number) => Math.round(value / step) * step;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function fitToModelSize(width: number, height: number, max = MODEL_MAX, min = MODEL_MIN, step = MODEL_STEP): Size {
  // Zero, negative, NaN and infinite sizes all mean the real size is not known. (Infinity used to give NaN.)
  if (!(width > 0) || !(height > 0) || !Number.isFinite(width) || !Number.isFinite(height)) return { width: max, height: max };
  // Never scale up: a small photograph is edited at its own size.
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: clamp(snap(width * scale, step), min, max),
    height: clamp(snap(height * scale, step), min, max),
  };
}
