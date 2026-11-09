import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_HISTORY, useStudioStore, type DesignVersion } from './studioStore';
import { STORAGE_KEYS } from '@/utils/constants';

const version = (id: string): DesignVersion => ({
  id,
  url: `blob:${id}`,
  blob: new Blob([id]),
  createdAt: new Date().toISOString(),
  style: 'japandi',
  roomType: 'bedroom',
  prompt: 'p',
  providerId: 'demo',
  demo: true,
});

const image = (name: string) => ({ file: new File(['x'], name), preview: `blob:${name}`, inference: new Blob(['x']), width: 1024, height: 768 });

let revoke: ReturnType<typeof vi.fn>;

beforeEach(() => {
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true, writable: true });
  localStorage.clear();
  useStudioStore.getState().reset();
  // Count only what the test itself does.
  revoke = vi.fn();
  Object.defineProperty(URL, 'revokeObjectURL', { value: revoke, configurable: true, writable: true });
});

describe('studio history', () => {
  it('adds a version, makes it active and shows it on the canvas', () => {
    useStudioStore.getState().addVersion(version('a'));
    useStudioStore.getState().addVersion(version('b'));
    const s = useStudioStore.getState();
    expect(s.history.map((v) => v.id)).toEqual(['b', 'a']);
    expect(s.activeVersionId).toBe('b');
    expect(s.generatedImageUrl).toBe('blob:b');
  });

  it('switches the active version', () => {
    useStudioStore.getState().addVersion(version('a'));
    useStudioStore.getState().addVersion(version('b'));
    useStudioStore.getState().setActiveVersion('a');
    expect(useStudioStore.getState().generatedImageUrl).toBe('blob:a');
    useStudioStore.getState().setActiveVersion('missing');
    expect(useStudioStore.getState().activeVersionId).toBeNull();
  });

  it('keeps the newest versions and frees the object URLs of the rest', () => {
    for (let i = 0; i < MAX_HISTORY + 3; i++) useStudioStore.getState().addVersion(version(`v${i}`));
    const s = useStudioStore.getState();
    expect(s.history).toHaveLength(MAX_HISTORY);
    expect(s.history[0].id).toBe(`v${MAX_HISTORY + 2}`);
    expect(revoke).toHaveBeenCalledWith('blob:v0');
    expect(revoke).toHaveBeenCalledTimes(3);
  });

  it('starts a fresh set of designs with a new photograph and frees the old one', () => {
    const first = image('first.jpg');
    useStudioStore.getState().setUploadedImage(first);
    useStudioStore.getState().addVersion(version('a'));
    useStudioStore.getState().setUploadedImage(image('second.jpg'));
    const s = useStudioStore.getState();
    expect(s.history).toEqual([]);
    expect(s.activeVersionId).toBeNull();
    expect(revoke).toHaveBeenCalledWith('blob:first.jpg');
    expect(revoke).toHaveBeenCalledWith('blob:a');
  });

  it('removing the photograph clears everything built on it', () => {
    useStudioStore.getState().setUploadedImage(image('a.jpg'));
    useStudioStore.getState().addVersion(version('a'));
    useStudioStore.getState().setUploadedImage(null);
    expect(useStudioStore.getState().uploadedImage).toBeNull();
    expect(useStudioStore.getState().history).toEqual([]);
  });

  it('reset clears the choices too', () => {
    useStudioStore.getState().setStyle('halloween');
    useStudioStore.getState().setRoomType('kitchen');
    useStudioStore.getState().reset();
    const s = useStudioStore.getState();
    expect(s.selectedStyle).toBeNull();
    expect(s.roomType).toBeNull();
  });
});

describe('persisted choices', () => {
  it('remembers the room, theme and preferences but never the photograph or designs', () => {
    useStudioStore.getState().setStyle('minimalist');
    useStudioStore.getState().setPreferences({ budget: 2500, customStyle: 'cozy cabin' });
    useStudioStore.getState().setUploadedImage(image('a.jpg'));
    useStudioStore.getState().addVersion(version('a'));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.studioState) ?? '{}');
    expect(saved.state.selectedStyle).toBe('minimalist');
    expect(saved.state.preferences.budget).toBe(2500);
    expect(saved.state.uploadedImage).toBeUndefined();
    expect(saved.state.history).toBeUndefined();
  });

  it('drops a style from the old ten-style list when loading older saved data', async () => {
    localStorage.setItem(
      STORAGE_KEYS.studioState,
      JSON.stringify({ state: { roomType: 'bedroom', selectedStyle: 'haunted-chic', preferences: { colorPalette: 'warm' } }, version: 1 })
    );
    await useStudioStore.persist.rehydrate();
    const s = useStudioStore.getState();
    expect(s.selectedStyle).toBeNull();
    expect(s.roomType).toBe('bedroom');
    expect(s.preferences.colorPalette).toBe('warm');
    expect(s.preferences.intensity).toBe(0.7);
  });

  it('keeps a style that is still offered', async () => {
    localStorage.setItem(STORAGE_KEYS.studioState, JSON.stringify({ state: { roomType: null, selectedStyle: 'japandi', preferences: {} }, version: 1 }));
    await useStudioStore.persist.rehydrate();
    expect(useStudioStore.getState().selectedStyle).toBe('japandi');
  });
});
