import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanQuery, mapSerperShopping, onRequestGet, parsePrice } from './furniture-search';

const call = (q: string | null, env: { SERPER_API_KEY?: string } = {}) =>
  onRequestGet({ request: new Request(`https://hoomefy.example/api/furniture-search${q === null ? '' : `?q=${encodeURIComponent(q)}`}`), env });

afterEach(() => vi.unstubAllGlobals());

describe('cleanQuery', () => {
  it('accepts short furniture searches', () => {
    expect(cleanQuery('  scandinavian light oak   coffee table ')).toBe('scandinavian light oak coffee table');
    expect(cleanQuery("kid's desk & chair")).toBe("kid's desk & chair");
  });

  it('refuses anything that is not a short plain search', () => {
    expect(cleanQuery(null)).toBeNull();
    expect(cleanQuery('a')).toBeNull();
    expect(cleanQuery('x'.repeat(81))).toBeNull();
    expect(cleanQuery('<script>alert(1)</script>')).toBeNull();
    expect(cleanQuery('sofa; drop table')).toBeNull();
    expect(cleanQuery('https://evil.example/path')).toBeNull();
  });
});

describe('mapSerperShopping', () => {
  it('keeps well-formed products with a price', () => {
    const out = mapSerperShopping({
      shopping: [
        { title: 'Oak table', link: 'https://shop.example/oak', price: '$1,299.00', source: 'Shop', imageUrl: 'https://img.example/a.jpg' },
        { title: 'Priced', link: 'https://shop.example/p', price: '$10', priceValue: 12.5 },
        { title: 'No link' },
        { title: 'Bad link', link: 'javascript:alert(1)' },
        { title: 'Bad image', link: 'https://shop.example/b', imageUrl: 'data:text/html,x' },
      ],
    });
    expect(out.map((p) => p.title)).toEqual(['Oak table', 'Priced', 'Bad image']);
    expect(out[0]).toMatchObject({ price: 1299, priceText: '$1,299.00', source: 'Shop' });
    expect(out[1].price).toBe(12.5);
    expect(out[2].imageUrl).toBeNull();
  });

  it('copes with unexpected shapes and caps the list', () => {
    expect(mapSerperShopping(null)).toEqual([]);
    expect(mapSerperShopping({ shopping: 'x' })).toEqual([]);
    const many = Array.from({ length: 30 }, (_, i) => ({ title: `p${i}`, link: `https://s.example/${i}` }));
    expect(mapSerperShopping({ shopping: many })).toHaveLength(8);
  });

  it('reads prices', () => {
    expect(parsePrice('$49.99')).toBe(49.99);
    expect(parsePrice('Free')).toBeNull();
    expect(parsePrice(12)).toBeNull();
  });
});

describe('GET /api/furniture-search', () => {
  it('rejects a missing or odd query', async () => {
    const res = await call(null);
    expect(res.status).toBe(400);
    expect((await call('<b>x</b>')).status).toBe(400);
  });

  it('says it is not live when no search key is set, and does not call out', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const res = await call('oak coffee table');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ live: false, results: [] });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('asks the search service with the key kept server-side and returns clean products', async () => {
    const fetchSpy = vi.fn(async () =>
      Response.json({ shopping: [{ title: 'Oak table', link: 'https://shop.example/oak', price: '$300', source: 'Shop' }] })
    );
    vi.stubGlobal('fetch', fetchSpy);
    const res = await call('oak coffee table', { SERPER_API_KEY: 'secret-key' });
    const body = (await res.json()) as { live: boolean; results: Array<{ title: string; price: number }> };
    expect(body.live).toBe(true);
    expect(body.results[0]).toMatchObject({ title: 'Oak table', price: 300 });
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://google.serper.dev/shopping');
    expect((init.headers as Record<string, string>)['X-API-KEY']).toBe('secret-key');
    expect(JSON.parse(init.body as string).q).toBe('oak coffee table');
    // The key never appears in what the visitor receives.
    expect(JSON.stringify(body)).not.toContain('secret-key');
  });

  it('falls back to not live when the search service fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    expect(await (await call('oak table', { SERPER_API_KEY: 'k' })).json()).toEqual({ live: false, results: [] });
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('offline');
    }));
    expect(await (await call('oak table', { SERPER_API_KEY: 'k' })).json()).toEqual({ live: false, results: [] });
  });
});
