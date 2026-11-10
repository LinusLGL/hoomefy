import { describe, it, expect } from 'vitest';
import { CANDLES, CANDLE_SOUNDS, type CandleId } from './geometry';
import { CANDLE_COUNT, RITUAL_MESSAGES, freshRitual, isComplete, isLit, lightCandle, messageFor, soundFor, type RitualState } from './ritualState';

const ids = CANDLES.map((c) => c.id);

const lightAll = (order: readonly CandleId[]): RitualState => order.reduce(lightCandle, freshRitual());

describe('the five lines', () => {
  it('are exactly the words that were written, in order', () => {
    expect(RITUAL_MESSAGES).toEqual([
      'By the first flame, awaken the secrets buried beneath these walls.',
      'By the second flame, bind the restless echoes wandering between worlds.',
      'By the third flame, purge the darkness from every forgotten memory.',
      'By the fourth flame, let all corrupted spirits dissolve into eternal silence.',
      'By the fifth and final flame, the power of the circle COMPELS YOU!',
    ]);
  });

  it('match the number of candles', () => {
    expect(CANDLE_COUNT).toBe(5);
    expect(RITUAL_MESSAGES).toHaveLength(CANDLE_COUNT);
    expect(CANDLE_SOUNDS).toHaveLength(CANDLE_COUNT);
  });
});

describe('lighting candles', () => {
  it('starts with nothing lit and nothing to say', () => {
    const s = freshRitual();
    expect(s.lit).toEqual([]);
    expect(messageFor(s)).toBeNull();
    expect(soundFor(s)).toBeNull();
    expect(isComplete(s)).toBe(false);
  });

  it('speaks the line for how many are lit, not for which one was touched', () => {
    // Any order: the first candle lit always speaks the first line, whichever it is.
    for (const first of ids) {
      const s = lightCandle(freshRitual(), first);
      expect(messageFor(s)).toBe(RITUAL_MESSAGES[0]);
      expect(soundFor(s)).toBe('/audio/ritual/script1.mp3');
    }
    const order: CandleId[] = ['bottom-right', 'top', 'left', 'bottom-left', 'right'];
    let s = freshRitual();
    order.forEach((id, i) => {
      s = lightCandle(s, id);
      expect(messageFor(s)).toBe(RITUAL_MESSAGES[i]);
      expect(soundFor(s)).toBe(`/audio/ritual/script${i + 1}.mp3`);
    });
  });

  it('remembers the order they were lit in', () => {
    const order: CandleId[] = ['right', 'bottom-left', 'top'];
    expect(lightAll(order).lit).toEqual(order);
  });

  it('ignores a candle that is already lit', () => {
    const once = lightCandle(freshRitual(), 'top');
    expect(lightCandle(once, 'top')).toBe(once);
    expect(once.lit).toEqual(['top']);
  });

  it('is complete exactly when all five are lit, whatever the order', () => {
    expect(isComplete(lightAll(ids.slice(0, 4)))).toBe(false);
    expect(isComplete(lightAll(ids))).toBe(true);
    expect(isComplete(lightAll([...ids].reverse()))).toBe(true);
  });

  it('does nothing more once it is complete', () => {
    const done = lightAll(ids);
    expect(lightCandle(done, 'top')).toBe(done);
    expect(done.lit).toHaveLength(5);
  });

  it('knows which candles are lit', () => {
    const s = lightAll(['left']);
    expect(isLit(s, 'left')).toBe(true);
    expect(isLit(s, 'right')).toBe(false);
  });
});
