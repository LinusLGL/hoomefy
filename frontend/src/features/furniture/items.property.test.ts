/**
 * Property-based tests for what comes back from the item finder and the shops (requirements R3 and R4 of
 * .kiro/specs/studio-items). That data is untrusted: it comes from a vision model and from the web, so the cleaning
 * code must hold for any input, not just the shapes an example test thinks of.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { MAX_FOUND_ITEMS, cleanName, cleanShopQuery, pickPrice, sanitizeItems, totalPrice, type DesignItem, type ItemPrices } from './items';
import { estimateMid } from './estimate';
import { MAX_PRICE, parsePrice, sanitizeProducts, type ProductResult } from './search';
import { FURNITURE_IDS, isFurnitureKind } from './taxonomy';
import { STYLE_ORDER } from '@/features/studio/styles';
import type { DesignStyle } from '@/types';

const text = fc.string({ unit: 'binary', maxLength: 300 });
const kind = fc.constantFrom(...FURNITURE_IDS);
const style = fc.option(fc.constantFrom<DesignStyle>(...STYLE_ORDER), { nil: null });

/** Something shaped like the detector's answer, with every field possibly wrong. */
const rawItem = fc.record(
  { kind: fc.oneof(kind, kind, text, fc.constant(undefined), fc.integer()), name: fc.oneof(text, fc.integer(), fc.constant(null)), query: fc.oneof(text, fc.constant(undefined), fc.integer()) },
  { requiredKeys: [] }
);

const SHOP_QUERY = /^[\p{L}\p{N} '&,.-]+$/u;

describe('cleanName and cleanShopQuery (properties)', () => {
  it('a name is short, single-spaced, trimmed and free of control characters', () => {
    fc.assert(
      fc.property(fc.oneof(text, fc.integer(), fc.constant(undefined)), (value) => {
        const name = cleanName(value);
        expect(name.length).toBeLessThanOrEqual(60);
        expect(name).toBe(name.trim());
        expect(name).not.toMatch(/\s{2,}/);
        expect(name).not.toMatch(/\p{Cc}/u);
      }),
      { numRuns: 300 }
    );
  });

  it('a shop query is either nothing, or 2 to 80 safe characters', () => {
    fc.assert(
      fc.property(fc.oneof(text, fc.integer(), fc.constant(undefined)), (value) => {
        const q = cleanShopQuery(value);
        if (q === null) return;
        expect(q.length).toBeGreaterThanOrEqual(2);
        expect(q.length).toBeLessThanOrEqual(80);
        expect(q).toMatch(SHOP_QUERY);
        expect(q).toBe(q.trim());
        expect(q).not.toMatch(/\s{2,}/);
      }),
      { numRuns: 500 }
    );
  });
});

describe('sanitizeItems (properties)', () => {
  it('only ever returns known kinds, readable names and safe search words, at most ten, without repeats', () => {
    fc.assert(
      fc.property(fc.oneof(fc.array(rawItem, { maxLength: 40 }), fc.array(fc.anything(), { maxLength: 20 }), fc.anything()), style, (input, s) => {
        const items = sanitizeItems(input, 'v1', s);
        expect(items.length).toBeLessThanOrEqual(MAX_FOUND_ITEMS);
        const seen = new Set<string>();
        const ids = new Set<string>();
        for (const item of items) {
          expect(isFurnitureKind(item.kind)).toBe(true);
          expect(item.name.length).toBeGreaterThan(0);
          expect(item.name.length).toBeLessThanOrEqual(60);
          expect(item.query).toMatch(SHOP_QUERY);
          expect(item.query.length).toBeLessThanOrEqual(80);
          expect(ids.has(item.id)).toBe(false);
          ids.add(item.id);
          const key = `${item.kind}:${item.name.toLowerCase()}`;
          expect(seen.has(key)).toBe(false);
          seen.add(key);
        }
      }),
      { numRuns: 400 }
    );
  });

  it('keeps every valid piece it is given, up to ten, in the order given', () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.record({ kind, n: fc.integer({ min: 0, max: 9999 }) }), { maxLength: 10, selector: (r) => `${r.kind}:${r.n}` }), (pieces) => {
        const items = sanitizeItems(
          pieces.map((p) => ({ kind: p.kind, name: `piece ${p.n}`, query: `piece ${p.n}` })),
          'v1'
        );
        expect(items.map((i) => i.kind)).toEqual(pieces.map((p) => p.kind));
      }),
      { numRuns: 200 }
    );
  });
});

const product = (price: number | null, n: number): ProductResult => ({ title: `p${n}`, price, priceText: null, source: 'Shop', link: `https://shop.example/${n}`, imageUrl: null });

