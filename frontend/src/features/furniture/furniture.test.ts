import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DETECT_LABELS, detectFurniture, postProcess, type RawDetection } from './detect';
import { buildSearchQuery, parsePrice, retailerLinks, sanitizeProducts, searchProducts } from './search';
import { estimateMid, estimateRange, formatUsd, suggestPieces } from './estimate';
import { cleanItems, listAsText, MAX_ITEMS, shoppingTotal, useShoppingStore } from './shoppingStore';
import { FURNITURE, FURNITURE_IDS, ROOM_PIECES } from './taxonomy';

const det = (label: string, score: number, box = { xmin: 0.1, ymin: 0.1, xmax: 0.5, ymax: 0.6 }): RawDetection => ({ label, score, box });

describe('taxonomy', () => {
  it('has a label, a search noun and three price tiers for every piece', () => {
    for (const id of FURNITURE_IDS) {
      const k = FURNITURE[id];
      expect(k.label && k.detectLabel && k.noun).toBeTruthy();
      for (const tier of ['budget', 'mid', 'premium'] as const) {
        const [min, max] = k.price[tier];
        expect(min).toBeGreaterThan(0);
        expect(max).toBeGreaterThan(min);
      }
      expect(k.price.budget[0]).toBeLessThan(k.price.premium[1]);
    }
  });

  it('only suggests pieces that exist', () => {
    for (const pieces of Object.values(ROOM_PIECES)) for (const p of pieces) expect(FURNITURE[p]).toBeDefined();
  });

  it('gives the detector one phrase per piece', () => {
    expect(new Set(DETECT_LABELS).size).toBe(FURNITURE_IDS.length);
  });
});

