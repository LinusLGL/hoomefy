import { describe, it, expect } from 'vitest';
import { MAX_FREE_TEXT } from '@/features/studio/prompt';
import { appendPhrase } from './whisper';
import { WHISPERS } from './copy';

describe('appendPhrase', () => {
  it('starts the text with the phrase when nothing is written yet', () => {
    expect(appendPhrase('', 'Keep the fireplace')).toBe('Keep the fireplace');
    expect(appendPhrase('   ', 'Keep the fireplace')).toBe('Keep the fireplace');
  });

  it('adds the phrase as a new sentence', () => {
    expect(appendPhrase('Add more plants', 'Keep the fireplace')).toBe('Add more plants. Keep the fireplace');
  });

  it('does not double the full stop', () => {
    expect(appendPhrase('Add more plants.', 'Keep the fireplace')).toBe('Add more plants. Keep the fireplace');
    expect(appendPhrase('Add more plants. ', 'Keep the fireplace')).toBe('Add more plants. Keep the fireplace');
  });

  it('never goes over the length the prompt allows', () => {
    const long = 'a'.repeat(MAX_FREE_TEXT - 3);
    expect(appendPhrase(long, 'Keep the fireplace').length).toBeLessThanOrEqual(MAX_FREE_TEXT);
  });
});

describe('the whispers on offer', () => {
  it('are a handful of short, distinct phrases that fit the limit even together', () => {
    expect(WHISPERS.length).toBeGreaterThanOrEqual(3);
    expect(new Set(WHISPERS).size).toBe(WHISPERS.length);
    for (const w of WHISPERS) expect(w.length).toBeLessThan(60);
    const all = WHISPERS.reduce(appendPhrase, '');
    expect(all.length).toBeLessThanOrEqual(MAX_FREE_TEXT);
  });
});
