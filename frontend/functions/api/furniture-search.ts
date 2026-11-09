/**
 * Product search handler: GET /api/furniture-search?q=<words> (routed by worker/index.ts)
 *
 * Looks up similar products for the studio's furniture panel. It exists only to keep the search
 * service's API key off the visitor's device. With no key configured it answers `{ live: false }` and
 * the studio falls back to plain shop links, so nothing breaks.
 *
 * Environment (Pages project settings, all optional):
 *   SERPER_API_KEY   a serper.dev key (set as a Secret on the Worker); uses its Google Shopping results
 *
 * Results are cached for a day at the edge, and the query is limited in length and shape so the
 * function cannot be used as a general-purpose search proxy.
 */

interface Env {
  SERPER_API_KEY?: string;
}

interface Product {
  title: string;
  price: number | null;
  priceText: string | null;
  source: string;
  link: string;
  imageUrl: string | null;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=3600',
  'X-Content-Type-Options': 'nosniff',
};

const reply = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...extra } });

/** Furniture words only: letters, digits, spaces and a few separators, at most 80 characters. */
export function cleanQuery(raw: string | null): string | null {
  if (!raw) return null;
  const q = raw.replace(/\s+/g, ' ').trim();
  if (q.length < 2 || q.length > 80) return null;
  if (!/^[\p{L}\p{N} '&,.-]+$/u.test(q)) return null;
  return q;
}

export function parsePrice(text: unknown): number | null {
  if (typeof text !== 'string') return null;
  const m = /(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/.exec(text.replace(/\s/g, ''));
  if (!m) return null;
  const n = Number(`${m[1].replace(/,/g, '')}${m[2] ? `.${m[2]}` : ''}`);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const httpUrl = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
};

export function mapSerperShopping(data: unknown): Product[] {
  const items = (data as { shopping?: unknown } | null)?.shopping;
  if (!Array.isArray(items)) return [];
  const out: Product[] = [];
  for (const raw of items) {
    const r = raw as Record<string, unknown>;
    const link = httpUrl(r.link);
    if (!link || typeof r.title !== 'string') continue;
    const priceText = typeof r.price === 'string' ? r.price.slice(0, 40) : null;
    out.push({
      title: r.title.slice(0, 160),
      price: typeof r.priceValue === 'number' && r.priceValue > 0 ? r.priceValue : parsePrice(priceText),
      priceText,
      source: typeof r.source === 'string' ? r.source.slice(0, 60) : 'Shop',
      link,
      imageUrl: httpUrl(r.imageUrl),
    });
    if (out.length >= 8) break;
  }
  return out;
}

export const onRequestGet = async (context: { request: Request; env: Env; waitUntil?: (p: Promise<unknown>) => void }): Promise<Response> => {
  const { request, env } = context;
  const q = cleanQuery(new URL(request.url).searchParams.get('q'));
  if (!q) return reply({ error: 'A short furniture search is needed.' }, 400, { 'Cache-Control': 'no-store' });

  if (!env.SERPER_API_KEY) return reply({ live: false, results: [] });

  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  const cacheKey = new Request(`https://hoomefy.invalid/furniture-search?q=${encodeURIComponent(q.toLowerCase())}`);
  const hit = await cache?.match(cacheKey);
  if (hit) return hit;

  try {
    const res = await fetch('https://google.serper.dev/shopping', {
      method: 'POST',
      headers: { 'X-API-KEY': env.SERPER_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, gl: 'us', hl: 'en', num: 10 }),
    });
    if (!res.ok) return reply({ live: false, results: [] }, 200, { 'Cache-Control': 'no-store' });
    const results = mapSerperShopping(await res.json());
    const response = reply({ live: true, results }, 200, { 'Cache-Control': 'public, max-age=86400' });
    if (cache && results.length > 0) context.waitUntil?.(cache.put(cacheKey, response.clone()));
    return response;
  } catch {
    return reply({ live: false, results: [] }, 200, { 'Cache-Control': 'no-store' });
  }
};
