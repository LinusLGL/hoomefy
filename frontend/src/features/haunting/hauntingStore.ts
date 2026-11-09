/**
 * Haunting store.
 *
 * Owns *only* presentation state for the haunted experience. It never touches
 * the auth, studio or toast stores, so a takeover cannot corrupt user data.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ExperienceName } from './palettes';

export type TakeoverReason = 'scroll' | 'mirror' | 'click' | 'replay';
export type SequenceState = 'idle' | 'running';
export type TakeoverPhase = 'none' | 'A' | 'B' | 'C' | 'D';

/** Number of mirror clicks that accelerate the reveal into the takeover. */
export const MIRROR_TOUCHES_TO_TRIGGER = 3;

export interface HauntingState {
  // Persisted
  experience: ExperienceName;
  horrorEnabled: boolean;
  takeoverSeen: boolean;
  /** Replace the system cursor with a candle in the Haunted experience. */
  candleCursor: boolean;
  /** Darken the room except for the candle's circle of light (needs the candle cursor). */
  candleDarkness: boolean;
  /** The haunted soundtrack (sting + ambient loop). Visitors can mute it; the choice is remembered. */
  audioEnabled: boolean;

  // Session only
  sequence: SequenceState;
  phase: TakeoverPhase;
  takeoverRequest: number;
  takeoverReason: TakeoverReason | null;
  skipRequest: number;
  mirrorTouches: number;
  /** True while any keyed activity (upload, generation) is in flight. */
  busy: boolean;
  busyKeys: string[];

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
  setCandleCursor: (enabled: boolean) => void;
  setCandleDarkness: (enabled: boolean) => void;
  /** Mark a named activity (e.g. "upload", "generation") as in flight or finished. */
  setBusy: (key: string, active: boolean) => void;
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
      candleCursor: true,
      candleDarkness: true,
      audioEnabled: true,

      sequence: 'idle',
      phase: 'none',
      takeoverRequest: 0,
      takeoverReason: null,
      skipRequest: 0,
      mirrorTouches: 0,
      busy: false,
      busyKeys: [],

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

      chooseElegant: () =>
        set({ experience: 'elegant', takeoverSeen: true, sequence: 'idle', phase: 'none' }),

      chooseHaunted: () =>
        set({
          experience: 'haunted',
          horrorEnabled: true,
          takeoverSeen: true,
          sequence: 'idle',
          phase: 'none',
        }),

      disableHorror: () =>
        // takeoverSeen is deliberately left untouched: someone who opts out before ever seeing
        // the reveal keeps a stable settings control, and gets the reveal if they opt back in.
        set({
          horrorEnabled: false,
          experience: 'elegant',
          sequence: 'idle',
          phase: 'none',
        }),

      enableHorror: () => set({ horrorEnabled: true }),

      replay: () => {
        set({
          horrorEnabled: true,
          experience: 'elegant',
          takeoverSeen: false,
          sequence: 'idle',
          phase: 'none',
        });
        get().requestTakeover('replay');
      },

      touchMirror: () => {
        const next = get().mirrorTouches + 1;
        set({ mirrorTouches: next });
        return next;
      },

      setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
      setCandleCursor: (candleCursor) => set({ candleCursor }),
      setCandleDarkness: (candleDarkness) => set({ candleDarkness }),
      setBusy: (key, active) => {
        const current = get().busyKeys;
        const has = current.includes(key);
        if (active === has) return;
        const next = active ? [...current, key] : current.filter((k) => k !== key);
        set({ busyKeys: next, busy: next.length > 0 });
      },
    }),
    {
      name: 'hoomefy_haunting',
      partialize: (s) => ({
        experience: s.experience,
        horrorEnabled: s.horrorEnabled,
        takeoverSeen: s.takeoverSeen,
        candleCursor: s.candleCursor,
        candleDarkness: s.candleDarkness,
        audioEnabled: s.audioEnabled,
      }),
    }
  )
);

export const useIsHaunted = (): boolean => useHauntingStore((s) => s.experience === 'haunted');
export const useHorrorEnabled = (): boolean => useHauntingStore((s) => s.horrorEnabled);
