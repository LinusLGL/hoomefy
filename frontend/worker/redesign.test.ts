import { describe, expect, it, vi } from 'vitest';
import {
  MAX_BODY_BYTES,
  MODEL,
  buildAiBody,
  handleRedesign,
  mapAiError,
  parseRedesignForm,
  sniffBase64,
  sniffImage,
  verifyUser,
  type FormLike,
  type RedesignEnv,
} from './redesign';

// A tiny fake JPEG: the real signature followed by padding, long enough to pass the size floor.
const jpegBytes = () => {
  const bytes = new Uint8Array(400);
  bytes.set([0xff, 0xd8, 0xff, 0xe0]);
  return bytes;
};
const fileOf = (bytes: Uint8Array) => ({ size: bytes.length, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });

const goodFields = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  prompt: 'Redesign this living room in a Scandinavian style.',
  width: '1024',
  height: '768',
  image: fileOf(jpegBytes()),
  ...over,
});
const formOf = (fields: Record<string, unknown>): FormLike => ({ get: (name) => (name in fields ? fields[name] : null) });

const BASE64_IMAGE = `iVBORw0KGgo${'A'.repeat(200)}`;

function makeRequest(over: { method?: string; headers?: Record<string, string>; fields?: Record<string, unknown>; formThrows?: boolean } = {}) {
  const headers = new Headers({
    'Content-Length': '5000',
    'Content-Type': 'multipart/form-data; boundary=xyz',
    Authorization: 'Bearer aaa.bbb.ccc',
    apikey: 'sb_publishable_testkey123',
    ...over.headers,
  });
  const request = new Request('https://hoomefy.example/api/redesign', { method: over.method ?? 'POST', headers, body: over.method === 'GET' ? undefined : 'x' });
  // The runtime parses the real multipart body; here the parsed form is supplied directly.
  (request as unknown as { formData: () => Promise<FormLike> }).formData = async () => {
    if (over.formThrows) throw new Error('bad body');
    return formOf(over.fields ?? goodFields());
  };
  return request;
}

const supabaseOk = () => vi.fn(async () => new Response(JSON.stringify({ id: 'user-1' }), { status: 200 })) as unknown as typeof fetch;

function makeEnv(over: Partial<RedesignEnv> = {}) {
  const run = vi.fn(async () => ({ image: BASE64_IMAGE }));
  const limit = vi.fn(async () => ({ success: true }));
  const env: RedesignEnv = { AI: { run }, SUPABASE_URL: 'https://proj.supabase.co', REDESIGN_LIMITER: { limit }, ...over };
  return { env, run, limit };
}

const errorCode = async (res: Response) => ((await res.json()) as { error: { code: string } }).error.code;

