import { describe, expect, it, vi } from 'vitest';
import { classifyGradioError, createGradioProvider, DEFAULT_SPACE, type GradioClientLike, type GradioJob, type GradioMessage } from './gradioProvider';
import { AiError, type EditRequest } from './types';
import { createChainProvider } from './index';

const image = new Blob(['jpeg'], { type: 'image/jpeg' });
const baseRequest = (over: Partial<EditRequest> = {}): EditRequest => ({
  image,
  prompt: 'Edit this photograph of a living room.',
  width: 1024,
  height: 728,
  ...over,
});

function jobOf(messages: GradioMessage[], cancel = vi.fn()): GradioJob {
  return {
    cancel,
    async *[Symbol.asyncIterator]() {
      for (const m of messages) yield m;
    },
  };
}

function clientReturning(job: GradioJob) {
  const submit = vi.fn(() => job);
  const client: GradioClientLike = { submit };
  return { client, submit };
}

const okFetch = (body = 'image-bytes') => vi.fn(async () => new Response(body, { status: 200, headers: { 'content-type': 'image/webp' } })) as unknown as typeof fetch;

const dataMessage = (url = 'https://example.hf.space/file=image.webp', seed = 42): GradioMessage => ({ type: 'data', data: [{ url, path: '/tmp/x.webp' }, seed] });

