/**
 * The candle ritual, as plain data.
 *
 * Five candles stand in the circle. The visitor lights them in any order. What is said and heard depends on
 * HOW MANY are lit, not on which one was touched: the first flame lit speaks the first words, the second the
 * second, and so on, so the five lines always read in order. Lighting the fifth completes the ritual.
 */

import { CANDLES, CANDLE_SOUNDS, type CandleId } from './geometry';

export const RITUAL_MESSAGES: readonly string[] = [
  'By the first flame, awaken the secrets buried beneath these walls.',
  'By the second flame, bind the restless echoes wandering between worlds.',
  'By the third flame, purge the darkness from every forgotten memory.',
  'By the fourth flame, let all corrupted spirits dissolve into eternal silence.',
  'By the fifth and final flame, the power of the circle COMPELS YOU!',
];

export const CANDLE_COUNT = CANDLES.length;

/** Shown before any candle is lit. */
export const RITUAL_INTRO = 'Five flames wait in the circle. Touch any one of them to wake it.';

export interface RitualState {
  /** The candles that are lit, in the order they were lit. */
  lit: readonly CandleId[];
}

export const freshRitual = (): RitualState => ({ lit: [] });

export const isLit = (state: RitualState, id: CandleId): boolean => state.lit.includes(id);

export const isComplete = (state: RitualState): boolean => state.lit.length >= CANDLE_COUNT;

/** Light a candle. Lighting one that is already lit changes nothing. */
export function lightCandle(state: RitualState, id: CandleId): RitualState {
  if (isLit(state, id) || isComplete(state)) return state;
  return { lit: [...state.lit, id] };
}

/** The words for the flame that was just lit (1 to 5), or null when none is lit yet. */
export function messageFor(state: RitualState): string | null {
  return state.lit.length === 0 ? null : (RITUAL_MESSAGES[state.lit.length - 1] ?? null);
}

/** The recording that goes with the flame that was just lit. */
export function soundFor(state: RitualState): string | null {
  return state.lit.length === 0 ? null : (CANDLE_SOUNDS[state.lit.length - 1] ?? null);
}
