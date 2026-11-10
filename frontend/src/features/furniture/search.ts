/**
 * Finding similar products on the web.
 *
 * Two layers, so shopping always works:
 *   1. Search links for well-known shops and Google Shopping. Always available and free, no key needed.
 *   2. Live product results (title, price, shop, picture) from a small Cloudflare function that holds an
 *      optional search-API key and answers only signed-in visitors. When it is not set up, or the request
 *      fails, the links remain and the studio shows typical prices for the style, marked as estimates.
 *
 * Hoomefy never scrapes shops and never rewrites links: every product opens on the retailer's own site.
 */

import type { DesignStyle } from '@/types';
import { authHeaders } from '@/lib/accessAuth';
import { STYLES } from '@/features/studio/styles';
import { FURNITURE, type FurnitureKindId } from './taxonomy';

export interface ProductResult {
  title: string;
  /** Price in US dollars when the shop listed one. */
  price: number | null;
  priceText: string | null;
  source: string;
  link: string;
  imageUrl: string | null;
}

export interface RetailerLink {
  name: string;
  url: string;
}

/** The words typed into a shop's search box for this piece in this style. */
export function buildSearchQuery(kindId: FurnitureKindId, style: DesignStyle | null): string {
  const noun = FURNITURE[kindId].noun;
  const styleWords = style ? STYLES[style].searchWords : '';
  return [styleWords, noun].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

export function retailerLinks(query: string): RetailerLink[] {
  const q = encodeURIComponent(query);
  return [
    { name: 'Google Shopping', url: `https://www.google.com/search?tbm=shop&q=${q}` },
    { name: 'IKEA', url: `https://www.ikea.com/us/en/search/?q=${q}` },
    { name: 'Wayfair', url: `https://www.wayfair.com/keyword.php?keyword=${q}` },
    { name: 'Target', url: `https://www.target.com/s?searchTerm=${q}` },
    { name: 'Amazon', url: `https://www.amazon.com/s?k=${q}` },
    { name: 'Etsy', url: `https://www.etsy.com/search?q=${q}` },
  ];
}

/** No piece of furniture costs more than this. Anything above it (or not a finite number) is a bad value, not a price. */
export const MAX_PRICE = 1_000_000;

const isPrice = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= MAX_PRICE;

/** "$1,299.00" -> 1299. Returns null when no price can be read. */
export function parsePrice(text: string | null | undefined): number | null {
  if (!text) return null;
  const match = /(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/.exec(text.replace(/\s/g, ''));
  if (!match) return null;
  const value = Number(`${match[1].replace(/,/g, '')}${match[2] ? `.${match[2]}` : ''}`);
  return isPrice(value) ? value : null;
}

const isHttpUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
};

/** Keeps only well-formed products, so nothing odd from the network is ever rendered or linked. */
export function sanitizeProducts(input: unknown, limit = 8): ProductResult[] {
  if (!Array.isArray(input)) return [];
  const out: ProductResult[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.title !== 'string' || !isHttpUrl(r.link)) continue;
    const priceText = typeof r.priceText === 'string' ? r.priceText.slice(0, 40) : null;
    out.push({
      title: r.title.slice(0, 160),
      price: isPrice(r.price) ? r.price : parsePrice(priceText),
      priceText,
      source: typeof r.source === 'string' ? r.source.slice(0, 60) : 'Shop',
      link: r.link,
      imageUrl: isHttpUrl(r.imageUrl) ? r.imageUrl : null,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export interface LiveSearchResult {
  live: boolean;
  results: ProductResult[];
}

export async function searchProducts(query: string, signal?: AbortSignal, fetchImpl: typeof fetch = fetch): Promise<LiveSearchResult> {
  try {
    const res = await fetchImpl(`/api/furniture-search?q=${encodeURIComponent(query)}`, { signal, headers: { Accept: 'application/json', ...(await authHeaders()) } });
    if (!res.ok) return { live: false, results: [] };
    const body = (await res.json()) as { live?: boolean; results?: unknown };
    return { live: body.live === true, results: sanitizeProducts(body.results) };
  } catch {
    return { live: false, results: [] };
  }
}
