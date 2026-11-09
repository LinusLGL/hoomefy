/**
 * The backup AI source: FLUX.2 [klein] 4B on Cloudflare Workers AI, reached through this site's own
 * `/api/redesign` route (worker/redesign.ts).
 *
 * It has its own free daily allowance, separate from the visitor's Hugging Face time, so the studio tries it
 * when Hugging Face has none left. Only signed-in visitors can use it: the route checks the Supabase session.
 * The model accepts reference images smaller than 512 pixels, so the photo is shrunk first; the design is
 * still made at the full requested size.
 */

import { shrinkToJpeg } from '../image/shrink';
import { AiError, type EditRequest, type EditResult, type ImageEditProvider } from './types';

export const CLOUDFLARE_ENDPOINT = '/api/redesign';
/** Reference images must be smaller than 512 x 512; stay clearly under it. */
export const CLOUDFLARE_REFERENCE_SIDE = 480;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface CloudflareAuth {
  /** The visitor's Supabase access token. */
  token: string;
  /** The Supabase publishable (anon) key, which the route forwards to Supabase to check the token. */
  apiKey: string;
}

export interface CloudflareProviderOptions {
  /** Returns the current sign-in, or null when the visitor is not signed in. */
  getAuth: () => Promise<CloudflareAuth | null>;
  endpoint?: string;
  /** Replaced in tests. */
  shrink?: (image: Blob, maxSide: number) => Promise<Blob>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

interface ErrorBody {
  error?: { code?: string; message?: string };
}

function decodeBase64(b64: string, mime: string): Blob {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function createCloudflareProvider(options: CloudflareProviderOptions): ImageEditProvider {
  const endpoint = options.endpoint ?? CLOUDFLARE_ENDPOINT;
  const shrink = options.shrink ?? shrinkToJpeg;
  const doFetch = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const timeoutMs = options.timeoutMs ?? 90_000;

  return {
    id: 'cf:flux-2-klein-4b',
    label: 'FLUX.2 klein 4B (Cloudflare Workers AI)',
    sendsPhoto: true,
    quotaGroup: 'cloudflare',

    async edit(request: EditRequest): Promise<EditResult> {
      if (request.signal?.aborted) throw new AiError('aborted', 'Cancelled.');

      const auth = await options.getAuth();
      if (!auth) throw new AiError('unavailable', 'Sign in to use the backup AI service.');

      let reference: Blob;
      try {
        reference = await shrink(request.image, CLOUDFLARE_REFERENCE_SIDE);
      } catch {
        throw new AiError('unavailable', 'The photo could not be prepared for the backup AI service.');
      }

      const form = new FormData();
      form.append('prompt', request.prompt);
      form.append('width', String(request.width));
      form.append('height', String(request.height));
      if (request.seed !== undefined) form.append('seed', String(request.seed));
      form.append('image', reference, 'room.jpg');

      request.onStatus?.({ stage: 'running' });

      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
      const onAbort = () => controller.abort();
      request.signal?.addEventListener('abort', onAbort, { once: true });

      try {
        let res: Response;
        try {
          res = await doFetch(endpoint, {
            method: 'POST',
            headers: { Authorization: `Bearer ${auth.token}`, apikey: auth.apiKey },
            body: form,
            signal: controller.signal,
          });
        } catch {
          if (request.signal?.aborted) throw new AiError('aborted', 'Cancelled.');
          if (timedOut) throw new AiError('timeout', 'The backup AI service took too long. Please try again.');
          throw new AiError('unavailable', 'The backup AI service could not be reached.');
        }

        if (!res.ok) {
          const code = ((await res.json().catch(() => ({}))) as ErrorBody).error?.code;
          if (res.status === 429 && code === 'QUOTA') throw new AiError('quota', 'The backup AI allowance for today is used up.');
          if (res.status === 429) throw new AiError('busy', 'Too many designs at once. Please wait a moment.', 30);
          if (res.status === 400) throw new AiError('invalid', 'The backup AI service could not use this photo or request.');
          throw new AiError('unavailable', 'The backup AI service is not available right now.');
        }

        let payload: { image?: unknown; mime?: unknown };
        try {
          payload = (await res.json()) as { image?: unknown; mime?: unknown };
        } catch {
          throw new AiError('unavailable', 'The backup AI service returned an unreadable answer.');
        }
        if (typeof payload.image !== 'string' || typeof payload.mime !== 'string' || !ALLOWED_MIME.has(payload.mime)) {
          throw new AiError('unavailable', 'The backup AI service returned no image.');
        }
        let blob: Blob;
        try {
          blob = decodeBase64(payload.image, payload.mime);
        } catch {
          throw new AiError('unavailable', 'The backup AI service returned a damaged image.');
        }
        return { blob, seed: request.seed, providerId: 'cf:flux-2-klein-4b', demo: false };
      } finally {
        clearTimeout(timer);
        request.signal?.removeEventListener('abort', onAbort);
      }
    },
  };
}
