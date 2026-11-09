/**
 * Spirit rules (pure, no React, no storage).
 *
 * Every haunted room holds 1-3 spirits. Each spirit is bound to one category of
 * furniture. Replace that furniture and the spirit is driven out. A room with no
 * spirits left is cleared; a house with every room cleared is built.
 */

import type { FurnitureKey, RoomType } from '@/types';
import { seeded } from '@/features/haunting/env';

export interface FurnitureInfo {
  key: FurnitureKey;
  label: string;
  /** What the lingering spirit is called. */
  spirit: string;
  /** Used in the generation instruction sentence. */
  phrase: string;
}

export const FURNITURE: readonly FurnitureInfo[] = [
  { key: 'seating', label: 'Sofas & seating', spirit: 'The Lady on the Settee', phrase: 'sofas and seating' },
  { key: 'bed', label: 'Bed & bedding', spirit: 'The Sleeper', phrase: 'the bed and bedding' },
  { key: 'tables', label: 'Tables', spirit: 'The Dinner Guest', phrase: 'tables' },
  { key: 'lighting', label: 'Lamps & lighting', spirit: 'The Lamplighter', phrase: 'lamps and lighting' },
  { key: 'storage', label: 'Cabinets & shelves', spirit: 'The Keeper of Keys', phrase: 'cabinets and shelves' },
  { key: 'rugs', label: 'Rugs & curtains', spirit: 'The Watcher at the Curtain', phrase: 'rugs and curtains' },
  { key: 'decor', label: 'Mirrors & art', spirit: 'The Face in the Glass', phrase: 'mirrors and wall art' },
];

export const furnitureInfo = (key: FurnitureKey): FurnitureInfo => FURNITURE.find((f) => f.key === key) as FurnitureInfo;

/** Which furniture makes sense in each kind of room (and so which spirits can live there). */
export const ROOM_FURNITURE: Record<RoomType, readonly FurnitureKey[]> = {
  'living-room': ['seating', 'tables', 'lighting', 'rugs', 'decor', 'storage'],
  bedroom: ['bed', 'lighting', 'storage', 'rugs', 'decor'],
  kitchen: ['tables', 'storage', 'lighting', 'rugs'],
  'dining-room': ['tables', 'seating', 'lighting', 'decor', 'rugs'],
  office: ['tables', 'seating', 'storage', 'lighting'],
  bathroom: ['decor', 'lighting', 'storage', 'rugs'],
  other: ['seating', 'tables', 'lighting', 'storage', 'decor', 'rugs'],
};

/** All 7 room slots of a house, in display order. */
export const ROOM_SLOTS: readonly RoomType[] = ['living-room', 'bedroom', 'kitchen', 'dining-room', 'office', 'bathroom', 'other'];

/** FNV-1a, so the same photo + room always receives the same spirits. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministically choose which furniture the spirits of a room are bound to. */
export function seedSpirits(seed: string, roomType: RoomType): FurnitureKey[] {
  const candidates = [...ROOM_FURNITURE[roomType]];
  const rnd = seeded(hashString(`${roomType}:${seed}`));
  const count = Math.min(candidates.length, 1 + Math.floor(rnd() * 3));
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, count);
}

export interface Replacement {
  driven: FurnitureKey[];
  remaining: FurnitureKey[];
}

/** Spirits bound to a replaced category leave; the rest stay. */
export function applyReplacement(spirits: readonly FurnitureKey[], replaced: readonly FurnitureKey[]): Replacement {
  const set = new Set(replaced);
  return {
    driven: spirits.filter((s) => set.has(s)),
    remaining: spirits.filter((s) => !set.has(s)),
  };
}

/** Maximum custom-instruction length accepted by the generation API. */
export const MAX_INSTRUCTIONS = 500;

/**
 * Append the furniture request to the user's own instructions without ever
 * exceeding the API limit. The furniture sentence is kept whole; the user's text is
 * trimmed if necessary.
 */
export function composeInstructions(base: string | undefined, replaced: readonly FurnitureKey[]): string | undefined {
  const user = (base ?? '').trim();
  if (replaced.length === 0) return user || undefined;
  const sentence = `Replace the existing ${replaced.map((k) => furnitureInfo(k).phrase).join(', ')} with pieces that suit the chosen style.`;
  if (!user) return sentence.slice(0, MAX_INSTRUCTIONS);
  const room = MAX_INSTRUCTIONS - sentence.length - 1;
  if (room <= 0) return sentence.slice(0, MAX_INSTRUCTIONS);
  return `${user.slice(0, room).trimEnd()} ${sentence}`;
}

/** Floating ghosts: one per uncleared room (max 3), and always at least one. */
export function ghostCount(unclearedRooms: number): number {
  return unclearedRooms <= 0 ? 1 : Math.min(3, unclearedRooms);
}
