import { describe, it, expect } from 'vitest';
import type { RoomType } from '@/types';
import {
  FURNITURE,
  MAX_INSTRUCTIONS,
  ROOM_FURNITURE,
  ROOM_SLOTS,
  applyReplacement,
  composeInstructions,
  ghostCount,
  hashString,
  seedSpirits,
} from './spirits';

describe('seedSpirits', () => {
  it('is deterministic for the same photo and room', () => {
    expect(seedSpirits('room.png:1234', 'bedroom')).toEqual(seedSpirits('room.png:1234', 'bedroom'));
  });

  it('gives every room between 1 and 3 distinct spirits', () => {
    for (const room of ROOM_SLOTS) {
      for (let i = 0; i < 40; i++) {
        const s = seedSpirits(`photo-${i}`, room);
        expect(s.length).toBeGreaterThanOrEqual(1);
        expect(s.length).toBeLessThanOrEqual(3);
        expect(new Set(s).size).toBe(s.length);
      }
    }
  });

  it('only binds spirits to furniture that makes sense in that room', () => {
    for (const room of ROOM_SLOTS) {
      for (let i = 0; i < 40; i++) {
        for (const key of seedSpirits(`p${i}`, room)) {
          expect(ROOM_FURNITURE[room], `${room} / ${key}`).toContain(key);
        }
      }
    }
  });

  it('varies between photos (not always the same spirits)', () => {
    const seen = new Set(Array.from({ length: 30 }, (_, i) => seedSpirits(`photo-${i}`, 'living-room').join(',')));
    expect(seen.size).toBeGreaterThan(3);
  });

  it('never needs a bed in a kitchen, or a stove-less bedroom to host kitchen furniture', () => {
    for (let i = 0; i < 60; i++) {
      expect(seedSpirits(`k${i}`, 'kitchen')).not.toContain('bed');
      expect(seedSpirits(`b${i}`, 'bedroom')).not.toContain('seating');
    }
  });
});

describe('hashString', () => {
  it('is stable and spreads different inputs', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abd'));
  });
});

describe('applyReplacement', () => {
  it('drives out exactly the spirits bound to replaced furniture', () => {
    const r = applyReplacement(['seating', 'lighting', 'decor'], ['lighting', 'rugs']);
    expect(r.driven).toEqual(['lighting']);
    expect(r.remaining).toEqual(['seating', 'decor']);
  });

  it('clears everything when every bound category is replaced', () => {
    const r = applyReplacement(['bed', 'storage'], ['storage', 'bed', 'decor']);
    expect(r.remaining).toEqual([]);
    expect(r.driven).toEqual(['bed', 'storage']);
  });

  it('drives nothing out when nothing is replaced', () => {
    const r = applyReplacement(['bed'], []);
    expect(r.driven).toEqual([]);
    expect(r.remaining).toEqual(['bed']);
  });
});

describe('composeInstructions', () => {
  it('leaves the user text alone when nothing is replaced', () => {
    expect(composeInstructions('More light please', [])).toBe('More light please');
    expect(composeInstructions('   ', [])).toBeUndefined();
    expect(composeInstructions(undefined, [])).toBeUndefined();
  });

  it('adds one sentence naming each category', () => {
    const out = composeInstructions(undefined, ['seating', 'lighting']) as string;
    expect(out).toContain('sofas and seating');
    expect(out).toContain('lamps and lighting');
    expect(out.startsWith('Replace the existing')).toBe(true);
  });

  it('keeps the user text first', () => {
    const out = composeInstructions('Keep it cozy.', ['rugs']) as string;
    expect(out.startsWith('Keep it cozy.')).toBe(true);
    expect(out).toContain('rugs and curtains');
  });

  it('never exceeds the API limit and keeps the furniture sentence whole', () => {
    const long = 'x'.repeat(900);
    const out = composeInstructions(long, FURNITURE.map((f) => f.key)) as string;
    expect(out.length).toBeLessThanOrEqual(MAX_INSTRUCTIONS);
    expect(out.endsWith('suit the chosen style.')).toBe(true);
  });
});

describe('ghostCount', () => {
  it.each([
    [7, 3],
    [4, 3],
    [3, 3],
    [2, 2],
    [1, 1],
    [0, 1],
  ])('%i uncleared rooms -> %i floating ghosts', (uncleared, expected) => {
    expect(ghostCount(uncleared)).toBe(expected);
  });

  it('is always between 1 and 3', () => {
    for (let i = -2; i < 12; i++) {
      expect(ghostCount(i)).toBeGreaterThanOrEqual(1);
      expect(ghostCount(i)).toBeLessThanOrEqual(3);
    }
  });
});

describe('room catalogue', () => {
  it('has a slot for every room type used by the studio', () => {
    const all: RoomType[] = ['living-room', 'bedroom', 'kitchen', 'dining-room', 'office', 'bathroom', 'other'];
    expect([...ROOM_SLOTS].sort()).toEqual([...all].sort());
    for (const r of all) expect(ROOM_FURNITURE[r].length).toBeGreaterThan(0);
  });
});
