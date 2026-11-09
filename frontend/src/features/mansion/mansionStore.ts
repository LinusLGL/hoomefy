/**
 * Mansion store: houses, rooms and the spirits still bound to their furniture.
 *
 * Local to the browser for now (the backend does not exist yet); everything the UI
 * needs is behind these actions, so a server implementation can replace it later.
 * It never touches the auth, studio or haunting stores.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FurnitureKey, RoomType } from '@/types';
import { ROOM_FURNITURE, ROOM_SLOTS, applyReplacement, seedSpirits } from './spirits';

export interface RoomState {
  /** Spirits still lingering (bound to these furniture categories). */
  spirits: FurnitureKey[];
  /** Spirits the room started with. */
  initial: FurnitureKey[];
  cleared: boolean;
}

export interface House {
  id: string;
  name: string;
  rooms: Partial<Record<RoomType, RoomState>>;
  builtAt?: string;
}

export interface JobOutcome {
  jobId: string;
  roomType: RoomType;
  driven: FurnitureKey[];
  remaining: FurnitureKey[];
  roomCleared: boolean;
  houseBuilt: boolean;
}

interface MansionState {
  houses: House[];
  activeId: string;
  /** Jobs already applied, so a job can never clear spirits twice. */
  appliedJobs: string[];

  /** Give a room its spirits the first time it is photographed. Idempotent. */
  registerRoom: (roomType: RoomType, seed: string) => void;
  /** Apply a *completed* generation. Returns null if this job was already applied. */
  applyJob: (jobId: string, roomType: RoomType, replaced: readonly FurnitureKey[]) => JobOutcome | null;
  buildNextHouse: () => void;
  reset: () => void;
}

const MAX_APPLIED = 100;

export const houseName = (index: number): string => (index === 0 ? 'The First House' : `House ${index + 1}`);

const newHouse = (index: number): House => ({ id: `house-${index + 1}`, name: houseName(index), rooms: {} });

const initial = (): Pick<MansionState, 'houses' | 'activeId' | 'appliedJobs'> => ({
  houses: [newHouse(0)],
  activeId: 'house-1',
  appliedJobs: [],
});

export function activeHouse(s: Pick<MansionState, 'houses' | 'activeId'>): House {
  return s.houses.find((h) => h.id === s.activeId) ?? s.houses[0];
}

/** Rooms of a house that are not cleared (rooms never photographed count as haunted). */
export function unclearedCount(house: House): number {
  return ROOM_SLOTS.filter((slot) => !house.rooms[slot]?.cleared).length;
}

export function clearedCount(house: House): number {
  return ROOM_SLOTS.length - unclearedCount(house);
}

export const isHouseBuilt = (house: House): boolean => unclearedCount(house) === 0;

export const useMansionStore = create<MansionState>()(
  persist(
    (set, get) => ({
      ...initial(),

      registerRoom: (roomType, seed) => {
        const state = get();
        const house = activeHouse(state);
        if (house.rooms[roomType]) return;
        const spirits = seedSpirits(seed, roomType);
        set({
          houses: state.houses.map((h) =>
            h.id === house.id ? { ...h, rooms: { ...h.rooms, [roomType]: { spirits, initial: spirits, cleared: false } } } : h
          ),
        });
      },

      applyJob: (jobId, roomType, replaced) => {
        const state = get();
        if (state.appliedJobs.includes(jobId)) return null;

        const house = activeHouse(state);
        const allowed = new Set(ROOM_FURNITURE[roomType]);
        const room = house.rooms[roomType];
        const wasBuilt = isHouseBuilt(house);

        // A room that was never registered has no spirits to drive out.
        const { driven, remaining } = room
          ? applyReplacement(room.spirits, replaced.filter((k) => allowed.has(k)))
          : { driven: [] as FurnitureKey[], remaining: [] as FurnitureKey[] };
        const roomCleared = !!room && remaining.length === 0;

        const nextRoom: RoomState | undefined = room ? { ...room, spirits: remaining, cleared: roomCleared } : undefined;
        const houses = state.houses.map((h) => {
          if (h.id !== house.id || !nextRoom) return h;
          const updated: House = { ...h, rooms: { ...h.rooms, [roomType]: nextRoom } };
          if (isHouseBuilt(updated) && !updated.builtAt) updated.builtAt = new Date().toISOString();
          return updated;
        });

        const updatedHouse = houses.find((h) => h.id === house.id) as House;
        set({ houses, appliedJobs: [...state.appliedJobs, jobId].slice(-MAX_APPLIED) });

        return { jobId, roomType, driven, remaining, roomCleared, houseBuilt: !wasBuilt && isHouseBuilt(updatedHouse) };
      },

      buildNextHouse: () => {
        const state = get();
        if (!isHouseBuilt(activeHouse(state))) return; // only a finished house can be followed by another
        const index = state.houses.length;
        const next = newHouse(index);
        set({ houses: [...state.houses, next], activeId: next.id });
      },

      reset: () => set(initial()),
    }),
    {
      name: 'hoomefy_mansion',
      partialize: (s) => ({ houses: s.houses, activeId: s.activeId, appliedJobs: s.appliedJobs }),
    }
  )
);

/** Number of uncleared rooms in the active house (selector for components). */
export const useUnclearedRooms = (): number => useMansionStore((s) => unclearedCount(activeHouse(s)));
