/**
 * Asks the site's own Worker (`/api/detect-items`, see worker/detect.ts) which furniture and decor are in a design.
 *
 * Only a small copy of the design is sent (at most 640 pixels on the long side), and only after the visitor has
 * made a design on this site while signed in. The answer is checked again here before anything is shown.
 */

import type { DesignStyle } from '@/types';
import { authHeaders } from '@/lib/accessAuth';
import { shrinkToJpeg } from '@/features/studio/image/shrink';
import { sanitizeItems, type DesignItem } from './items';

export const DETECT_ENDPOINT = '/api/detect-items';
/** Plenty of detail to name sofas and lamps, and small enough to send quickly. */
export const DETECT_SIDE = 640;

export type DetectErrorCode = 'auth' | 'quota' | 'busy' | 'unavailable' | 'aborted';

export class DetectError extends Error {
  constructor(
    public readonly code: DetectErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'DetectError';
  }
}

export interface DetectOptions {
  signal?: AbortSignal;
  style?: DesignStyle | null;
  /** Replaced in tests. */
  fetchImpl?: typeof fetch;
  shrink?: (image: Blob, maxSide: number, quality?: number) => Promise<Blob>;
  timeoutMs?: number;
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Unreadable image.')));
    reader.onerror = () => reject(reader.error ?? new Error('Unreadable image.'));
    reader.readAsDataURL(blob);
  });
}

interface ErrorBody {
  error?: { code?: string };
}

export async function detectItemsInCloud(image: Blob, idPrefix: string, options: DetectOptions = {}): Promise<DesignItem[]> {
  const doFetch = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const shrink = options.shrink ?? shrinkToJpeg;
  if (options.signal?.aborted) throw new DetectError('aborted', 'Cancelled.');

  let dataUrl: string;
  try {
    dataUrl = await toDataUrl(await shrink(image, DETECT_SIDE, 0.8));
  } catch {
    throw new DetectError('unavailable', 'The design could not be prepared for the item finder.');
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? 60_000);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onAbort, { once: true });

  try {
    let res: Response;
    try {
      res = await doFetch(DETECT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ image: dataUrl }),
        signal: controller.signal,
      });
    } catch {
      if (options.signal?.aborted) throw new DetectError('aborted', 'Cancelled.');
      throw new DetectError('unavailable', timedOut ? 'Looking through your design took too long.' : 'The item finder could not be reached.');
    }

    if (!res.ok) {
      const code = ((await res.json().catch(() => ({}))) as ErrorBody).error?.code;
      if (res.status === 401) throw new DetectError('auth', 'Sign in to find the items in your design.');
      if (res.status === 429 && code === 'QUOTA') throw new DetectError('quota', "Today's free item finding is used up.");
      if (res.status === 429) throw new DetectError('busy', 'Too many requests at once. Please wait a moment.');
      throw new DetectError('unavailable', 'The item finder is not available right now.');
    }

    let body: { items?: unknown };
    try {
      body = (await res.json()) as { items?: unknown };
    } catch {
      throw new DetectError('unavailable', 'The item finder sent an unreadable answer.');
    }
    return sanitizeItems(body.items, idPrefix, options.style ?? null);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }
}
