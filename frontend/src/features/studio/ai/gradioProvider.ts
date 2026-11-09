/**
 * FLUX.2 [klein] 4B on a Hugging Face Space (ZeroGPU), called straight from the browser.
 *
 * The visitor's own free GPU allowance pays for the work (2 minutes a day anonymously, 5 with a free
 * Hugging Face account), so the site needs no GPU, no key and no server in the middle. An optional
 * Hugging Face token raises the allowance.
 *
 * The request shape was checked against the official Space `black-forest-labs/FLUX.2-klein-4B`:
 * endpoint `/infer`, the photograph passed in the `input_images` gallery, the result returned as
 * `[image, seed]`. Distilled mode needs 4 steps and a guidance scale of 1.
 */

import { Client, handle_file } from '@gradio/client';
import { AiError, type AiErrorCode, type EditRequest, type EditResult, type ImageEditProvider } from './types';

export const DEFAULT_SPACE = 'black-forest-labs/FLUX.2-klein-4B';

export interface GradioMessage {
  type: string;
  stage?: string;
  position?: number;
  eta?: number;
  message?: unknown;
  title?: string;
  data?: unknown;
}

export interface GradioJob extends AsyncIterable<GradioMessage> {
  cancel?: () => Promise<unknown> | unknown;
}

export interface GradioClientLike {
  submit(endpoint: string, payload: Record<string, unknown>): GradioJob;
}

export interface GradioProviderOptions {
  space?: string;
  /** Returns a Hugging Face token when the visitor supplied one. */
  getToken?: () => string | null;
  /** Replaced in tests. */
  connect?: (space: string, token: string | null) => Promise<GradioClientLike>;
  fetchImpl?: typeof fetch;
  /** Gives up after this long, queue time included. */
  timeoutMs?: number;
}

const defaultConnect = async (space: string, token: string | null): Promise<GradioClientLike> => {
  // Without vents: ['data', 'status'] the client hides queue positions and, worse, failures such as ZeroGPU's
  // "quota exceeded", so a failed run would look like an empty answer.
  const options = { events: ['data', 'status'] as Array<'data' | 'status'>, ...(token && token.startsWith('hf_') ? { token: token as `hf_${string}` } : {}) };
  return (await Client.connect(space, options)) as unknown as GradioClientLike;
};

/** Turns a failure message from the Space into something the visitor can act on. */
export function classifyGradioError(raw: string): { code: AiErrorCode; message: string; retryAfterSeconds?: number } {
  const text = raw || 'The AI service returned an error.';
  const retry = /retry in (\d+):(\d{2}):(\d{2})/i.exec(text);
  const retryAfterSeconds = retry ? Number(retry[1]) * 3600 + Number(retry[2]) * 60 + Number(retry[3]) : undefined;

  if (/quota|zerogpu|gpu.*(exceeded|limit)|exceeded.*gpu/i.test(text)) {
    return {
      code: 'quota',
      retryAfterSeconds,
      message:
        'The free AI time for today is used up. Add a free Hugging Face token under "More free AI time", try again later, or show a demo rendering.',
    };
  }
  if (/queue is full|too many (requests|users)|capacity|overloaded/i.test(text)) {
    return { code: 'busy', message: 'The free AI service is very busy right now. Please try again in a minute.' };
  }
  if (/safety|nsfw|not allowed|blocked|filter/i.test(text)) {
    return { code: 'invalid', message: 'The AI service declined this photo or request. Try a different photo or wording.' };
  }
  if (/sleep|paused|building|runtime error|not found|could not get space|connection errored|failed to fetch|network/i.test(text)) {
    return { code: 'unavailable', message: 'The free AI service is not reachable right now. Please try again in a moment.' };
  }
  return { code: 'unavailable', message: `The AI service could not finish this design: ${text}` };
}

function messageText(message: unknown): string {
  if (typeof message === 'string') return message;
  if (message && typeof message === 'object') {
    try {
      return JSON.stringify(message);
    } catch {
      return '';
    }
  }
  return '';
}

