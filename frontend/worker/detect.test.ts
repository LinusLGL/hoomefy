import { describe, expect, it, vi } from 'vitest';
import {
  INSTRUCTIONS,
  MAX_BODY_BYTES,
  MAX_FOUND,
  VISION_MODELS,
  cleanFound,
  extractJson,
  handleDetectItems,
  itemsFromOutput,
  modelOutput,
  readImage,
} from './detect';
import { requireUser } from './guard';
import type { RedesignEnv } from './redesign';

// "/9j/" is how a JPEG starts in base64.
const IMAGE = `data:image/jpeg;base64,/9j/${'A'.repeat(200)}`;

const ANSWER = { items: [{ kind: 'sofa', name: 'grey linen sofa', query: 'grey linen 3 seater sofa' }] };

function makeRequest(over: { method?: string; headers?: Record<string, string>; body?: unknown } = {}) {
  const headers = new Headers({
    'Content-Length': '5000',
    'Content-Type': 'application/json',
    Authorization: 'Bearer aaa.bbb.ccc',
    apikey: 'sb_publishable_testkey123',
    ...over.headers,
  });
  const method = over.method ?? 'POST';
  return new Request('https://hoomefy.example/api/detect-items', {
    method,
    headers,
    body: method === 'GET' ? undefined : JSON.stringify(over.body === undefined ? { image: IMAGE } : over.body),
  });
}

const supabaseOk = () => vi.fn(async () => new Response(JSON.stringify({ id: 'user-1' }), { status: 200 })) as unknown as typeof fetch;

function makeEnv(over: Partial<RedesignEnv> = {}, answer: unknown = { response: JSON.stringify(ANSWER) }) {
  const run = vi.fn(async () => answer);
  const limit = vi.fn(async () => ({ success: true }));
  const env: RedesignEnv = { AI: { run }, SUPABASE_URL: 'https://proj.supabase.co', REDESIGN_LIMITER: { limit }, ...over };
  return { env, run, limit };
}

const errorCode = async (res: Response) => ((await res.json()) as { error: { code: string } }).error.code;

describe('readImage', () => {
  it('accepts a small JPEG, PNG or WebP data URL whose bytes match', () => {
    expect(readImage(IMAGE)).toBe(IMAGE);
    expect(readImage(`data:image/png;base64,iVBORw0KGgo${'A'.repeat(50)}`)).not.toBeNull();
    expect(readImage(`data:image/webp;base64,UklGR${'A'.repeat(50)}`)).not.toBeNull();
  });

  it('refuses anything else', () => {
    expect(readImage(undefined)).toBeNull();
    expect(readImage('https://example.com/room.jpg')).toBeNull();
    expect(readImage('data:text/html;base64,PHNjcmlwdD4=')).toBeNull();
    expect(readImage('data:image/svg+xml;base64,PHN2Zz4=')).toBeNull();
    // Says JPEG but is not one.
    expect(readImage(`data:image/jpeg;base64,${'A'.repeat(100)}`)).toBeNull();
    expect(readImage(`${IMAGE}"><script>`)).toBeNull();
    expect(readImage(`data:image/jpeg;base64,/9j/${'A'.repeat(MAX_BODY_BYTES)}`)).toBeNull();
  });
});

describe('cleanFound', () => {
  it('keeps pieces of a known kind with a name and shop words', () => {
    expect(cleanFound([{ kind: 'rug', name: '  Jute   rug ', query: 'jute rug 5x8' }])).toEqual([{ kind: 'rug', name: 'Jute rug', query: 'jute rug 5x8' }]);
  });

  it('drops unknown kinds, empty names and things that are not objects', () => {
    expect(cleanFound([{ kind: 'spaceship', name: 'Rocket' }, { kind: 'sofa', name: '' }, { kind: 'sofa' }, 'sofa', null, 7])).toEqual([]);
    expect(cleanFound('nope')).toEqual([]);
  });

  it('cleans the shop words and falls back to the name when they are missing', () => {
    const [a, b] = cleanFound([
      { kind: 'sofa', name: 'Grey sofa', query: '<script>alert(1)</script> grey sofa' },
      { kind: 'chair', name: 'Oak chair', query: '!!' },
    ]);
    expect(a.query).toBe('script alert 1 script grey sofa');
    expect(b.query).toBe('Oak chair');
  });

  it('removes repeats and stops at ten', () => {
    expect(cleanFound([{ kind: 'sofa', name: 'Grey sofa' }, { kind: 'sofa', name: 'grey SOFA' }])).toHaveLength(1);
    const many = Array.from({ length: 30 }, (_, i) => ({ kind: 'chair', name: `Chair ${i}` }));
    expect(cleanFound(many)).toHaveLength(MAX_FOUND);
  });

  it('shortens very long names and shop words', () => {
    const [item] = cleanFound([{ kind: 'sofa', name: 'x'.repeat(200), query: `${'word '.repeat(40)}` }]);
    expect(item.name.length).toBeLessThanOrEqual(60);
    expect(item.query.length).toBeLessThanOrEqual(80);
  });
});

