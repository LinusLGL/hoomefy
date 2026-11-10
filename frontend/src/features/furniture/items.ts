/**
 * The pieces found in a finished design, and what they cost.
 *
 * An item is one piece of furniture or decor seen in the picture. The cloud detector (worker/detect.ts) names
 * each one in plain words and writes the words someone would type into a shop; the on-device detector gives a
 * kind and a box. Both end up as `DesignItem`, so the panels do not care where an item came from.
 *
 * Everything that arrives from the network is untrusted, so it is cleaned here before it is shown or searched.
 */

import type { DesignStyle } from '@/types';
import type { Box, DetectedPiece } from './detect';
import { estimateMid } from './estimate';
import { buildSearchQuery, type ProductResult } from './search';
import { FURNITURE, isFurnitureKind, type FurnitureKindId } from './taxonomy';

export interface DesignItem {
  id: string;
  /** The closest kind we know, used for the label fallback and the typical-price estimate. */
  kind: FurnitureKindId;
  /** What it is, in a few words, for example "round walnut coffee table". */
  name: string;
  /** The words typed into a shop's search box to find something like it. */
  query: string;
  /** Only the on-device detector reports one. */
  confidence?: number;
  /** Only the on-device detector reports one. */
  box?: Box;
}

export const MAX_FOUND_ITEMS = 10;
const NAME_MAX = 60;
const QUERY_MAX = 80;

export function cleanName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\p{Cc}+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX)
    .trim();
}

/** Letters, digits, spaces and a few separators only: the same rule the search route enforces. */
export function cleanShopQuery(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const q = value
    .replace(/[^\p{L}\p{N} '&,.-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (q.length < 2) return null;
  if (q.length <= QUERY_MAX) return q;
  const cut = q.slice(0, QUERY_MAX);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 2)).trim();
}

const capitalise = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** Turns the detector's answer into a short, de-duplicated list. Unknown kinds and empty names are dropped. */
export function sanitizeItems(input: unknown, idPrefix: string, style: DesignStyle | null = null): DesignItem[] {
  if (!Array.isArray(input)) return [];
  const out: DesignItem[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    if (!isFurnitureKind(r.kind)) continue;
    const name = cleanName(r.name) || FURNITURE[r.kind].label;
    const key = `${r.kind}:${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: `${idPrefix}:${out.length}`,
      kind: r.kind,
      name: capitalise(name),
      query: cleanShopQuery(r.query) ?? buildSearchQuery(r.kind, style),
    });
    if (out.length >= MAX_FOUND_ITEMS) break;
  }
  return out;
}

/** The on-device detector's pieces, as items. */
export function itemsFromPieces(pieces: DetectedPiece[], idPrefix: string, style: DesignStyle | null): DesignItem[] {
  return pieces.slice(0, MAX_FOUND_ITEMS).map((p, i) => ({
    id: `${idPrefix}:${i}`,
    kind: p.kind,
    name: FURNITURE[p.kind].label,
    query: buildSearchQuery(p.kind, style),
    confidence: p.confidence,
    box: p.box,
  }));
}

// ---- Prices ----

export interface ItemPrices {
  status: 'searching' | 'done';
  /** True when the shop search is switched on for this site. */
  live: boolean;
  results: ProductResult[];
}

export interface PricePick {
  /** The price to count for this item, in US dollars. */
  price: number;
  /** True when no shop price was found and the price is a rough range for the style. */
  estimated: boolean;
  /** The product the price comes from, when there is one. */
  product: ProductResult | null;
  /** The cheapest and dearest shop price found. */
  low: number | null;
  high: number | null;
  /** How many shop prices were found. */
  shops: number;
}

/**
 * The price to count for an item. Of the products the shops listed, the one priced nearest the middle is used,
 * so a single bargain accessory or an overpriced set does not decide the total. With no shop prices the style's
 * typical price for that kind of piece is used and marked as an estimate.
 */
export function pickPrice(item: DesignItem, prices: ItemPrices | undefined, style: DesignStyle | null): PricePick {
  const priced = (prices?.results ?? []).filter((r): r is ProductResult & { price: number } => r.price !== null && r.price > 0);
  if (priced.length === 0) {
    return { price: estimateMid(item.kind, style), estimated: true, product: null, low: null, high: null, shops: 0 };
  }
  const sorted = priced.map((r) => r.price).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  // Ties go to the earlier result, which the search lists as the better match.
  const product = priced.reduce((best, r) => (Math.abs(r.price - median) < Math.abs(best.price - median) ? r : best));
  return { price: product.price, estimated: false, product, low: sorted[0], high: sorted[sorted.length - 1], shops: priced.length };
}

export const totalPrice = (picks: PricePick[]): number => picks.reduce((sum, p) => sum + p.price, 0);
