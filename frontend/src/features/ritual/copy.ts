/**
 * The Haunted studio's words around the board and the ritual. Mori's voice: helpful, a little unsettling, never silly.
 */

import type { StageState } from './PolaroidStage';

/** The line written on the polaroid's strip for each moment. */
export const STAGE_LINES: Record<StageState, string> = {
  empty: 'Lay a photograph of the room here.',
  photo: 'Name the room and choose a style. The candles are waiting.',
  ready: 'Touch the photograph to light the five flames.',
  working: 'Do not look away. It is developing.',
};

/** Shown on the photograph when it is ready for the ritual, and when it is not. */
export const BEGIN_READY = 'Light the candles';
export const BEGIN_WAITING = 'Name the room and style first';

/** The guide for the extra-instructions box: what to whisper to the spirits. */
export const WHISPER_LABEL = 'Whisper your wishes';
export const WHISPER_PLACEHOLDER = 'e.g. let the moonlight in, keep the fireplace, no mirrors';
export const WHISPER_INTRO = 'The spirits hear plain words. Say what to keep, what to change, and how the room should feel.';
export const WHISPERS: readonly string[] = [
  'Let the moonlight spill through the windows',
  'Warm lamps, like candles in the dark',
  'Keep the fireplace exactly as it is',
  'Heavy velvet curtains and old books',
];

/** Tell the spirits what they cannot do yet. */
export const NOT_READY_TITLE = 'The flames are not ready';
export const NOT_READY_BODY = 'Name the kind of room and choose a style (or describe one), then touch the photograph again.';