describe('createGradioProvider', () => {
  it('sends the photo, the prompt and the size to the klein /infer endpoint and returns the image', async () => {
    const { client, submit } = clientReturning(jobOf([{ type: 'status', stage: 'generating' }, dataMessage()]));
    const connect = vi.fn(async () => client);
    const provider = createGradioProvider({ connect, fetchImpl: okFetch() });

    const result = await provider.edit(baseRequest());

    expect(connect).toHaveBeenCalledWith(DEFAULT_SPACE, null);
    const [endpoint, payload] = submit.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(endpoint).toBe('/infer');
    expect(payload).toMatchObject({
      prompt: 'Edit this photograph of a living room.',
      mode_choice: 'Distilled (4 steps)',
      width: 1024,
      height: 728,
      num_inference_steps: 4,
      guidance_scale: 1,
      randomize_seed: true,
    });
    expect(Array.isArray(payload.input_images)).toBe(true);
    expect((payload.input_images as unknown[]).length).toBe(1);
    expect(result.demo).toBe(false);
    expect(result.seed).toBe(42);
    expect(result.providerId).toBe(`hf:${DEFAULT_SPACE}`);
    expect(await result.blob.text()).toBe('image-bytes');
  });

  it('repeats a result when a seed is given', async () => {
    const { client, submit } = clientReturning(jobOf([dataMessage()]));
    const provider = createGradioProvider({ connect: async () => client, fetchImpl: okFetch() });
    await provider.edit(baseRequest({ seed: 7 }));
    const payload = (submit.mock.calls[0] as unknown as [string, Record<string, unknown>])[1];
    expect(payload).toMatchObject({ seed: 7, randomize_seed: false });
  });

  it('reports the queue and then the running stage', async () => {
    const { client } = clientReturning(
      jobOf([
        { type: 'status', stage: 'pending', position: 3, eta: 12 },
        { type: 'status', stage: 'generating' },
        dataMessage(),
      ])
    );
    const provider = createGradioProvider({ connect: async () => client, fetchImpl: okFetch() });
    const seen: Array<[string, number | undefined]> = [];
    await provider.edit(baseRequest({ onStatus: (s) => seen.push([s.stage, s.position]) }));
    expect(seen).toEqual([
      ['queued', 3],
      ['running', undefined],
    ]);
  });

  it('passes the visitor\'s Hugging Face token when there is one', async () => {
    const { client } = clientReturning(jobOf([dataMessage()]));
    const connect = vi.fn(async () => client);
    const provider = createGradioProvider({ connect, getToken: () => 'hf_abcdefghijklmnopqrstuvwxyz', fetchImpl: okFetch() });
    await provider.edit(baseRequest());
    expect(connect).toHaveBeenCalledWith(DEFAULT_SPACE, 'hf_abcdefghijklmnopqrstuvwxyz');
  });

  it('explains when the free GPU time is used up', async () => {
    const { client } = clientReturning(
      jobOf([{ type: 'status', stage: 'error', message: 'You have exceeded your GPU quota (75s requested vs. 62s left). Please retry in 0:08:20' }])
    );
    const provider = createGradioProvider({ connect: async () => client, fetchImpl: okFetch() });
    const err = (await provider.edit(baseRequest()).catch((e: unknown) => e)) as AiError;
    expect(err).toBeInstanceOf(AiError);
    expect(err.code).toBe('quota');
    expect(err.retryAfterSeconds).toBe(500);
    expect(err.message).toMatch(/free AI time/i);
  });

  it('says the service is unavailable when it cannot be reached', async () => {
    const provider = createGradioProvider({
      connect: async () => {
        throw new Error('Could not get Space config. Connection errored out.');
      },
    });
    await expect(provider.edit(baseRequest())).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('fails clearly when no image comes back', async () => {
    const { client } = clientReturning(jobOf([{ type: 'status', stage: 'complete' }]));
    const provider = createGradioProvider({ connect: async () => client, fetchImpl: okFetch() });
    await expect(provider.edit(baseRequest())).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('fails clearly when the finished image cannot be downloaded', async () => {
    const { client } = clientReturning(jobOf([dataMessage()]));
    const bad = vi.fn(async () => new Response('nope', { status: 500 })) as unknown as typeof fetch;
    const provider = createGradioProvider({ connect: async () => client, fetchImpl: bad });
    const err = (await provider.edit(baseRequest()).catch((e: unknown) => e)) as AiError;
    expect(err.code).toBe('unavailable');
    expect(err.message).toMatch(/could not be downloaded/);
  });

  it('stops and cancels the job when the visitor cancels', async () => {
    const cancel = vi.fn();
    const controller = new AbortController();
    const job: GradioJob = {
      cancel,
      async *[Symbol.asyncIterator]() {
        yield { type: 'status', stage: 'pending', position: 1 } as GradioMessage;
        controller.abort();
      },
    };
    const provider = createGradioProvider({ connect: async () => ({ submit: () => job }), fetchImpl: okFetch() });
    await expect(provider.edit(baseRequest({ signal: controller.signal }))).rejects.toMatchObject({ code: 'aborted' });
    expect(cancel).toHaveBeenCalled();
  });

  it('does nothing when already cancelled', async () => {
    const connect = vi.fn();
    const controller = new AbortController();
    controller.abort();
    const provider = createGradioProvider({ connect: connect as never });
    await expect(provider.edit(baseRequest({ signal: controller.signal }))).rejects.toMatchObject({ code: 'aborted' });
    expect(connect).not.toHaveBeenCalled();
  });

  it('times out when the queue never moves', async () => {
    vi.useFakeTimers();
    try {
      let release: () => void = () => undefined;
      const cancel = vi.fn(() => release());
      const job: GradioJob = {
        cancel,
        [Symbol.asyncIterator]() {
          return {
            next: () =>
              new Promise<IteratorResult<GradioMessage>>((resolve) => {
                release = () => resolve({ done: true, value: undefined });
              }),
          };
        },
      };
      const provider = createGradioProvider({ connect: async () => ({ submit: () => job }), timeoutMs: 1000, fetchImpl: okFetch() });
      const pending = provider.edit(baseRequest()).catch((e: unknown) => e);
      await vi.advanceTimersByTimeAsync(1500);
      expect(await pending).toMatchObject({ code: 'timeout' });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('classifyGradioError', () => {
  it.each([
    ['You have exceeded your free GPU quota', 'quota'],
    ['ZeroGPU quota reached', 'quota'],
    ['You have exceeded your ZeroGPU runs limit. Authenticate with a Hugging Face token for more quota - https://huggingface.co/settings/tokens', 'quota'],
    ['ZeroGPU quota exceeded', 'quota'],
    ['The queue is full. Please try again later', 'busy'],
    ['Blocked by the safety filter', 'invalid'],
    ['This Space is sleeping', 'unavailable'],
    ['Something strange happened', 'unavailable'],
  ])('maps "%s" to %s', (text, code) => {
    expect(classifyGradioError(text).code).toBe(code);
  });

  it('reads the wait time', () => {
    expect(classifyGradioError('quota exceeded, retry in 1:02:03').retryAfterSeconds).toBe(3723);
    expect(classifyGradioError('quota exceeded').retryAfterSeconds).toBeUndefined();
  });
});

describe('createChainProvider', () => {
  const failing = (code: 'unavailable' | 'quota' | 'busy' | 'invalid', id: string = code, quotaGroup?: string) => ({
    id,
    label: id,
    sendsPhoto: true,
    quotaGroup,
    edit: vi.fn(async () => {
      throw new AiError(code, `${id} failed`);
    }),
  });
  const workingAs = (id: string, quotaGroup?: string) => ({
    id,
    label: id,
    sendsPhoto: true,
    quotaGroup,
    edit: vi.fn(async () => ({ blob: image, providerId: id, demo: false })),
  });
  const working = workingAs('ok');

  it('moves on to the next service when one is down', async () => {
    const chain = createChainProvider([failing('unavailable'), working]);
    expect((await chain.edit(baseRequest())).providerId).toBe('ok');
  });

  it('moves on when a service is busy', async () => {
    const chain = createChainProvider([failing('busy'), workingAs('second')]);
    expect((await chain.edit(baseRequest())).providerId).toBe('second');
  });

  it('skips services that share the used-up allowance but tries one with its own', async () => {
    const hfOne = failing('quota', 'hf-one', 'huggingface');
    const hfTwo = workingAs('hf-two', 'huggingface');
    const cloudflare = workingAs('cf', 'cloudflare');
    const chain = createChainProvider([hfOne, hfTwo, cloudflare]);
    expect((await chain.edit(baseRequest())).providerId).toBe('cf');
    expect(hfTwo.edit).not.toHaveBeenCalled();
  });

  it('reports the used-up message when every source is out of time, even if another source failed in a different way', async () => {
    const chain = createChainProvider([failing('quota', 'hf', 'huggingface'), failing('unavailable', 'cf', 'cloudflare')]);
    await expect(chain.edit(baseRequest())).rejects.toMatchObject({ code: 'quota' });
    const reversed = createChainProvider([failing('unavailable', 'a', 'a'), failing('quota', 'b', 'b')]);
    await expect(reversed.edit(baseRequest())).rejects.toMatchObject({ code: 'quota' });
  });

  it('reports the first failure when nothing was out of time', async () => {
    const chain = createChainProvider([failing('unavailable', 'first'), failing('busy', 'second')]);
    await expect(chain.edit(baseRequest())).rejects.toMatchObject({ code: 'unavailable', message: 'first failed' });
  });

  it('does not try another source after a refusal, so a declined photo is not sent twice', async () => {
    const next = workingAs('next');
    const chain = createChainProvider([failing('invalid'), next]);
    await expect(chain.edit(baseRequest())).rejects.toMatchObject({ code: 'invalid' });
    expect(next.edit).not.toHaveBeenCalled();
  });

  it('returns the only provider as it is', () => {
    expect(createChainProvider([working])).toBe(working);
  });
});
