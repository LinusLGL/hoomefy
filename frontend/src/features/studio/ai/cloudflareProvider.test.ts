import { describe, expect, it, vi } from 'vitest';
import { CLOUDFLARE_REFERENCE_SIDE, createCloudflareProvider } from './cloudflareProvider';
import { AiError, type EditRequest } from './types';

const photo = new Blob(['big-photo'], { type: 'image/jpeg' });
const small = new Blob(['small-photo'], { type: 'image/jpeg' });
const auth = { token: 'aaa.bbb.ccc', apiKey: 'sb_publishable_testkey123' };

const request = (over: Partial<EditRequest> = {}): EditRequest => ({
  image: photo,
  prompt: 'Redesign this living room in a Scandinavian style.',
  width: 1024,
  height: 768,
  ...over,
});

// "iVBORw0KGgo" is how a PNG starts once base64-encoded; the provider only decodes it, so any bytes will do.
const PNG_BASE64 = btoa('\u0089PNG\r\n\u001a\n-pretend-image-bytes-');
const okResponse = () => new Response(JSON.stringify({ image: PNG_BASE64, mime: 'image/png' }), { status: 200, headers: { 'content-type': 'application/json' } });
const errorResponse = (status: number, code: string) => new Response(JSON.stringify({ error: { code, message: code } }), { status });

function setup(fetchImpl: unknown, getAuth: () => Promise<typeof auth | null> = async () => auth) {
  const shrink = vi.fn(async () => small);
  const provider = createCloudflareProvider({ getAuth, shrink, fetchImpl: fetchImpl as typeof fetch });
  return { provider, shrink };
}

describe('createCloudflareProvider', () => {
  it('shrinks the photo, posts it with the visitor\'s sign-in and returns the decoded image', async () => {
    const fetchImpl = vi.fn(async () => okResponse());
    const { provider, shrink } = setup(fetchImpl);
    const onStatus = vi.fn();

    const result = await provider.edit(request({ seed: 7, onStatus }));

    expect(shrink).toHaveBeenCalledWith(photo, CLOUDFLARE_REFERENCE_SIDE);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/redesign');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ Authorization: 'Bearer aaa.bbb.ccc', apikey: 'sb_publishable_testkey123' });
    const form = init.body as FormData;
    expect(form.get('prompt')).toBe('Redesign this living room in a Scandinavian style.');
    expect(form.get('width')).toBe('1024');
    expect(form.get('height')).toBe('768');
    expect(form.get('seed')).toBe('7');
    expect((form.get('image') as File).size).toBe(small.size);
    expect(onStatus).toHaveBeenCalledWith({ stage: 'running' });

    expect(result).toMatchObject({ providerId: 'cf:flux-2-klein-4b', demo: false, seed: 7 });
    expect(result.blob.type).toBe('image/png');
    expect(result.blob.size).toBeGreaterThan(10);
  });

  it('leaves the seed out when none was asked for', async () => {
    const fetchImpl = vi.fn(async () => okResponse());
    await setup(fetchImpl).provider.edit(request());
    const form = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData;
    expect(form.has('seed')).toBe(false);
  });

  it('is its own allowance group and says the photo leaves the device', () => {
    const { provider } = setup(vi.fn());
    expect(provider.quotaGroup).toBe('cloudflare');
    expect(provider.sendsPhoto).toBe(true);
  });

  it('does not send anything when the visitor is not signed in', async () => {
    const fetchImpl = vi.fn();
    const { provider, shrink } = setup(fetchImpl, async () => null);
    await expect(provider.edit(request())).rejects.toMatchObject({ code: 'unavailable', message: expect.stringMatching(/sign in/i) });
    expect(shrink).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    [429, 'QUOTA', 'quota'],
    [429, 'RATE_LIMITED', 'busy'],
    [400, 'INVALID_REQUEST', 'invalid'],
    [401, 'UNAUTHORIZED', 'unavailable'],
    [404, 'NOT_FOUND', 'unavailable'],
    [502, 'UNAVAILABLE', 'unavailable'],
    [503, 'NOT_CONFIGURED', 'unavailable'],
  ])('turns HTTP %i %s into the %s error', async (status, code, expected) => {
    const { provider } = setup(vi.fn(async () => errorResponse(status, code)));
    const err = (await provider.edit(request()).catch((e: unknown) => e)) as AiError;
    expect(err).toBeInstanceOf(AiError);
    expect(err.code).toBe(expected);
  });

  it('treats a network failure as unavailable', async () => {
    const { provider } = setup(vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(provider.edit(request())).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('treats a photo it cannot shrink as unavailable instead of sending the large original', async () => {
    const fetchImpl = vi.fn();
    const provider = createCloudflareProvider({
      getAuth: async () => auth,
      shrink: async () => {
        throw new Error('canvas');
      },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(provider.edit(request())).rejects.toMatchObject({ code: 'unavailable' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('refuses an answer that is not an image', async () => {
    const odd = new Response(JSON.stringify({ image: PNG_BASE64, mime: 'text/html' }), { status: 200 });
    await expect(setup(vi.fn(async () => odd)).provider.edit(request())).rejects.toMatchObject({ code: 'unavailable' });
    const empty = new Response(JSON.stringify({}), { status: 200 });
    await expect(setup(vi.fn(async () => empty)).provider.edit(request())).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('stops quietly when the visitor cancels', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl = vi.fn();
    await expect(setup(fetchImpl).provider.edit(request({ signal: controller.signal }))).rejects.toMatchObject({ code: 'aborted' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
