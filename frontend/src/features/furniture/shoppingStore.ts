/**
 * The shopping list: the products (or estimates) a visitor has picked for their design.
 * Kept in this browser only; saving a design to an account stores a copy with it.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isFurnitureKind, type FurnitureKindId } from './taxonomy';
import { formatUsd } from './estimate';

export interface ShoppingItem {
  id: string;
  kind: FurnitureKindId;
  title: string;
  /** US dollars. An estimate when `estimated` is true. */
  price: number;
  estimated: boolean;
  source: string | null;
  link: string | null;
  imageUrl: string | null;
}

export const MAX_ITEMS = 40;
export const SHOPPING_STORAGE_KEY = 'hoomefy_shopping';

interface ShoppingState {
  items: ShoppingItem[];
  add: (item: Omit<ShoppingItem, 'id'>) => boolean;
  remove: (id: string) => void;
  clear: () => void;
}

const idFor = (item: Omit<ShoppingItem, 'id'>) => `${item.kind}:${item.link ?? item.title}`;

const isUrl = (v: unknown): v is string => typeof v === 'string' && /^https?:\/\//.test(v);

/** Drops anything malformed that may have been left in storage. */
export function cleanItems(input: unknown): ShoppingItem[] {
  if (!Array.isArray(input)) return [];
  const out: ShoppingItem[] = [];
  for (const raw of input) {
    const r = raw as Partial<ShoppingItem> | null;
    if (!r || typeof r !== 'object' || typeof r.id !== 'string' || !isFurnitureKind(r.kind) || typeof r.title !== 'string') continue;
    if (typeof r.price !== 'number' || !(r.price >= 0)) continue;
    out.push({
      id: r.id,
      kind: r.kind,
      title: r.title.slice(0, 160),
      price: r.price,
      estimated: r.estimated === true,
      source: typeof r.source === 'string' ? r.source.slice(0, 60) : null,
      link: isUrl(r.link) ? r.link : null,
      imageUrl: isUrl(r.imageUrl) ? r.imageUrl : null,
    });
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

export const useShoppingStore = create<ShoppingState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => {
        const id = idFor(item);
        const { items } = get();
        if (items.some((i) => i.id === id) || items.length >= MAX_ITEMS) return false;
        set({ items: [...items, { ...item, id }] });
        return true;
      },
      remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
      clear: () => set({ items: [] }),
    }),
    {
      name: SHOPPING_STORAGE_KEY,
      version: 1,
      partialize: (s) => ({ items: s.items }),
      merge: (persisted, current) => ({ ...current, items: cleanItems((persisted as { items?: unknown } | undefined)?.items) }),
    }
  )
);

export const shoppingTotal = (items: ShoppingItem[]): number => items.reduce((sum, i) => sum + i.price, 0);

export function listAsText(items: ShoppingItem[], total: number, budget?: number): string {
  const lines = items.map((i) => `- ${i.title}: ${formatUsd(i.price)}${i.estimated ? ' (estimate)' : ''}${i.link ? ` ${i.link}` : ''}`);
  lines.push('', `Total: ${formatUsd(total)}${budget ? ` of ${formatUsd(budget)} budget` : ''}`);
  return ['Hoomefy shopping list', '', ...lines].join('\n');
}
