import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanPreferences, designsService, rowToDesign } from './designsService';

beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => `blob:${Math.random()}`), configurable: true, writable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true, writable: true });
});

const input = (name = 'My living room') => ({
  name,
  roomType: 'living-room' as const,
  style: 'scandinavian' as const,
  prompt: 'Edit this photograph',
  preferences: { intensity: 0.5 },
  shopping: [],
  original: new Blob(['o']),
  generated: new Blob(['g']),
});

describe('designsService without a Supabase project', () => {
  it('is not persistent', () => {
    expect(designsService.persistent).toBe(false);
  });

  it('saves, lists newest first, renames and deletes', async () => {
    const a = await designsService.save(input('First'));
    const b = await designsService.save(input('Second'));
    const list = await designsService.list();
    expect(list.map((d) => d.name).slice(0, 2)).toEqual(['Second', 'First']);
    expect(list[0].originalUrl).toMatch(/^blob:/);

    await designsService.rename(a, '  Renamed  ');
    expect((await designsService.list()).find((d) => d.id === a.id)?.name).toBe('Renamed');

    await designsService.remove(b);
    expect((await designsService.list()).some((d) => d.id === b.id)).toBe(false);
    await designsService.remove(a);
  });

  it('needs a name', async () => {
    await expect(designsService.save(input('   '))).rejects.toThrow(/name/i);
    await expect(designsService.rename({ id: 'x' }, ' ')).rejects.toThrow(/name/i);
  });

  it('limits the name length', async () => {
    const saved = await designsService.save(input('x'.repeat(200)));
    expect(saved.name).toHaveLength(80);
    await designsService.remove(saved);
  });
});

describe('reading rows from the database', () => {
  const row = {
    id: 'abc',
    name: 'Bedroom',
    room_type: 'bedroom',
    style: 'halloween',
    prompt: 'p',
    preferences: { colorPalette: 'warm', intensity: 0.9, extra: 'ignored', budget: 100 },
    shopping: [{ id: 's', kind: 'bed', title: 'Bed', price: 400, estimated: true, source: null, link: null, imageUrl: null }],
    original_path: 'u/abc/original.jpg',
    generated_path: 'u/abc/generated.jpg',
    created_at: '2026-11-10T10:00:00Z',
  };

  it('maps a row to a design', () => {
    const d = rowToDesign(row, { original: 'https://signed/o', generated: 'https://signed/g' });
    expect(d).toMatchObject({ id: 'abc', roomType: 'bedroom', style: 'halloween', originalUrl: 'https://signed/o' });
    expect(d.preferences).toEqual({ colorPalette: 'warm', intensity: 0.9, budget: 100 });
    expect(d.shopping).toHaveLength(1);
  });

  it('falls back safely on unexpected values', () => {
    const d = rowToDesign({ ...row, style: 'haunted-chic', room_type: 'garage', preferences: 'junk', shopping: 'junk' }, { original: null, generated: null });
    expect(d.style).toBe('custom');
    expect(d.roomType).toBeNull();
    expect(d.preferences).toEqual({});
    expect(d.shopping).toEqual([]);
  });

  it('cleans preferences', () => {
    expect(cleanPreferences({ colorPalette: 'purple', intensity: 4, customInstructions: 'x'.repeat(900), budget: -1 })).toEqual({ customInstructions: 'x'.repeat(500) });
    expect(cleanPreferences(null)).toEqual({});
  });
});
