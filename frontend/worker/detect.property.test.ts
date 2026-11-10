/**
 * Property-based tests for the Worker routes that take input from strangers and from AI models (requirement R3 of
 * .kiro/specs/studio-items, and the "validate input at trust boundaries" rule in .kiro/steering/security.md).
 *
 * A vision model can answer with anything: broken JSON, extra fields, huge strings, a sentence around the JSON.
 * A caller can send anything as the picture. None of it may crash a route or get through unchecked.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { MAX_BODY_BYTES, MAX_FOUND, cleanFound, extractJson, itemsFromOutput, modelOutput, readImage } from './detect';
import { sniffBase64, sniffImage } from './redesign';
import { FURNITURE_IDS, isFurnitureKind } from '../src/features/furniture/taxonomy';
import { cleanQuery, mapSerperShopping, parsePrice, MAX_PRICE } from '../functions/api/furniture-search';

const text = fc.string({ unit: 'binary', maxLength: 300 });
const rawItem = fc.record(
  { kind: fc.oneof(fc.constantFrom(...FURNITURE_IDS), text, fc.integer(), fc.constant(null)), name: fc.oneof(text, fc.integer(), fc.constant(undefined)), query: fc.oneof(text, fc.constant(undefined)) },
  { requiredKeys: [] }
);

describe('cleanFound (properties)', () => {
  it('returns at most ten pieces, each of a known kind with a short name and safe search words, without repeats', () => {
    fc.assert(
      fc.property(fc.oneof(fc.array(rawItem, { maxLength: 40 }), fc.array(fc.anything(), { maxLength: 20 }), fc.anything()), (input) => {
        const found = cleanFound(input);
        expect(found.length).toBeLessThanOrEqual(MAX_FOUND);
        const seen = new Set<string>();
        for (const item of found) {
          expect(isFurnitureKind(item.kind)).toBe(true);
          expect(item.name.length).toBeGreaterThanOrEqual(2);
          expect(item.name.length).toBeLessThanOrEqual(60);
          expect(item.query.length).toBeGreaterThanOrEqual(2);
          expect(item.query.length).toBeLessThanOrEqual(80);
          expect(item.query).toMatch(/^[\p{L}\p{N} '&,.-]+$/u);
          const key = `${item.kind}:${item.name.toLowerCase()}`;
          expect(seen.has(key)).toBe(false);
          seen.add(key);
        }
      }),
      { numRuns: 500 }
    );
  });
});

describe('reading a model answer (properties)', () => {
  it('extractJson, modelOutput and itemsFromOutput never throw, whatever the model says', () => {
    fc.assert(
      fc.property(fc.oneof(text, fc.anything()), (answer) => {
        if (typeof answer === 'string') {
          const parsed = extractJson(answer);
          expect(parsed === null || typeof parsed === 'object' || typeof parsed !== 'undefined').toBe(true);
        }
        modelOutput(answer);
        const items = itemsFromOutput(answer);
        expect(items === null || (Array.isArray(items) && items.length <= MAX_FOUND)).toBe(true);
      }),
      { numRuns: 500 }
    );
  });

  it('finds the list again when the model wraps it in words or a code fence', () => {
    fc.assert(
      fc.property(fc.constantFrom(...FURNITURE_IDS), fc.stringMatching(/^[A-Za-z]{2,20}$/), fc.string({ maxLength: 40 }).filter((s) => !/[{}[\]]/.test(s)), fc.string({ maxLength: 40 }).filter((s) => !/[{}[\]]/.test(s)), (kind, name, before, after) => {
        const json = JSON.stringify({ items: [{ kind, name, query: name }] });
        for (const wrapped of [json, `${before}${json}${after}`, `\`\`\`json\n${json}\n\`\`\``]) {
          const items = itemsFromOutput(wrapped);
          expect(items).not.toBeNull();
          expect(items?.[0]?.kind).toBe(kind);
        }
      }),
      { numRuns: 300 }
    );
  });
});

describe('the picture a caller sends (properties)', () => {
  it('readImage returns the picture only when it is a small JPEG, PNG or WebP data URL whose bytes match', () => {
    fc.assert(
      fc.property(fc.oneof(text, fc.anything()), (value) => {
        const image = readImage(value);
        if (image === null) return;
        expect(typeof image).toBe('string');
        expect(image.length).toBeLessThanOrEqual(MAX_BODY_BYTES);
        expect(image).toMatch(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/);
        expect(sniffBase64(image.split(',')[1])).not.toBeNull();
      }),
      { numRuns: 500 }
    );
  });

  it('readImage accepts every well-formed picture, and refuses other file types and bytes that are not an image', () => {
    const base64 = fc.stringMatching(/^[A-Za-z0-9+/]{20,400}$/);
    fc.assert(
      fc.property(base64, (body) => {
        expect(readImage(`data:image/jpeg;base64,/9j/${body}`)).not.toBeNull();
        expect(readImage(`data:image/png;base64,iVBORw0KGgo${body}`)).not.toBeNull();
        expect(readImage(`data:image/webp;base64,UklGR${body}`)).not.toBeNull();
        expect(readImage(`data:image/png;base64,AAAA${body}`)).toBeNull();
        expect(readImage(`data:image/svg+xml;base64,${body}`)).toBeNull();
      }),
      { numRuns: 300 }
    );
  });

  it('sniffImage names a type only for the real magic bytes', () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 40 }), (bytes) => {
        const type = sniffImage(bytes);
        if (type === 'image/jpeg') expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xff, 0xd8, 0xff]);
        if (type === 'image/png') expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([0x89, 0x50, 0x4e, 0x47]);
        if (type === 'image/webp') expect(String.fromCharCode(...bytes.slice(0, 4)) + String.fromCharCode(...bytes.slice(8, 12))).toBe('RIFFWEBP');
      }),
      { numRuns: 500 }
    );
  });
});

describe('the shop search route (properties)', () => {
  it('cleanQuery returns nothing, or 2 to 80 characters of safe search words', () => {
    fc.assert(
      fc.property(fc.oneof(text, fc.constant(null)), (raw) => {
        const q = cleanQuery(raw);
        if (q === null) return;
        expect(q.length).toBeGreaterThanOrEqual(2);
        expect(q.length).toBeLessThanOrEqual(80);
        expect(q).toMatch(/^[\p{L}\p{N} '&,.-]+$/u);
      }),
      { numRuns: 500 }
    );
  });

  it('mapSerperShopping keeps at most eight products, links only to http(s), and prices only real amounts', () => {
    const product = fc.record(
      { title: fc.oneof(text, fc.integer()), link: fc.oneof(fc.webUrl(), text, fc.constant('javascript:alert(1)')), price: fc.oneof(text, fc.constant(undefined)), priceValue: fc.oneof(fc.double(), fc.constantFrom(Infinity, -Infinity, NaN, Number.MAX_VALUE), text), source: fc.oneof(text, fc.constant(undefined)), imageUrl: fc.oneof(fc.webUrl(), text) },
      { requiredKeys: [] }
    );
    fc.assert(
      fc.property(fc.oneof(fc.record({ shopping: fc.array(product, { maxLength: 30 }) }), fc.anything()), (body) => {
        const products = mapSerperShopping(body);
        expect(products.length).toBeLessThanOrEqual(8);
        for (const p of products) {
          expect(p.link).toMatch(/^https?:\/\//);
          expect(p.imageUrl === null || /^https?:\/\//.test(p.imageUrl)).toBe(true);
          expect(p.price === null || (Number.isFinite(p.price) && p.price > 0 && p.price <= MAX_PRICE)).toBe(true);
        }
      }),
      { numRuns: 500 }
    );
  });

  it('parsePrice returns nothing or an amount in range', () => {
    fc.assert(
      fc.property(fc.oneof(text, fc.integer(), fc.constant(null)), (value) => {
        const price = parsePrice(value);
        expect(price === null || (Number.isFinite(price) && price > 0 && price <= MAX_PRICE)).toBe(true);
      }),
      { numRuns: 500 }
    );
  });
});
