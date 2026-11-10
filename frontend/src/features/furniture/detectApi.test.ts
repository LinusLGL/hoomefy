import { describe, expect, it, vi } from 'vitest';
import { DETECT_ENDPOINT, DETECT_SIDE, DetectError, detectItemsInCloud } from './detectApi';

const image = new Blob(['room'], { type: 'image/jpeg' });
const shrink = vi.fn(async () => new Blob(['small'], { type: 'image/jpeg' }));

const reply = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('detectItemsInCloud', () => {
  it('sends a small copy of the design as a data URL and returns cleaned items', async () => {
    const fetchImpl = reply({ items: [{ kind: 'sofa', name: 'grey sofa', query: 'grey sofa' }, { kind: 'spaceship', name: 'bad' }] });
    const items = await detectItemsInCloud(image, 'v1', { fetchImpl, shrink });

    expect(shrink).toHaveBeenCalledWith(image, DETECT_SIDE, 0.8);
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(DETECT_ENDPOINT);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string).image).toMatch(/^data:image\/jpeg;base64,/);
    expect(items).toEqual([{ id: 'v1:0', kind: 'sofa', name: 'Grey sofa', query: 'grey sofa' }]);
  });

  it.each([
    [401, { error: { code: 'UNAUTHORIZED' } }, 'auth'],
    [429, { error: { code: 'QUOTA' } }, 'quota'],
    [429, { error: { code: 'RATE_LIMITED' } }, 'busy'],
    [503, { error: { code: 'NOT_CONFIGURED' } }, 'unavailable'],
    [502, { error: { code: 'UNAVAILABLE' } }, 'unavailable'],
  ])('turns a %i answer into a "%s" error', async (status, body, code) => {
    await expect(detectItemsInCloud(image, 'v1', { fetchImpl: reply(body, status), shrink })).rejects.toMatchObject({ name: 'DetectError', code });
  });

  it('says so when the site cannot be reached or answers nonsense', async () => {
    const offline = vi.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    await expect(detectItemsInCloud(image, 'v1', { fetchImpl: offline, shrink })).rejects.toMatchObject({ code: 'unavailable' });
    const garbled = vi.fn(async () => new Response('<html>', { status: 200 })) as unknown as typeof fetch;
    await expect(detectItemsInCloud(image, 'v1', { fetchImpl: garbled, shrink })).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('says so when the design cannot be prepared', async () => {
    const broken = vi.fn(async () => {
      throw new Error('no canvas');
    });
    await expect(detectItemsInCloud(image, 'v1', { fetchImpl: reply({ items: [] }), shrink: broken })).rejects.toBeInstanceOf(DetectError);
  });

  it('stops quietly when cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(detectItemsInCloud(image, 'v1', { fetchImpl: reply({ items: [] }), shrink, signal: controller.signal })).rejects.toMatchObject({ code: 'aborted' });
  });

  it('accepts an empty list', async () => {
    expect(await detectItemsInCloud(image, 'v1', { fetchImpl: reply({ items: [] }), shrink })).toEqual([]);
  });
});
