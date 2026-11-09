import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkFile, IMAGE_LIMITS, ImageError, prepareImage, type ImageBackend } from './prepareImage';
import { sniffImageType } from './sniff';

const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe1, 0x00, 0x10, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const WEBP_HEAD = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50];

const file = (bytes: number[], name = 'room.jpg', pad = 0) => new File([new Uint8Array([...bytes, ...new Array(pad).fill(0)])], name, { type: 'image/jpeg' });

function fakeBackend(size: { width: number; height: number }, failDecode = false) {
  const encoded: Array<{ w: number; h: number; q: number; blob: Blob }> = [];
  const release = vi.fn();
  const backend: ImageBackend = {
    decode: async () => {
      if (failDecode) throw new Error('bad');
      return size;
    },
    encode: async (w, h, q) => {
      const blob = new Blob([`jpeg-${w}x${h}`], { type: 'image/jpeg' });
      encoded.push({ w, h, q, blob });
      return blob;
    },
    release,
  };
  return { backend, encoded, release };
}

beforeEach(() => {
  // jsdom has no object URLs.
  Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:preview'), configurable: true, writable: true });
});
afterEach(() => {
  vi.clearAllMocks();
});

describe('sniffImageType', () => {
  it('reads the real format from the first bytes', () => {
    expect(sniffImageType(new Uint8Array(JPEG_HEAD))).toBe('jpeg');
    expect(sniffImageType(new Uint8Array(PNG_HEAD))).toBe('png');
    expect(sniffImageType(new Uint8Array(WEBP_HEAD))).toBe('webp');
  });

  it('rejects anything else, whatever the file is called', () => {
    expect(sniffImageType(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(sniffImageType(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBeNull(); // %PDF-
    expect(sniffImageType(new Uint8Array([]))).toBeNull();
  });
});

describe('checkFile', () => {
  it('accepts a real image', async () => {
    await expect(checkFile(file(JPEG_HEAD))).resolves.toBeUndefined();
  });

  it('refuses a file over 10 MB', async () => {
    const big = new File([new Uint8Array(IMAGE_LIMITS.maxFileBytes + 1)], 'big.jpg', { type: 'image/jpeg' });
    await expect(checkFile(big)).rejects.toMatchObject({ code: 'size' });
  });

  it('refuses a file that only claims to be an image', async () => {
    const fake = new File([new TextEncoder().encode('not an image at all')], 'room.jpg', { type: 'image/jpeg' });
    await expect(checkFile(fake)).rejects.toMatchObject({ code: 'type' });
  });
});

describe('prepareImage', () => {
  it('keeps the original, makes a 1024 copy for the AI and a larger one for display', async () => {
    const { backend, encoded, release } = fakeBackend({ width: 4032, height: 3024 });
    const original = file(JPEG_HEAD, 'phone.jpg', 100);
    const stages: string[] = [];

    const out = await prepareImage(original, backend, (_p, stage) => stages.push(stage));

    expect(out.original).toBe(original);
    expect(out.width).toBe(1024);
    expect(out.height).toBe(768);
    expect(out.displayWidth).toBe(2048);
    expect(out.displayHeight).toBe(1536);
    expect(out.originalWidth).toBe(4032);
    expect(encoded.map((e) => `${e.w}x${e.h}`)).toEqual(['2048x1536', '1024x768']);
    // The copy sent to the AI is the re-encoded one, never the file the visitor supplied.
    expect(out.inference).not.toBe(original);
    expect(out.inference).toBe(encoded[1].blob);
    expect(out.display).toBe(encoded[0].blob);
    expect(out.previewUrl).toBe('blob:preview');
    expect(release).toHaveBeenCalledTimes(1);
    expect(stages).toEqual(['checking', 'decoding', 'resizing', 'encoding', 'done']);
  });

  it('reports rising progress', async () => {
    const { backend } = fakeBackend({ width: 1200, height: 900 });
    const seen: number[] = [];
    await prepareImage(file(PNG_HEAD), backend, (p) => seen.push(p));
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
    expect(seen[seen.length - 1]).toBe(100);
  });

  it('does not enlarge a small photograph', async () => {
    const { backend } = fakeBackend({ width: 640, height: 512 });
    const out = await prepareImage(file(WEBP_HEAD), backend);
    expect(out.width).toBe(640);
    expect(out.height).toBe(512);
    expect(out.displayWidth).toBe(640);
  });

  it('refuses a photograph with a side under 512 pixels', async () => {
    const { backend, release } = fakeBackend({ width: 2000, height: 400 });
    await expect(prepareImage(file(JPEG_HEAD), backend)).rejects.toMatchObject({ code: 'tooSmall' });
    expect(release).toHaveBeenCalled();
  });

  it('refuses an extremely large photograph', async () => {
    const { backend } = fakeBackend({ width: 20000, height: 15000 });
    await expect(prepareImage(file(JPEG_HEAD), backend)).rejects.toMatchObject({ code: 'tooLarge' });
  });

  it('turns a decoding failure into a friendly error', async () => {
    const { backend } = fakeBackend({ width: 1, height: 1 }, true);
    const err = await prepareImage(file(JPEG_HEAD), backend).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ImageError);
    expect((err as ImageError).code).toBe('decode');
  });
});
