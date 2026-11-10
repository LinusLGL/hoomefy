/**
 * Property-based tests for the shopping list (requirement R5 of .kiro/specs/studio-items).
 *
 * The list is changed by three kinds of action in any order: the visitor adds a piece, removes one, and a new design
 * replaces the lines the last design added. Whatever the order, a few rules must always hold.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { MAX_ITEMS, cleanItems, shoppingTotal, useShoppingStore, type ShoppingItem } from './shoppingStore';
import { FURNITURE_IDS } from './taxonomy';

type Line = Omit<ShoppingItem, 'id'>;

const kind = fc.constantFrom(...FURNITURE_IDS);
const line: fc.Arbitrary<Line> = fc.record({
  kind,
  title: fc.string({ minLength: 1, maxLength: 30 }),
  price: fc.integer({ min: 0, max: 5000 }),
  estimated: fc.boolean(),
  source: fc.constant(null),
  link: fc.option(fc.integer({ min: 0, max: 60 }).map((n) => `https://shop.example/${n}`), { nil: null }),
  imageUrl: fc.constant(null),
});

type Op = { type: 'add'; line: Line } | { type: 'remove'; at: number } | { type: 'replaceAuto'; lines: Line[] } | { type: 'clear' };

const op: fc.Arbitrary<Op> = fc.oneof(
  { weight: 4, arbitrary: line.map((l): Op => ({ type: 'add', line: l })) },
  { weight: 2, arbitrary: fc.nat(60).map((at): Op => ({ type: 'remove', at })) },
  { weight: 3, arbitrary: fc.array(line, { maxLength: 15 }).map((lines): Op => ({ type: 'replaceAuto', lines })) },
  { weight: 1, arbitrary: fc.constant<Op>({ type: 'clear' }) }
);

beforeEach(() => {
  localStorage.clear();
  useShoppingStore.setState({ items: [] });
});

describe('the shopping list (properties)', () => {
  it('never holds more than the limit, never repeats a line, and its total is the sum of its lines', () => {
    fc.assert(
      fc.property(fc.array(op, { maxLength: 60 }), (ops) => {
        useShoppingStore.setState({ items: [] });
        for (const o of ops) {
          const s = useShoppingStore.getState();
          if (o.type === 'add') s.add(o.line);
          else if (o.type === 'remove') s.remove(s.items[o.at % Math.max(1, s.items.length)]?.id ?? '');
          else if (o.type === 'replaceAuto') s.replaceAuto(o.lines);
          else s.clear();

          const { items } = useShoppingStore.getState();
          expect(items.length).toBeLessThanOrEqual(MAX_ITEMS);
          expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
          expect(shoppingTotal(items)).toBe(items.reduce((sum, i) => sum + i.price, 0));
        }
      }),
      { numRuns: 300 }
    );
  });

  it('a new design never removes or changes a line the visitor added', () => {
    fc.assert(
      fc.property(fc.array(line, { maxLength: 20 }), fc.array(fc.array(line, { maxLength: 15 }), { minLength: 1, maxLength: 5 }), (mine, designs) => {
        useShoppingStore.setState({ items: [] });
        for (const l of mine) useShoppingStore.getState().add(l);
        const kept = useShoppingStore.getState().items.map((i) => JSON.stringify(i));
        for (const lines of designs) useShoppingStore.getState().replaceAuto(lines);
        const after = useShoppingStore.getState().items.filter((i) => !i.auto).map((i) => JSON.stringify(i));
        expect(after).toEqual(kept);
      }),
      { numRuns: 300 }
    );
  });

  it('after a design, the automatic lines are exactly that design\'s lines (the last design replaces the one before)', () => {
    fc.assert(
      fc.property(fc.array(line, { maxLength: 12 }), fc.array(line, { maxLength: 12 }), (first, second) => {
        useShoppingStore.setState({ items: [] });
        useShoppingStore.getState().replaceAuto(first);
        useShoppingStore.getState().replaceAuto(second);
        const auto = useShoppingStore.getState().items.filter((i) => i.auto);
        const fromSecond = new Set(second.map((l) => `${l.kind}:${l.link ?? l.title}`));
        for (const item of auto) expect(fromSecond.has(item.id)).toBe(true);
        // With room to spare, every distinct line of the second design is there.
        expect(auto.length).toBe(fromSecond.size);
      }),
      { numRuns: 300 }
    );
  });

  it('reading the list back from storage keeps only valid lines, at most the limit', () => {
    fc.assert(
      fc.property(fc.oneof(fc.array(fc.anything(), { maxLength: 80 }), fc.anything()), (stored) => {
        const items = cleanItems(stored);
        expect(items.length).toBeLessThanOrEqual(MAX_ITEMS);
        for (const item of items) {
          expect(FURNITURE_IDS).toContain(item.kind);
          expect(item.price).toBeGreaterThanOrEqual(0);
          expect(item.title.length).toBeLessThanOrEqual(160);
          expect(item.link === null || /^https?:\/\//.test(item.link)).toBe(true);
          expect(item.imageUrl === null || /^https?:\/\//.test(item.imageUrl)).toBe(true);
          expect(item.auto === undefined || item.auto === true).toBe(true);
        }
      }),
      { numRuns: 400 }
    );
  });
});
