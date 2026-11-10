import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from './index';

const ctx = { waitUntil: () => undefined };

const headers = { Authorization: 'Bearer aaa.bbb.ccc', apikey: 'sb_publishable_testkey123' };

function makeEnv(over: Record<string, unknown> = {}) {
  const limit = vi.fn(async () => ({ success: true }));
  const assets = vi.fn(async () => new Response('<html>site</html>', { headers: { 'Content-Type': 'text/html' } }));
  return {
    env: { ASSETS: { fetch: assets }, SUPABASE_URL: 'https://proj.supabase.co', SERPER_API_KEY: 'serper-key', SEARCH_LIMITER: { limit }, ...over },
    limit,
    assets,
  };
}

/** Stands in for the network: Supabase says who the caller is, Serper lists products. */
function stubNetwork(signedIn: boolean) {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes('/auth/v1/user')) return signedIn ? Response.json({ id: 'user-1' }) : new Response('{}', { status: 401 });
      if (url.includes('serper.dev')) return Response.json({ shopping: [{ title: 'Oak table', link: 'https://shop.example/oak', price: '$120', source: 'Shop' }] });
      return new Response('unexpected', { status: 500 });
    })
  );
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe('/api/furniture-search', () => {
  it('answers a signed-in visitor, counting the search against their limit', async () => {
    const calls = stubNetwork(true);
    const { env, limit } = makeEnv();
    const res = await worker.fetch(new Request('https://hoomefy.example/api/furniture-search?q=oak+table', { headers }), env, ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ live: true, results: [{ title: 'Oak table', price: 120 }] });
    expect(limit).toHaveBeenCalledWith({ key: 'search:user-1' });
    expect(calls.some((u) => u.includes('serper.dev'))).toBe(true);
  });

  it('turns away anyone who is not signed in, without spending the search allowance', async () => {
    const calls = stubNetwork(false);
    const res = await worker.fetch(new Request('https://hoomefy.example/api/furniture-search?q=oak+table', { headers }), makeEnv().env, ctx);
    expect(res.status).toBe(401);
    expect(calls.some((u) => u.includes('serper.dev'))).toBe(false);

    const bare = await worker.fetch(new Request('https://hoomefy.example/api/furniture-search?q=oak+table'), makeEnv().env, ctx);
    expect(bare.status).toBe(401);
  });

  it('slows down a visitor who searches too often', async () => {
    const calls = stubNetwork(true);
    const { env } = makeEnv({ SEARCH_LIMITER: { limit: async () => ({ success: false }) } });
    const res = await worker.fetch(new Request('https://hoomefy.example/api/furniture-search?q=oak+table', { headers }), env, ctx);
    expect(res.status).toBe(429);
    expect(calls.some((u) => u.includes('serper.dev'))).toBe(false);
  });

  it('only accepts GET', async () => {
    const res = await worker.fetch(new Request('https://hoomefy.example/api/furniture-search?q=oak', { method: 'POST', headers }), makeEnv().env, ctx);
    expect(res.status).toBe(405);
  });
});

describe('routing', () => {
  it('sends /api/detect-items to the item finder', async () => {
    stubNetwork(true);
    const res = await worker.fetch(new Request('https://hoomefy.example/api/detect-items', { method: 'GET' }), makeEnv().env, ctx);
    // The finder answers GET with 405 and Allow: POST, which shows the request reached it.
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('POST');
  });

  it('answers 404 for an unknown API path and serves everything else from the built site', async () => {
    const { env, assets } = makeEnv();
    expect((await worker.fetch(new Request('https://hoomefy.example/api/nope'), env, ctx)).status).toBe(404);
    expect(assets).not.toHaveBeenCalled();
    const page = await worker.fetch(new Request('https://hoomefy.example/studio'), env, ctx);
    expect(await page.text()).toContain('site');
    expect(assets).toHaveBeenCalledTimes(1);
  });
});