describe('sniffImage / sniffBase64', () => {
  it('recognises JPEG, PNG and WebP by their first bytes', () => {
    expect(sniffImage(jpegBytes())).toBe('image/jpeg');
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(sniffImage(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe('image/webp');
  });
  it('rejects anything else, including a script that claims to be an image', () => {
    expect(sniffImage(new TextEncoder().encode('<script>alert(1)</script>'))).toBeNull();
    expect(sniffImage(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBeNull();
    expect(sniffImage(new Uint8Array())).toBeNull();
  });
  it('reads the type from the start of a base64 answer', () => {
    expect(sniffBase64('/9j/4AAQ')).toBe('image/jpeg');
    expect(sniffBase64('iVBORw0KGgoAAAA')).toBe('image/png');
    expect(sniffBase64('UklGRiQAAABXRUJQ')).toBe('image/webp');
    expect(sniffBase64('PGh0bWw+')).toBeNull();
  });
});

describe('verifyUser', () => {
  const env: RedesignEnv = { SUPABASE_URL: 'https://proj.supabase.co/' };
  const req = (headers: Record<string, string>) => new Request('https://x.example/api/redesign', { method: 'POST', headers });

  it('asks Supabase about the token and returns the user id', async () => {
    const fetchImpl = supabaseOk();
    const id = await verifyUser(req({ Authorization: 'Bearer aaa.bbb.ccc', apikey: 'sb_publishable_testkey123' }), env, fetchImpl);
    expect(id).toBe('user-1');
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://proj.supabase.co/auth/v1/user');
    expect(init.headers).toEqual({ Authorization: 'Bearer aaa.bbb.ccc', apikey: 'sb_publishable_testkey123' });
  });

  it('refuses a missing or malformed token without calling Supabase', async () => {
    const fetchImpl = supabaseOk();
    expect(await verifyUser(req({}), env, fetchImpl)).toBeNull();
    expect(await verifyUser(req({ Authorization: 'Bearer notajwt', apikey: 'sb_publishable_testkey123' }), env, fetchImpl)).toBeNull();
    expect(await verifyUser(req({ Authorization: 'Basic aaa.bbb.ccc', apikey: 'sb_publishable_testkey123' }), env, fetchImpl)).toBeNull();
    expect(await verifyUser(req({ Authorization: 'Bearer aaa.bbb.ccc', apikey: 'bad key with spaces' }), env, fetchImpl)).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('refuses a token Supabase does not accept, or an answer without an id', async () => {
    const headers = { Authorization: 'Bearer aaa.bbb.ccc', apikey: 'sb_publishable_testkey123' };
    expect(await verifyUser(req(headers), env, vi.fn(async () => new Response('{}', { status: 401 })) as unknown as typeof fetch)).toBeNull();
    expect(await verifyUser(req(headers), env, vi.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof fetch)).toBeNull();
    expect(await verifyUser(req(headers), env, vi.fn(async () => Promise.reject(new Error('down'))) as unknown as typeof fetch)).toBeNull();
  });
});

describe('parseRedesignForm', () => {
  it('accepts a complete, valid form', async () => {
    const parsed = await parseRedesignForm(formOf(goodFields({ seed: '42' })));
    expect(parsed).toMatchObject({ width: 1024, height: 768, seed: 42, mime: 'image/jpeg' });
  });

  it.each([
    ['no prompt', { prompt: undefined }],
    ['a one-letter prompt', { prompt: 'a' }],
    ['a huge prompt', { prompt: 'x'.repeat(4001) }],
    ['a width below the minimum', { width: '128' }],
    ['a height above the maximum', { height: '2048' }],
    ['a size that is not a multiple of 8', { width: '1001' }],
    ['a size that is not a number', { width: '10e3' }],
    ['a negative seed', { seed: '-5' }],
    ['a seed that is too large', { seed: '99999999999' }],
    ['no photo', { image: undefined }],
    ['a photo that is plain text', { image: 'not a file' }],
    ['a tiny photo', { image: fileOf(new Uint8Array([0xff, 0xd8, 0xff])) }],
    ['a photo over 1 MB', { image: { size: 1_000_001, arrayBuffer: async () => new ArrayBuffer(0) } }],
    ['a non-image file', { image: fileOf(new TextEncoder().encode('<script>'.repeat(100))) }],
  ])('refuses %s', async (_label, over) => {
    const fields = goodFields();
    for (const [k, v] of Object.entries(over)) {
      if (v === undefined) delete fields[k];
      else fields[k] = v;
    }
    expect(await parseRedesignForm(formOf(fields))).toMatchObject({ status: 400, code: 'INVALID_REQUEST' });
  });
});

describe('buildAiBody', () => {
  it('builds a multipart body with the fields and the photo as input_image_0', async () => {
    const { body, contentType } = buildAiBody({ prompt: 'Make it cosy', width: 1024, height: 768, seed: 9, image: jpegBytes(), mime: 'image/jpeg' });
    expect(contentType).toMatch(/^multipart\/form-data; boundary=----hoomefy[0-9a-f]{32}$/);
    const text = new TextDecoder('latin1').decode(await new Response(body).arrayBuffer());
    expect(text).toContain('name="prompt"\r\n\r\nMake it cosy');
    expect(text).toContain('name="width"\r\n\r\n1024');
    expect(text).toContain('name="height"\r\n\r\n768');
    expect(text).toContain('name="seed"\r\n\r\n9');
    expect(text).toContain('name="input_image_0"; filename="room.jpg"\r\nContent-Type: image/jpeg');
    expect(text.trimEnd().endsWith(`${contentType.split('boundary=')[1]}--`)).toBe(true);
  });

  it('leaves the seed out when there is none', async () => {
    const { body } = buildAiBody({ prompt: 'Make it cosy', width: 512, height: 512, image: jpegBytes(), mime: 'image/jpeg' });
    expect(new TextDecoder('latin1').decode(await new Response(body).arrayBuffer())).not.toContain('name="seed"');
  });
});

describe('mapAiError', () => {
  it('recognises the used-up daily allowance', () => {
    expect(mapAiError(new Error('you have used up your daily free allocation of 10,000 neurons'))).toMatchObject({ status: 429, code: 'QUOTA' });
    expect(mapAiError(new Error('3036: account limited'))).toMatchObject({ status: 429, code: 'QUOTA' });
  });
  it('recognises a refused photo', () => {
    expect(mapAiError(new Error('Input image dimensions too large'))).toMatchObject({ status: 400, code: 'INVALID_REQUEST' });
  });
  it('calls anything else unavailable', () => {
    expect(mapAiError(new Error('gateway timeout'))).toMatchObject({ status: 502, code: 'UNAVAILABLE' });
    expect(mapAiError('weird')).toMatchObject({ status: 502, code: 'UNAVAILABLE' });
  });
});

describe('handleRedesign', () => {
  it('runs the model for a signed-in visitor and returns the image as base64 JSON', async () => {
    const { env, run, limit } = makeEnv();
    const res = await handleRedesign(makeRequest(), env, supabaseOk());

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual({ image: BASE64_IMAGE, mime: 'image/png' });
    expect(limit).toHaveBeenCalledWith({ key: 'user-1' });
    expect(run).toHaveBeenCalledTimes(1);
    const [model, input] = run.mock.calls[0] as unknown as [string, { multipart: { body: unknown; contentType: string } }];
    expect(model).toBe(MODEL);
    expect(input.multipart.contentType).toMatch(/^multipart\/form-data; boundary=/);
  });

  it('only accepts POST', async () => {
    const res = await handleRedesign(makeRequest({ method: 'GET' }), makeEnv().env, supabaseOk());
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('POST');
  });

  it('says it is not set up when the AI binding or the Supabase address is missing', async () => {
    expect((await handleRedesign(makeRequest(), makeEnv({ AI: undefined }).env, supabaseOk())).status).toBe(503);
    expect((await handleRedesign(makeRequest(), makeEnv({ SUPABASE_URL: undefined }).env, supabaseOk())).status).toBe(503);
  });

  it('refuses a missing, oversized or wrongly typed body before doing anything else', async () => {
    const fetchImpl = supabaseOk();
    const { env, run } = makeEnv();
    expect((await handleRedesign(makeRequest({ headers: { 'Content-Length': '0' } }), env, fetchImpl)).status).toBe(411);
    expect((await handleRedesign(makeRequest({ headers: { 'Content-Length': String(MAX_BODY_BYTES + 1) } }), env, fetchImpl)).status).toBe(413);
    expect((await handleRedesign(makeRequest({ headers: { 'Content-Type': 'application/json' } }), env, fetchImpl)).status).toBe(415);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it('refuses a caller who is not signed in, without spending any allowance', async () => {
    const { env, run, limit } = makeEnv();
    const rejected = vi.fn(async () => new Response('{}', { status: 401 })) as unknown as typeof fetch;
    const res = await handleRedesign(makeRequest(), env, rejected);
    expect(res.status).toBe(401);
    expect(await errorCode(res)).toBe('UNAUTHORIZED');
    expect(limit).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it('slows down someone who asks too often', async () => {
    const { env, run } = makeEnv({ REDESIGN_LIMITER: { limit: async () => ({ success: false }) } });
    const res = await handleRedesign(makeRequest(), env, supabaseOk());
    expect(res.status).toBe(429);
    expect(await errorCode(res)).toBe('RATE_LIMITED');
    expect(res.headers.get('Retry-After')).toBe('30');
    expect(run).not.toHaveBeenCalled();
  });

  it('works without the rate limiter binding (for example in local runs)', async () => {
    const { env } = makeEnv({ REDESIGN_LIMITER: undefined });
    expect((await handleRedesign(makeRequest(), env, supabaseOk())).status).toBe(200);
  });

  it('refuses an upload it cannot read and a form that fails validation', async () => {
    const { env, run } = makeEnv();
    expect((await handleRedesign(makeRequest({ formThrows: true }), env, supabaseOk())).status).toBe(400);
    expect((await handleRedesign(makeRequest({ fields: goodFields({ width: '99' }) }), env, supabaseOk())).status).toBe(400);
    expect(run).not.toHaveBeenCalled();
  });

  it('reports a used-up allowance as 429 QUOTA and other model failures as 502', async () => {
    const quota = makeEnv({ AI: { run: async () => Promise.reject(new Error('you have used up your daily free allocation of 10,000 neurons')) } });
    const quotaRes = await handleRedesign(makeRequest(), quota.env, supabaseOk());
    expect(quotaRes.status).toBe(429);
    expect(await errorCode(quotaRes)).toBe('QUOTA');

    const down = makeEnv({ AI: { run: async () => Promise.reject(new Error('upstream exploded')) } });
    const downRes = await handleRedesign(makeRequest(), down.env, supabaseOk());
    expect(downRes.status).toBe(502);
    expect(await errorCode(downRes)).toBe('UNAVAILABLE');
  });

  it('never repeats the prompt or the photo in its error answers', async () => {
    const failing = makeEnv({ AI: { run: async () => Promise.reject(new Error('boom')) } });
    const res = await handleRedesign(makeRequest(), failing.env, supabaseOk());
    const text = await res.text();
    expect(text).not.toContain('Scandinavian');
  });

  it('refuses an answer that is not a usable image string', async () => {
    for (const answer of [{}, { image: 'short' }, { image: `${BASE64_IMAGE}"}` }, { image: `${BASE64_IMAGE}\\` }, null]) {
      const { env } = makeEnv({ AI: { run: async () => answer } });
      expect((await handleRedesign(makeRequest(), env, supabaseOk())).status).toBe(502);
    }
  });
});