describe('reading the model answer', () => {
  it('finds JSON inside a code fence or a sentence', () => {
    expect(extractJson('```json\n{"items":[]}\n```')).toEqual({ items: [] });
    expect(extractJson('Here you go: {"items":[1]} hope that helps')).toEqual({ items: [1] });
    expect(extractJson('[1,2]')).toEqual([1, 2]);
    expect(extractJson('no json here')).toBeNull();
    expect(extractJson('{broken')).toBeNull();
  });

  it('reads the answer in the shapes the model families use', () => {
    expect(modelOutput({ response: 'text' })).toBe('text');
    expect(modelOutput({ response: ANSWER })).toEqual(ANSWER);
    expect(modelOutput({ choices: [{ message: { content: 'chat text' } }] })).toBe('chat text');
    expect(modelOutput({ choices: [{ message: { content: [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }] } }] })).toBe('ab');
    expect(modelOutput(null)).toBeNull();
    expect(modelOutput({})).toBeNull();
  });

  it('returns the list, an empty list, or null when there is no list', () => {
    expect(itemsFromOutput(JSON.stringify(ANSWER))).toEqual(ANSWER.items);
    expect(itemsFromOutput(ANSWER)).toEqual(ANSWER.items);
    expect(itemsFromOutput(JSON.stringify(ANSWER.items))).toEqual(ANSWER.items);
    expect(itemsFromOutput('{"items":[]}')).toEqual([]);
    expect(itemsFromOutput('sorry, I cannot')).toBeNull();
    expect(itemsFromOutput({ other: 1 })).toBeNull();
    expect(itemsFromOutput(undefined)).toBeNull();
  });
});

describe('requireUser', () => {
  const req = () => makeRequest();

  it('returns the user id when signed in and within the limit, and counts per scope', async () => {
    const limit = vi.fn(async () => ({ success: true }));
    expect(await requireUser(req(), { SUPABASE_URL: 'https://proj.supabase.co' }, { limit }, 'search', supabaseOk())).toBe('user-1');
    expect(limit).toHaveBeenCalledWith({ key: 'search:user-1' });
  });

  it('answers 401 when nobody is signed in and 429 when the limit is passed', async () => {
    const limit = vi.fn(async () => ({ success: false }));
    const no = (await requireUser(req(), { SUPABASE_URL: 'https://proj.supabase.co' }, { limit }, 'search', vi.fn(async () => new Response('{}', { status: 401 })) as unknown as typeof fetch)) as Response;
    expect(no.status).toBe(401);
    expect(limit).not.toHaveBeenCalled();
    const slow = (await requireUser(req(), { SUPABASE_URL: 'https://proj.supabase.co' }, { limit }, 'search', supabaseOk())) as Response;
    expect(slow.status).toBe(429);
    expect(slow.headers.get('Retry-After')).toBe('30');
  });

  it('works without a limiter binding', async () => {
    expect(await requireUser(req(), { SUPABASE_URL: 'https://proj.supabase.co' }, undefined, 'search', supabaseOk())).toBe('user-1');
  });
});

