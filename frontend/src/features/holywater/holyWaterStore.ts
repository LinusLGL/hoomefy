/**
 * Holy water store.
 *
 * What the visitor has found and what has already happened is remembered for the tab session
 * (sessionStorage): a reload keeps the holy water and never repeats the scare, but a new tab or
 * visit starts fresh. The rest (which room is open, whether the bottle is picked up, which video
 * is playing) is transient and starts over on every load.
 *
 * Like the haunting store it owns presentation state only and never touches auth or studio data.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { isRoomId, type RoomId } from './rooms';

export const HOLY_WATER_STORAGE_KEY = 'hoomefy_holywater';

export type HolyWaterVideo = 'none' | 'scare' | 'cure';

export interface HolyWaterState {
  // Remembered for the tab session
  /** The room whose holy water was collected. One is enough. */
  foundIn: RoomId | null;
  /** The jumpscare has played (or was skipped): it never happens again this session. */
  scared: boolean;
  /** The ghost was dispersed and the site returned to Elegant. */
  cured: boolean;

  // Transient
  openRoom: RoomId | null;
  /** The bottle is picked up and waiting to be used on the ghost. */
  armed: boolean;
  video: HolyWaterVideo;

  openRoomViewer: (id: RoomId) => void;
  closeRoomViewer: () => void;
  collect: (id: RoomId) => boolean;
  setArmed: (armed: boolean) => void;
  markScared: () => void;
  startScare: () => void;
  /** Plays the jumpscare now, whether or not it has played before. False while a video is already playing. */
  scareNow: () => boolean;
  startCure: () => boolean;
  finishVideo: () => void;
  resetTransient: () => void;
  /** Start the hunt over: forget the holy water, the scare and the cure, and bring the ghost back. */
  resetAll: () => void;
  /** Bumped by every `resetAll`, so the ghost knows to make its entrance again. */
  resetCount: number;
}

const initialTransient = { openRoom: null, armed: false, video: 'none' } as const;

export const useHolyWaterStore = create<HolyWaterState>()(
  persist(
    (set, get) => ({
      foundIn: null,
      scared: false,
      cured: false,
      ...initialTransient,

      openRoomViewer: (id) => set({ openRoom: id }),
      closeRoomViewer: () => set({ openRoom: null }),

      collect: (id) => {
        const s = get();
        if (s.foundIn || s.cured) return false;
        set({ foundIn: id });
        return true;
      },

      setArmed: (armed) => set({ armed: armed && !!get().foundIn && get().video === 'none' }),

      markScared: () => set({ scared: true }),

      startScare: () => {
        const s = get();
        if (s.scared || s.video !== 'none') return;
        // `scared` is set as the video starts, so a reload in the middle of it cannot repeat it.
        set({ scared: true, video: 'scare', openRoom: null, armed: false });
      },

      // The visitor pressed the mirror in Haunted: the scare plays every time they ask, not once a session.
      scareNow: () => {
        if (get().video !== 'none') return false;
        set({ scared: true, video: 'scare', openRoom: null, armed: false });
        return true;
      },

      startCure: () => {
        const s = get();
        if (!s.foundIn || s.cured || s.video === 'cure') return false;
        set({ video: 'cure', armed: false, openRoom: null });
        return true;
      },

      finishVideo: () => {
        const was = get().video;
        set(was === 'cure' ? { video: 'none', cured: true } : { video: 'none' });
      },

      resetTransient: () => set({ ...initialTransient }),

      resetCount: 0,
      resetAll: () =>
        set((s) => ({ foundIn: null, scared: false, cured: false, ...initialTransient, resetCount: s.resetCount + 1 })),
    }),
    {
      name: HOLY_WATER_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ foundIn: s.foundIn, scared: s.scared, cured: s.cured }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Pick<HolyWaterState, 'foundIn' | 'scared' | 'cured'>>;
        return {
          ...current,
          foundIn: isRoomId(p.foundIn) ? p.foundIn : null,
          scared: p.scared === true,
          cured: p.cured === true,
        };
      },
    }
  )
);

/** True while a full-screen video is playing, so the soundtrack stays quiet. */
export const useMediaPlaying = (): boolean => useHolyWaterStore((s) => s.video !== 'none');