describe('postProcess', () => {
  it('keeps pieces above the threshold with boxes as fractions of the picture', () => {
    const out = postProcess([det('sofa', 0.32), det('rug', 0.05)]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: 'sofa', confidence: 0.32 });
    expect(out[0].box.x).toBeCloseTo(0.1);
    expect(out[0].box.w).toBeCloseTo(0.4);
  });

  it('keeps only the best name when two names describe the same object', () => {
    const out = postProcess([det('sofa', 0.32), det('armchair', 0.25), det('ottoman', 0.13)]);
    expect(out.map((p) => p.kind)).toEqual(['sofa']);
  });

  it('keeps separate objects of the same kind, up to two', () => {
    const a = { xmin: 0, ymin: 0, xmax: 0.2, ymax: 0.2 };
    const b = { xmin: 0.4, ymin: 0.4, xmax: 0.6, ymax: 0.6 };
    const c = { xmin: 0.7, ymin: 0.7, xmax: 0.9, ymax: 0.9 };
    const out = postProcess([det('potted plant', 0.5, a), det('potted plant', 0.4, b), det('potted plant', 0.3, c)]);
    expect(out).toHaveLength(2);
  });

  it('ignores unknown labels and degenerate boxes, and clamps boxes into the picture', () => {
    const out = postProcess([
      det('banana', 0.9),
      det('mirror', 0.5, { xmin: 0.3, ymin: 0.3, xmax: 0.3, ymax: 0.3 }),
      det('curtains', 0.5, { xmin: -0.2, ymin: -0.1, xmax: 0.3, ymax: 1.4 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('curtains');
    expect(out[0].box).toEqual({ x: 0, y: 0, w: 0.3, h: 1 });
  });

  it('lists the most confident piece first and caps the list', () => {
    const raws = FURNITURE_IDS.map((id, i) =>
      det(FURNITURE[id].detectLabel, 0.2 + i * 0.01, { xmin: (i % 5) * 0.2, ymin: Math.floor(i / 5) * 0.2, xmax: (i % 5) * 0.2 + 0.1, ymax: Math.floor(i / 5) * 0.2 + 0.1 })
    );
    const out = postProcess(raws);
    expect(out.length).toBeLessThanOrEqual(10);
    expect(out[0].confidence).toBeGreaterThanOrEqual(out[1].confidence);
  });
});

describe('detectFurniture', () => {
  it('runs the detector with the labels and returns cleaned pieces', async () => {
    const run = vi.fn(async () => [det('sofa', 0.4)]);
    const out = await detectFurniture(new Blob(['x']), run);
    expect(run).toHaveBeenCalledWith(expect.any(Blob), DETECT_LABELS, undefined);
    expect(out.map((p) => p.kind)).toEqual(['sofa']);
  });
});

describe('search helpers', () => {
  it('builds a query from the style, palette and piece', () => {
    expect(buildSearchQuery('coffee-table', 'scandinavian')).toBe('scandinavian light oak coffee table');
    expect(buildSearchQuery('rug', null, 'warm')).toBe('warm area rug');
    expect(buildSearchQuery('sofa', 'custom')).toBe('sofa');
  });

  it('links to the shops with the query encoded', () => {
    const links = retailerLinks('light oak coffee table & tray');
    expect(links.map((l) => l.name)).toEqual(expect.arrayContaining(['IKEA', 'Wayfair', 'Target', 'Amazon', 'Google Shopping']));
    for (const l of links) {
      expect(l.url).toMatch(/^https:\/\//);
      expect(l.url).toContain('light%20oak%20coffee%20table%20%26%20tray');
    }
  });

  it.each([
    ['$1,299.00', 1299],
    ['$49', 49],
    ['USD 1 299,50', 1299],
    ['From $12.99 / month', 12.99],
    ['Free', null],
    ['', null],
    [null, null],
  ])('reads the price in "%s"', (text, expected) => {
    expect(parsePrice(text as string | null)).toBe(expected);
  });

  it('keeps only well-formed products from the network', () => {
    const out = sanitizeProducts([
      { title: 'Oak table', link: 'https://shop.example/oak', price: 120, priceText: '$120', source: 'Shop', imageUrl: 'https://img.example/a.jpg' },
      { title: 'No link' },
      { title: 'Bad link', link: 'javascript:alert(1)' },
      { title: 'Bad image', link: 'https://shop.example/x', imageUrl: 'data:text/html,<script>' },
      'nonsense',
      null,
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ title: 'Oak table', price: 120, imageUrl: 'https://img.example/a.jpg' });
    expect(out[1].imageUrl).toBeNull();
    expect(sanitizeProducts('x')).toEqual([]);
  });

  it('returns no live results when the search function is missing or fails', async () => {
    const notFound = vi.fn(async () => new Response('nope', { status: 404 })) as unknown as typeof fetch;
    expect(await searchProducts('sofa', undefined, notFound)).toEqual({ live: false, results: [] });
    const broken = vi.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    expect(await searchProducts('sofa', undefined, broken)).toEqual({ live: false, results: [] });
  });

  it('returns live results from the search function', async () => {
    const ok = vi.fn(async () => Response.json({ live: true, results: [{ title: 'Sofa', link: 'https://shop.example/s', priceText: '$800' }] })) as unknown as typeof fetch;
    const out = await searchProducts('sofa', undefined, ok);
    expect(out.live).toBe(true);
    expect(out.results[0]).toMatchObject({ title: 'Sofa', price: 800 });
  });
});

describe('estimates', () => {
  it('prices a premium style above a budget one', () => {
    expect(estimateRange('sofa', 'modern-luxury')[0]).toBeGreaterThan(estimateRange('sofa', 'minimalist')[1]);
    expect(estimateMid('sofa', null)).toBe(1350);
  });

  it('formats dollars', () => {
    expect(formatUsd(1299)).toBe('$1,299');
  });

  it('suggests pieces for the room', () => {
    expect(suggestPieces('bedroom')[0]).toBe('bed');
    expect(suggestPieces(null)).toEqual(ROOM_PIECES.other);
  });
});

describe('shopping list', () => {
  beforeEach(() => {
    localStorage.clear();
    useShoppingStore.setState({ items: [] });
  });

  const item = { kind: 'sofa' as const, title: 'Oak sofa', price: 800, estimated: false, source: 'Shop', link: 'https://shop.example/sofa', imageUrl: null };

  it('adds an item once and totals the prices', () => {
    const { add } = useShoppingStore.getState();
    expect(add(item)).toBe(true);
    expect(add(item)).toBe(false);
    expect(add({ ...item, kind: 'rug', title: 'Rug (estimate)', price: 250, estimated: true, link: null })).toBe(true);
    expect(shoppingTotal(useShoppingStore.getState().items)).toBe(1050);
  });

  it('removes and clears', () => {
    const { add, remove, clear } = useShoppingStore.getState();
    add(item);
    remove(useShoppingStore.getState().items[0].id);
    expect(useShoppingStore.getState().items).toHaveLength(0);
    add(item);
    clear();
    expect(useShoppingStore.getState().items).toHaveLength(0);
  });

  it('stops at the size limit', () => {
    const { add } = useShoppingStore.getState();
    for (let i = 0; i < MAX_ITEMS + 5; i++) add({ ...item, title: `Sofa ${i}`, link: `https://shop.example/${i}` });
    expect(useShoppingStore.getState().items).toHaveLength(MAX_ITEMS);
  });

  it('drops malformed items found in storage', () => {
    const out = cleanItems([
      { id: 'a', kind: 'sofa', title: 'ok', price: 10, estimated: false, source: null, link: null, imageUrl: null },
      { id: 'b', kind: 'spaceship', title: 'bad kind', price: 10 },
      { id: 'c', kind: 'rug', title: 'bad price', price: -4 },
      { id: 'd', kind: 'rug', title: 'bad link', price: 5, link: 'javascript:alert(1)' },
      7,
    ]);
    expect(out.map((i) => i.id)).toEqual(['a', 'd']);
    expect(out[1].link).toBeNull();
  });

  it('writes a plain-text list with the budget', () => {
    useShoppingStore.getState().add(item);
    const text = listAsText(useShoppingStore.getState().items, 800, 1000);
    expect(text).toContain('Oak sofa: $800');
    expect(text).toContain('Total: $800 of $1,000 budget');
  });
});