describe('handleDetectItems', () => {
  it('shows the picture to a vision model and returns the cleaned list', async () => {
    const { env, run, limit } = makeEnv();
    const res = await handleDetectItems(makeRequest(), env, supabaseOk());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual(ANSWER);
    expect(limit).toHaveBeenCalledWith({ key: 'detect:user-1' });

    expect(run).toHaveBeenCalledTimes(1);
    const [model, input] = run.mock.calls[0] as unknown as [string, { messages: Array<{ role: string; content: unknown }> }];
    expect(model).toBe(VISION_MODELS[0]);
    const user = input.messages[1].content as Array<{ type: string; text?: string; image_url?: { url: string } }>;
    expect(user[0]).toEqual({ type: 'text', text: INSTRUCTIONS });
    expect(user[1].image_url?.url).toBe(IMAGE);
  });

  it('lists every kind the studio can price in its instructions', () => {
    for (const kind of ['sofa', 'coffee-table', 'floor-lamp', 'wall-art', 'vase']) expect(INSTRUCTIONS).toContain(kind);
  });

  it('only accepts POST', async () => {
    const res = await handleDetectItems(makeRequest({ method: 'GET' }), makeEnv().env, supabaseOk());
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('POST');
  });

  it('says it is not set up when the AI binding or the Supabase address is missing', async () => {
    expect((await handleDetectItems(makeRequest(), makeEnv({ AI: undefined }).env, supabaseOk())).status).toBe(503);
    expect((await handleDetectItems(makeRequest(), makeEnv({ SUPABASE_URL: undefined }).env, supabaseOk())).status).toBe(503);
  });

  it('refuses a missing, oversized or wrongly typed body before doing anything else', async () => {
    const fetchImpl = supabaseOk();
    const { env, run } = makeEnv();
    expect((await handleDetectItems(makeRequest({ headers: { 'Content-Length': '0' } }), env, fetchImpl)).status).toBe(411);
    expect((await handleDetectItems(makeRequest({ headers: { 'Content-Length': String(MAX_BODY_BYTES + 1) } }), env, fetchImpl)).status).toBe(413);
    expect((await handleDetectItems(makeRequest({ headers: { 'Content-Type': 'text/plain' } }), env, fetchImpl)).status).toBe(415);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it('refuses a caller who is not signed in, without spending any allowance', async () => {
    const { env, run, limit } = makeEnv();
    const rejected = vi.fn(async () => new Response('{}', { status: 401 })) as unknown as typeof fetch;
    const res = await handleDetectItems(makeRequest(), env, rejected);
    expect(res.status).toBe(401);
    expect(limit).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it('refuses a picture that is not a small JPEG, PNG or WebP', async () => {
    const { env, run } = makeEnv();
    for (const body of [{}, { image: 'https://example.com/a.jpg' }, { image: 'data:image/svg+xml;base64,PHN2Zz4=' }, null]) {
      const res = await handleDetectItems(makeRequest({ body }), env, supabaseOk());
      expect(res.status).toBe(400);
      expect(await errorCode(res)).toBe('INVALID_REQUEST');
    }
    expect(run).not.toHaveBeenCalled();
  });

  it('tries the next model when the first cannot be used', async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce(new Error('model not found'))
      .mockResolvedValueOnce({ response: JSON.stringify(ANSWER) });
    const { env } = makeEnv({ AI: { run } });
    const res = await handleDetectItems(makeRequest(), env, supabaseOk());
    expect(res.status).toBe(200);
    expect(run.mock.calls.map((c) => c[0])).toEqual([...VISION_MODELS]);
  });

  it('tries the next model when the answer holds no list', async () => {
    const run = vi.fn().mockResolvedValueOnce({ response: 'I see a room.' }).mockResolvedValueOnce({ response: ANSWER });
    const res = await handleDetectItems(makeRequest(), makeEnv({ AI: { run } }).env, supabaseOk());
    expect(res.status).toBe(200);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('returns an empty list when the model sees nothing to list', async () => {
    const { env } = makeEnv({}, { response: '{"items":[]}' });
    const res = await handleDetectItems(makeRequest(), env, supabaseOk());
    expect(await res.json()).toEqual({ items: [] });
  });

  it('stops at once and says so when the free allowance is used up', async () => {
    const run = vi.fn().mockRejectedValue(new Error('3036: you have used up your daily free allocation of 10,000 neurons'));
    const res = await handleDetectItems(makeRequest(), makeEnv({ AI: { run } }).env, supabaseOk());
    expect(res.status).toBe(429);
    expect(await errorCode(res)).toBe('QUOTA');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('answers 502 when no model can read the design', async () => {
    const run = vi.fn().mockRejectedValue(new Error('boom'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await handleDetectItems(makeRequest(), makeEnv({ AI: { run } }).env, supabaseOk());
    expect(res.status).toBe(502);
    expect(await errorCode(res)).toBe('UNAVAILABLE');
    expect(run).toHaveBeenCalledTimes(VISION_MODELS.length);
    spy.mockRestore();
  });

  it('never logs the picture or the answer', async () => {
    const run = vi.fn().mockRejectedValue(new Error(`bad input ${IMAGE}`));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await handleDetectItems(makeRequest(), makeEnv({ AI: { run } }).env, supabaseOk());
    expect(spy).toHaveBeenCalled();
    for (const call of spy.mock.calls) {
      expect(String(call[1])).toContain('bad input');
      expect(String(call[1])).not.toContain('AAAA');
      expect(String(call[1]).length).toBeLessThanOrEqual(200);
    }
    spy.mockRestore();
  });
});
