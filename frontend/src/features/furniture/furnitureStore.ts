/**
 * What the on-device detector found in the design currently on the canvas, and which piece is selected.
 * Shared by the canvas (which draws the boxes) and the furniture panel (which lists them).
 */

import { create } from 'zustand';
import type { DetectedPiece } from './detect';
import type { FurnitureKindId } from './taxonomy';

export type DetectStatus = 'idle' | 'loading' | 'detecting' | 'done' | 'error';

interface FurnitureState {
  /** The design version the pieces belong to. */
  versionId: string | null;
  pieces: DetectedPiece[];
  status: DetectStatus;
  percent: number;
  error: string | null;
  selected: FurnitureKindId | null;
  showBoxes: boolean;

  setStatus: (status: DetectStatus, percent?: number) => void;
  finish: (versionId: string, pieces: DetectedPiece[]) => void;
  fail: (message: string) => void;
  select: (kind: FurnitureKindId | null) => void;
  setShowBoxes: (show: boolean) => void;
  reset: () => void;
}

export const useFurnitureStore = create<FurnitureState>((set) => ({
  versionId: null,
  pieces: [],
  status: 'idle',
  percent: 0,
  error: null,
  selected: null,
  showBoxes: true,

  setStatus: (status, percent = 0) => set({ status, percent, error: null }),
  finish: (versionId, pieces) => set({ versionId, pieces, status: 'done', percent: 100, error: null }),
  fail: (message) => set({ status: 'error', error: message }),
  select: (kind) => set({ selected: kind }),
  setShowBoxes: (show) => set({ showBoxes: show }),
  reset: () => set({ versionId: null, pieces: [], status: 'idle', percent: 0, error: null, selected: null }),
}));
