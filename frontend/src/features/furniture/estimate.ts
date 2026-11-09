import type { RoomType, DesignStyle } from '@/types';
import { STYLES } from '@/features/studio/styles';
import { FURNITURE, ROOM_PIECES, midpoint, type FurnitureKindId, type PriceRange } from './taxonomy';

/** Rough price range for a piece in a style, or in the middle tier when no style is chosen. */
export function estimateRange(kindId: FurnitureKindId, style: DesignStyle | null): PriceRange {
  const tier = style ? STYLES[style].tier : 'mid';
  return FURNITURE[kindId].price[tier];
}

export const estimateMid = (kindId: FurnitureKindId, style: DesignStyle | null): number => midpoint(estimateRange(kindId, style));

/** Pieces that suit this room, shown straight away before (or without) any on-device detection. */
export function suggestPieces(roomType: RoomType | null): FurnitureKindId[] {
  return ROOM_PIECES[roomType ?? 'other'];
}

export const formatUsd = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

/** The detector's raw scores are low even for clear objects, so show plain bands instead of a percentage. */
export function matchLabel(score: number): string {
  if (score >= 0.25) return 'Strong match';
  if (score >= 0.15) return 'Likely';
  return 'Possible';
}
