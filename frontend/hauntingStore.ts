/**
 * Haunting store.
 *
 * Owns *only* presentation state for the haunted experience. It never touches
 * the auth, studio or toast stores, so a takeover cannot corrupt user data.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ExperienceName } from './palettes';

export type TakeoverReason = 'scroll' | 'mirror' | 'replay';
export type SequenceState = 'idle' | 'running';
export type TakeoverPhase = 'none' | 'A' | 'B' | 'C' | 'D';

/** Number of mirror clicks that accelerate the reveal into the takeover. */
export const MIRROR_TOUCHES_TO_TRIGGER = 3;

export interface HauntingState {
  // Persisted
  experience: ExperienceName;
  horrorEnabled: boolean;
  takeoverSeen: boolean;

  // Session only
  sequence: SequenceState;
  phase: TakeoverPhase;
  takeoverRequest: number;
  takeoverReason: TakeoverReason | null;
  skipRequest: number;
  mirrorTouches: number;
  audioEnabled: boolean;
  /** Set by the app while an upload or generation is in flight. */
  busy: boolean;

  // Actions
  requestTakeover: (reason: TakeoverReason) => boolean;
  requestSkip: () => void;
  beginSequence: () => void;
  setPhase: (phase: TakeoverPhase) => void;
  setExperience: (experience: ExperienceName) => void;
  finishTakeover: () => void;
  chooseElegant: () => void;
  chooseHaunted: () => void;
  disableHorror: () => void;
  enableHorror: () => void;
  replay: () => void;
  touchMirror: () => number;
  setAudioEnabled: (enabled: boolean) => void;
  setBusy: (busy: boolean) => void;
}

type AutoGate = Pick<HauntingState, 'horrorEnabled' | 'takeoverSeen' | 'experience' | 'sequence'>;

/** An automatic reveal is only allowed once, for opted-in visitors, from Elegant. */
export function canAutoTakeover(s: AutoGate): boolean {
  return s.horrorEnabled && !s.takeoverSeen && s.experience === 'elegant' && s.sequence === 'idle';
}

export const useHauntingStore = create<HauntingState>()(
  persist(
    (set, get) => ({
      experience: 'elegant',
      horrorEnabled: true,
      takeoverSeen: false,

      sequence: 'idle',
      phase: 'none',
      takeoverRequest: 0,
      takeoverReason: null,
      skipRequest: 0,
      mirrorTouches: 0,
      audioEnabled: false,
      busy: false,

      requestTakeover: (reason) => {
        const s = get();
        if (s.sequence !== 'idle') return false;
        // Scroll and mirror reveals are automatic; replay is a deliberate user action.
        if (reason !== 'replay' && !canAutoTakeover(s)) return false;
        set({ takeoverRequest: s.takeoverRequest + 1, takeoverReason: reason });
        return true;
      },

      requestSkip: () => {
        if (get().sequence === 'running') set((s) => ({ skipRequest: s.skipRequest + 1 }));
      },

      beginSequence: () => set({ sequence: 'running', phase: 'A' }),

      setPhase: (phase) => set({ phase }),

      setExperience: (experience) => set({ experience }),

      finishTakeover: () =>
        set({ experience: 'haunted', takeoverSeen: true, sequence: 'idle', phase: 'none', mirrorTouches: 0 }),

      chooseElegant: () => set({ experience: 'elegant', takeoverSeen: true, sequence: 'idle', phase: 'none' }),

      chooseHaunted: () =>
        set({ experience: 'haunted', horrorEnabled: true, takeoverSeen: true, sequence: 'idle', phase: 'none' }),

      disableHorror: () =>
        set({ horrorEnabled: false, experience: 'elegant', takeoverSeen: true, sequence: 'idle', phase: 'none', audioEnabled: false }),

      enableHorror: () => set({ horrorEnabled: true }),

      replay: () => {
        set({ horrorEnabled: true, experience: 'elegant', takeoverSeen: false, sequence: 'idle', phase: 'none' });
        get().requestTakeover('replay');
      },

      touchMirror: () => {
        const next = get().mirrorTouches + 1;
        set({ mirrorTouches: next });
        return next;
      },

      setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
      setBusy: (busy) => set({ busy }),
    }),
    {
      name: 'hoomefy_haunting',
      partialize: (s) => ({
        experience: s.experience,
        horrorEnabled: s.horrorEnabled,
        takeoverSeen: s.takeoverSeen,
      }),
    }
  )
);

export const useIsHaunted = (): boolean => useHauntingStore((s) => s.experience === 'haunted');
export const useHorrorEnabled = (): boolean => useHauntingStore((s) => s.horrorEnabled);
