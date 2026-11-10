export { BoardBackdrop } from './BoardBackdrop';
export { PolaroidStage, type StageState } from './PolaroidStage';
export { CandleRitual } from './CandleRitual';
export { BEGIN_READY, BEGIN_WAITING, NOT_READY_BODY, NOT_READY_TITLE, STAGE_LINES } from './copy';
export { CANDLES, CANDLE_SOUNDS, BOARD, CHAMBER } from './geometry';
export { RITUAL_MESSAGES, waitStatus } from './ritualState';

/** Fetch the chamber pictures ahead of time so the ritual opens without a wait. */
export function preloadRitualAssets(sources: readonly string[]): void {
  if (typeof Image === 'undefined') return;
  for (const src of sources) {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  }
}