describe('pickPrice and totalPrice (properties)', () => {
  const prices = fc.array(fc.option(fc.double({ min: 0.01, max: 100_000, noNaN: true }), { nil: null }), { maxLength: 12 });
  const item = (k: DesignItem['kind']): DesignItem => ({ id: 'v1:0', kind: k, name: 'x', query: 'x' });

  it('counts a real shop price whenever there is one, and always one that was listed', () => {
    fc.assert(
      fc.property(kind, style, prices, (k, s, list) => {
        const results = list.map((p, n) => product(p, n));
        const listed = list.filter((p): p is number => p !== null);
        const pick = pickPrice(item(k), { status: 'done', live: true, results } satisfies ItemPrices, s);
        if (listed.length === 0) {
          expect(pick).toMatchObject({ estimated: true, product: null, low: null, high: null, shops: 0 });
          expect(pick.price).toBe(estimateMid(k, s));
          return;
        }
        expect(pick.estimated).toBe(false);
        expect(listed).toContain(pick.price);
        expect(pick.product?.price).toBe(pick.price);
        expect(pick.shops).toBe(listed.length);
        expect(pick.low).toBe(Math.min(...listed));
        expect(pick.high).toBe(Math.max(...listed));
        expect(pick.price).toBeGreaterThanOrEqual(pick.low as number);
        expect(pick.price).toBeLessThanOrEqual(pick.high as number);
      }),
      { numRuns: 400 }
    );
  });

  it('the price counted is as close to the middle of the listed prices as any other', () => {
    fc.assert(
      fc.property(kind, fc.array(fc.double({ min: 0.01, max: 100_000, noNaN: true }), { minLength: 1, maxLength: 12 }), (k, list) => {
        const pick = pickPrice(item(k), { status: 'done', live: true, results: list.map((p, n) => product(p, n)) }, null);
        const sorted = [...list].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        for (const p of list) expect(Math.abs(pick.price - median)).toBeLessThanOrEqual(Math.abs(p - median) + 1e-9);
      }),
      { numRuns: 400 }
    );
  });

  it('a total is the sum of what was counted and is never negative', () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(kind, prices), { maxLength: 10 }), style, (rows, s) => {
        const picks = rows.map(([k, list]) => pickPrice(item(k), { status: 'done', live: true, results: list.map((p, n) => product(p, n)) }, s));
        const total = totalPrice(picks);
        expect(total).toBeGreaterThanOrEqual(0);
        expect(total).toBeCloseTo(picks.reduce((sum, p) => sum + p.price, 0), 6);
      }),
      { numRuns: 200 }
    );
  });
});

describe('what the shops send back (properties)', () => {
  it('sanitizeProducts keeps at most eight well-formed products and links only to http(s)', () => {
    const rawProduct = fc.record(
      { title: fc.oneof(text, fc.integer()), link: fc.oneof(fc.webUrl(), text, fc.constant('javascript:alert(1)')), price: fc.oneof(fc.double({ noNaN: false }), fc.constantFrom(Infinity, -Infinity, NaN, Number.MAX_VALUE), text), priceText: fc.oneof(text, fc.constant(null)), source: fc.oneof(text, fc.constant(undefined)), imageUrl: fc.oneof(fc.webUrl(), text, fc.constant('data:text/html,<x>')) },
      { requiredKeys: [] }
    );
    fc.assert(
      fc.property(fc.oneof(fc.array(rawProduct, { maxLength: 30 }), fc.anything()), (input) => {
        const products = sanitizeProducts(input);
        expect(products.length).toBeLessThanOrEqual(8);
        for (const p of products) {
          expect(p.link).toMatch(/^https?:\/\//);
          expect(p.imageUrl === null || /^https?:\/\//.test(p.imageUrl)).toBe(true);
          expect(p.price === null || (Number.isFinite(p.price) && p.price > 0 && p.price <= MAX_PRICE)).toBe(true);
          expect(p.title.length).toBeLessThanOrEqual(160);
          expect(p.source.length).toBeLessThanOrEqual(60);
        }
      }),
      { numRuns: 400 }
    );
  });

  it('parsePrice returns nothing or a positive, finite number', () => {
    fc.assert(
      fc.property(fc.oneof(text, fc.constant(null), fc.constant(undefined)), (value) => {
        const price = parsePrice(value);
        expect(price === null || (Number.isFinite(price) && price > 0 && price <= MAX_PRICE)).toBe(true);
      }),
      { numRuns: 500 }
    );
  });

  it('parsePrice reads a dollar amount back exactly', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 999_999 }), fc.integer({ min: 0, max: 99 }), (dollars, cents) => {
        const shown = `$${dollars.toLocaleString('en-US')}.${String(cents).padStart(2, '0')}`;
        expect(parsePrice(shown)).toBeCloseTo(dollars + cents / 100, 2);
      }),
      { numRuns: 300 }
    );
  });
});
