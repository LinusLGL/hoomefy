import { describe, expect, it } from 'vitest';
import { estimateMid } from './estimate';
import { MAX_FOUND_ITEMS, cleanName, cleanShopQuery, itemsFromPieces, pickPrice, sanitizeItems, totalPrice, type DesignItem } from './items';
import type { ProductResult } from './search';

const product = (price: number | null, title = `Item ${price}`): ProductResult => ({
  title,
  price,
  priceText: price === null ? null : `$${price}`,
  source: 'Shop',
  link: `https://shop.example/${title.replace(/\s/g, '-')}`,
  imageUrl: null,
});

const item: DesignItem = { id: 'v1:0', kind: 'coffee-table', name: 'Round walnut coffee table', query: 'round walnut coffee table' };

describe('cleanName / cleanShopQuery', () => {
  it('tidies a name', () => {
    expect(cleanName('  Grey \n sofa\u0007 ')).toBe('Grey sofa');
    expect(cleanName(42)).toBe('');
    expect(cleanName('x'.repeat(100)).length).toBe(60);
  });

  it('keeps only shop-search characters and a sensible length', () => {
    expect(cleanShopQuery('<b>oak</b> table')).toBe('b oak b table');
    expect(cleanShopQuery("kid's chair & desk, 2-pack.")).toBe("kid's chair & desk, 2-pack.");
    expect(cleanShopQuery('!')).toBeNull();
    expect(cleanShopQuery(undefined)).toBeNull();
    const long = cleanShopQuery('word '.repeat(40)) as string;
    expect(long.length).toBeLessThanOrEqual(80);
    expect(long.endsWith('word')).toBe(true);
  });
});

describe('sanitizeItems', () => {
  it('turns the detector answer into items with ids, names and shop words', () => {
    const out = sanitizeItems([{ kind: 'sofa', name: 'grey linen sofa', query: 'grey linen 3 seater sofa' }], 'v1');
    expect(out).toEqual([{ id: 'v1:0', kind: 'sofa', name: 'Grey linen sofa', query: 'grey linen 3 seater sofa' }]);
  });

  it('drops unknown kinds and anything that is not an object', () => {
    expect(sanitizeItems([{ kind: 'spaceship', name: 'x' }, 'sofa', null, 4], 'v1')).toEqual([]);
    expect(sanitizeItems({ kind: 'sofa' }, 'v1')).toEqual([]);
  });

  it('falls back to the kind label and a style search when the words are missing', () => {
    const [out] = sanitizeItems([{ kind: 'rug', name: '', query: '' }], 'v1', 'scandinavian');
    expect(out.name).toBe('Rug');
    expect(out.query).toBe('scandinavian light oak area rug');
  });

  it('removes repeats and stops at ten', () => {
    expect(sanitizeItems([{ kind: 'sofa', name: 'Grey sofa' }, { kind: 'sofa', name: 'GREY sofa' }], 'v1')).toHaveLength(1);
    const many = Array.from({ length: 30 }, (_, i) => ({ kind: 'chair', name: `Chair ${i}` }));
    const out = sanitizeItems(many, 'v1');
    expect(out).toHaveLength(MAX_FOUND_ITEMS);
    expect(new Set(out.map((o) => o.id)).size).toBe(MAX_FOUND_ITEMS);
  });
});

describe('itemsFromPieces', () => {
  it('names each on-device piece by its kind and keeps its box', () => {
    const box = { x: 0.1, y: 0.2, w: 0.3, h: 0.4 };
    const [out] = itemsFromPieces([{ kind: 'sofa', confidence: 0.3, box }], 'v1', 'japandi');
    expect(out).toMatchObject({ id: 'v1:0', kind: 'sofa', name: 'Sofa', confidence: 0.3, box });
    expect(out.query).toContain('sofa');
  });
});

describe('pickPrice', () => {
  it('uses the typical price for the style, marked as an estimate, when the shops listed none', () => {
    for (const prices of [undefined, { status: 'done' as const, live: false, results: [] }, { status: 'done' as const, live: true, results: [product(null)] }]) {
      expect(pickPrice(item, prices, 'minimalist')).toEqual({
        price: estimateMid('coffee-table', 'minimalist'),
        estimated: true,
        product: null,
        low: null,
        high: null,
        shops: 0,
      });
    }
  });

  it('picks the product priced nearest the middle, so one odd price does not decide', () => {
    const results = [product(15, 'Coaster'), product(300, 'Table A'), product(320, 'Table B'), product(2400, 'Designer table')];
    const pick = pickPrice(item, { status: 'done', live: true, results }, 'minimalist');
    expect(pick.estimated).toBe(false);
    expect(pick.product?.title).toBe('Table A');
    expect(pick).toMatchObject({ price: 300, low: 15, high: 2400, shops: 4 });
  });

  it('breaks a tie in favour of the earlier, more relevant result', () => {
    const pick = pickPrice(item, { status: 'done', live: true, results: [product(100, 'First'), product(200, 'Second')] }, null);
    expect(pick.product?.title).toBe('First');
  });

  it('ignores products without a price', () => {
    const pick = pickPrice(item, { status: 'done', live: true, results: [product(null, 'No price'), product(250, 'Priced')] }, null);
    expect(pick).toMatchObject({ price: 250, shops: 1, estimated: false });
  });
});

describe('totalPrice', () => {
  it('adds the prices counted for each piece', () => {
    const a = pickPrice(item, { status: 'done', live: true, results: [product(100)] }, null);
    const b = pickPrice(item, undefined, null);
    expect(totalPrice([a, b])).toBe(100 + estimateMid('coffee-table', null));
    expect(totalPrice([])).toBe(0);
  });
});