function readImageUrl(data: unknown): { url: string | null; seed?: number } {
  if (!Array.isArray(data)) return { url: null };
  const first = data[0] as { url?: string | null; path?: string | null } | string | null | undefined;
  const seed = typeof data[1] === 'number' ? data[1] : undefined;
  if (typeof first === 'string') return { url: first, seed };
  return { url: first?.url ?? null, seed };
}

export function createGradioProvider(options: GradioProviderOptions = {}): ImageEditProvider {
  const space = options.space ?? DEFAULT_SPACE;
  const connect = options.connect ?? defaultConnect;
  const doFetch = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const timeoutMs = options.timeoutMs ?? 180_000;

  return {
    id: `hf:${space}`,
    label: 'FLUX.2 klein 4B (Hugging Face)',
    sendsPhoto: true,
    // Every ZeroGPU Space draws on the same per-visitor GPU time.
    quotaGroup: 'huggingface',

    async edit(request: EditRequest): Promise<EditResult> {
      if (request.signal?.aborted) throw new AiError('aborted', 'Cancelled.');

      let job: GradioJob | null = null;
      let timedOut = false;
      const cancelJob = () => {
        try {
          void Promise.resolve(job?.cancel?.()).catch(() => undefined);
        } catch {
          // already finished
        }
      };
      const onAbort = () => cancelJob();
      request.signal?.addEventListener('abort', onAbort, { once: true });
      const timer = setTimeout(() => {
        timedOut = true;
        cancelJob();
      }, timeoutMs);

      try {
        let client: GradioClientLike;
        try {
          client = await connect(space, options.getToken?.() ?? null);
        } catch (err) {
          const c = classifyGradioError(err instanceof Error ? err.message : String(err));
          throw new AiError(c.code === 'unavailable' ? 'unavailable' : c.code, c.message, c.retryAfterSeconds);
        }
        if (request.signal?.aborted) throw new AiError('aborted', 'Cancelled.');

        job = client.submit('/infer', {
          prompt: request.prompt,
          input_images: [{ image: handle_file(request.image), caption: null }],
          mode_choice: 'Distilled (4 steps)',
          seed: request.seed ?? 0,
          randomize_seed: request.seed === undefined,
          width: request.width,
          height: request.height,
          num_inference_steps: 4,
          guidance_scale: 1,
          prompt_upsampling: false,
        });

        let imageUrl: string | null = null;
        let seed: number | undefined;

        for await (const msg of job) {
          if (msg.type === 'status') {
            if (msg.stage === 'error') {
              const c = classifyGradioError(messageText(msg.message) || msg.title || '');
              throw new AiError(c.code, c.message, c.retryAfterSeconds);
            }
            if (msg.stage === 'pending') {
              request.onStatus?.({ stage: 'queued', position: msg.position, etaSeconds: msg.eta });
            } else if (msg.stage === 'generating') {
              request.onStatus?.({ stage: 'running', etaSeconds: msg.eta });
            }
          } else if (msg.type === 'data') {
            const read = readImageUrl(msg.data);
            if (read.url) {
              imageUrl = read.url;
              seed = read.seed;
            }
          }
        }

        if (request.signal?.aborted) throw new AiError('aborted', 'Cancelled.');
        if (timedOut) throw new AiError('timeout', 'The free AI service took too long. Please try again.');
        if (!imageUrl) throw new AiError('unavailable', 'The AI service finished without returning an image. Please try again.');

        let blob: Blob;
        try {
          const res = await doFetch(imageUrl, { signal: request.signal });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          blob = await res.blob();
        } catch (err) {
          if (request.signal?.aborted) throw new AiError('aborted', 'Cancelled.');
          throw new AiError('unavailable', `The design was made but could not be downloaded (${err instanceof Error ? err.message : 'network error'}). Please try again.`);
        }
        return { blob, seed, providerId: `hf:${space}`, demo: false };
      } catch (err) {
        if (err instanceof AiError) throw err;
        if (request.signal?.aborted) throw new AiError('aborted', 'Cancelled.');
        if (timedOut) throw new AiError('timeout', 'The free AI service took too long. Please try again.');
        const c = classifyGradioError(err instanceof Error ? err.message : String(err));
        throw new AiError(c.code, c.message, c.retryAfterSeconds);
      } finally {
        clearTimeout(timer);
        request.signal?.removeEventListener('abort', onAbort);
      }
    },
  };
}
