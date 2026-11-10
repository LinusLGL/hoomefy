/**
 * Looking through a finished design: find the furniture and decor in it, look each piece up in the shops, then
 * fill the shopping list. It runs by itself when a design is ready (see StudioPage) and can be run again by hand.
 *
 *   1. Find: the site's detector names the pieces (or, on request, the one that runs on this device).
 *   2. Search: each piece's shop words go to the product search, three at a time. Where the search is not set up
 *      or finds nothing, the piece keeps a typical price for the style, marked as an estimate.
 *   3. List: one line per piece goes on the shopping list, replacing the lines the previous design added.
 *
 * Every step writes to the stores only while its design is still the one on the canvas.
 */

import type { DesignStyle } from '@/types';
import { estimateMid } from './estimate';
import { detectFurniture } from './detect';
import { DetectError, detectItemsInCloud } from './detectApi';
import { useFurnitureStore, type ScanSource } from './furnitureStore';
import { itemsFromPieces, pickPrice, type DesignItem, type ItemPrices } from './items';
import { searchProducts, type LiveSearchResult } from './search';
import { useShoppingStore, type ShoppingItem } from './shoppingStore';
import { runWithTransformers } from './transformersRunner';

export interface ScanTarget {
  /** The design version being looked through. */
  id: string;
  blob: Blob;
  style: DesignStyle;
}

export interface ScanDeps {
  cloud: (target: ScanTarget, signal: AbortSignal) => Promise<DesignItem[]>;
  device: (target: ScanTarget, signal: AbortSignal) => Promise<DesignItem[]>;
  search: (query: string, signal: AbortSignal) => Promise<LiveSearchResult>;
}

export interface ScanOptions {
  method?: ScanSource;
  /** Look again even when this design has already been looked through. */
  force?: boolean;
  /** Replaced in tests. */
  deps?: Partial<ScanDeps>;
}

/** How many shop searches run at the same time. */
export const SEARCH_CONCURRENCY = 3;

const DEFAULT_DEPS: ScanDeps = {
  cloud: (target, signal) => detectItemsInCloud(target.blob, target.id, { signal, style: target.style }),
  device: async (target, signal) => {
    const pieces = await detectFurniture(target.blob, runWithTransformers, (p) => {
      if (signal.aborted) return;
      useFurnitureStore.getState().setStatus(p.stage === 'loading' ? 'loading' : 'detecting', p.percent ?? 0);
    });
    return itemsFromPieces(pieces, target.id, target.style);
  },
  search: (query, signal) => searchProducts(query, signal),
};

let current: { id: string; controller: AbortController } | null = null;

/** Forgets the current scan, for a new photograph or a fresh start. */
export function resetScan(): void {
  current?.controller.abort();
  current = null;
  useFurnitureStore.getState().reset();
}

const messageFor = (err: unknown, method: ScanSource): string => {
  if (err instanceof DetectError) return err.message;
  return method === 'device'
    ? 'The finder that runs on this device could not start in this browser.'
    : 'We could not look through your design just now.';
};

async function runPool<T>(values: T[], size: number, work: (value: T) => Promise<void>): Promise<void> {
  let next = 0;
  const lane = async () => {
    while (next < values.length) {
      const value = values[next++];
      await work(value);
    }
  };
  await Promise.all(Array.from({ length: Math.min(size, values.length) }, lane));
}

/** One shopping-list line for each piece: a real product when the shops listed one, otherwise an estimate. */
export function listLinesFor(items: DesignItem[], prices: Record<string, ItemPrices>, style: DesignStyle): Array<Omit<ShoppingItem, 'id'>> {
  return items.map((item) => {
    const pick = pickPrice(item, prices[item.id], style);
    if (pick.product) {
      return {
        kind: item.kind,
        title: pick.product.title,
        price: pick.price,
        estimated: false,
        source: pick.product.source,
        link: pick.product.link,
        imageUrl: pick.product.imageUrl,
      };
    }
    return { kind: item.kind, title: `${item.name} (estimate)`, price: estimateMid(item.kind, style), estimated: true, source: null, link: null, imageUrl: null };
  });
}

export async function scanDesign(target: ScanTarget, options: ScanOptions = {}): Promise<void> {
  const method = options.method ?? 'cloud';
  if (!options.force && current?.id === target.id) return;

  current?.controller.abort();
  const controller = new AbortController();
  current = { id: target.id, controller };
  const { signal } = controller;
  const deps: ScanDeps = { ...DEFAULT_DEPS, ...options.deps };
  const store = useFurnitureStore.getState();

  store.begin(target.id, method);
  let items: DesignItem[];
  try {
    items = await (method === 'device' ? deps.device : deps.cloud)(target, signal);
  } catch (err) {
    if (signal.aborted || (err instanceof DetectError && err.code === 'aborted')) return;
    useFurnitureStore.getState().fail(target.id, messageFor(err, method));
    return;
  }
  if (signal.aborted) return;

  useFurnitureStore.getState().setItems(target.id, items);
  await runPool(items, SEARCH_CONCURRENCY, async (item) => {
    useFurnitureStore.getState().setPrices(target.id, item.id, { status: 'searching', live: false, results: [] });
    const found = await deps.search(item.query, signal).catch(() => ({ live: false, results: [] }) as LiveSearchResult);
    if (signal.aborted) return;
    useFurnitureStore.getState().setPrices(target.id, item.id, { status: 'done', live: found.live, results: found.results });
  });
  if (signal.aborted) return;

  const state = useFurnitureStore.getState();
  if (state.versionId !== target.id) return;
  useShoppingStore.getState().replaceAuto(listLinesFor(items, state.prices, target.style));
  state.finish(target.id);
}
