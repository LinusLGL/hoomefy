/**
 * What was found in the design currently on the canvas, what each piece costs, and which piece is selected.
 * Shared by the canvas (which draws the boxes the on-device detector gives), the summary, the furniture panel
 * and the shopping list.
 */

import { create } from 'zustand';
import type { DesignItem, ItemPrices } from './items';

export type ScanStatus = 'idle' | 'loading' | 'detecting' | 'searching' | 'done' | 'error';

/** Where the items came from: the site's own detector, or the one that runs in this browser. */
export type ScanSource = 'cloud' | 'device';

interface FurnitureState {
  /** The design version the items belong to. */
  versionId: string | null;
  items: DesignItem[];
  prices: Record<string, ItemPrices>;
  status: ScanStatus;
  source: ScanSource | null;
  /** 0 to 100 while the on-device model downloads. */
  percent: number;
  error: string | null;
  selected: string | null;
  showBoxes: boolean;

  /** A scan of this design has started. */
  begin: (versionId: string, source: ScanSource) => void;
  setStatus: (status: ScanStatus, percent?: number) => void;
  setItems: (versionId: string, items: DesignItem[]) => void;
  setPrices: (versionId: string, itemId: string, prices: ItemPrices) => void;
  finish: (versionId: string) => void;
  fail: (versionId: string, message: string) => void;
  select: (itemId: string | null) => void;
  setShowBoxes: (show: boolean) => void;
  reset: () => void;
}

const empty = {
  versionId: null,
  items: [] as DesignItem[],
  prices: {} as Record<string, ItemPrices>,
  status: 'idle' as ScanStatus,
  source: null as ScanSource | null,
  percent: 0,
  error: null as string | null,
  selected: null as string | null,
};

export const useFurnitureStore = create<FurnitureState>((set, get) => ({
  ...empty,
  showBoxes: true,

  begin: (versionId, source) => set({ ...empty, versionId, source, status: source === 'device' ? 'loading' : 'detecting' }),
  setStatus: (status, percent = 0) => set({ status, percent, error: null }),
  // Late answers for a design that is no longer on the canvas are ignored.
  setItems: (versionId, items) => {
    if (get().versionId !== versionId) return;
    set({ items, prices: {}, selected: null, status: 'searching', percent: 100, error: null });
  },
  setPrices: (versionId, itemId, prices) => {
    if (get().versionId !== versionId) return;
    set({ prices: { ...get().prices, [itemId]: prices } });
  },
  finish: (versionId) => {
    if (get().versionId !== versionId) return;
    set({ status: 'done', percent: 100, error: null });
  },
  fail: (versionId, message) => {
    if (get().versionId !== versionId) return;
    set({ status: 'error', error: message });
  },
  select: (itemId) => set({ selected: itemId }),
  setShowBoxes: (show) => set({ showBoxes: show }),
  reset: () => set({ ...empty }),
}));
