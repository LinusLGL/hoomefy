import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DetectError } from './detectApi';
import { useFurnitureStore } from './furnitureStore';
import type { DesignItem } from './items';
import { SEARCH_CONCURRENCY, listLinesFor, resetScan, scanDesign, type ScanDeps, type ScanTarget } from './scan';
import type { ProductResult } from './search';
import { useShoppingStore } from './shoppingStore';
import { estimateMid } from './estimate';

const target = (id = 'v1'): ScanTarget => ({ id, blob: new Blob(['x']), style: 'scandinavian' });

const sofa: DesignItem = { id: 'v1:0', kind: 'sofa', name: 'Grey sofa', query: 'grey sofa' };
const rug: DesignItem = { id: 'v1:1', kind: 'rug', name: 'Jute rug', query: 'jute rug' };

const product = (title: string, price: number): ProductResult => ({ title, price, priceText: `$${price}`, source: 'Shop', link: `https://shop.example/${title}`, imageUrl: null });

function deps(over: Partial<ScanDeps> = {}): ScanDeps {
  return {
    cloud: vi.fn(async () => [sofa, rug]),
    device: vi.fn(async () => [sofa]),
    search: vi.fn(async (query: string) => (query === 'grey sofa' ? { live: true, results: [product('Sofa A', 800), product('Sofa B', 900), product('Sofa C', 2000)] } : { live: true, results: [] })),
    ...over,
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  localStorage.clear();
  resetScan();
  useShoppingStore.setState({ items: [] });
});

describe('scanDesign', () => {
  it('finds the pieces, looks each one up, and fills the shopping list', async () => {
    const d = deps();
    await scanDesign(target(), { deps: d });

    const state = useFurnitureStore.getState();
    expect(state.status).toBe('done');
    expect(state.versionId).toBe('v1');
    expect(state.items.map((i) => i.name)).toEqual(['Grey sofa', 'Jute rug']);
    expect(state.prices['v1:0']).toMatchObject({ status: 'done', live: true });
    expect(d.search).toHaveBeenCalledTimes(2);

    const list = useShoppingStore.getState().items;
    expect(list).toHaveLength(2);
    // The sofa line is the product priced nearest the middle; the rug found nothing, so it is an estimate.
    expect(list[0]).toMatchObject({ title: 'Sofa B', price: 900, estimated: false, source: 'Shop', auto: true });
    expect(list[1]).toMatchObject({ title: 'Jute rug (estimate)', price: estimateMid('rug', 'scandinavian'), estimated: true, auto: true });
  });

  it('uses typical prices for every piece when the shop search is not switched on', async () => {
    await scanDesign(target(), { deps: deps({ search: async () => ({ live: false, results: [] }) }) });
    const list = useShoppingStore.getState().items;
    expect(list.every((i) => i.estimated)).toBe(true);
    expect(useFurnitureStore.getState().status).toBe('done');
  });

  it('keeps the pieces the visitor added and replaces the ones the last design added', async () => {
    useShoppingStore.getState().add({ kind: 'plant', title: 'My fern', price: 20, estimated: false, source: null, link: 'https://shop.example/fern', imageUrl: null });
    await scanDesign(target(), { deps: deps() });
    await scanDesign(target('v2'), { deps: deps({ cloud: async () => [{ ...sofa, id: 'v2:0' }] }) });
    const titles = useShoppingStore.getState().items.map((i) => i.title);
    expect(titles).toEqual(['My fern', 'Sofa B']);
  });

  it('reports a failure, keeps the list as it was, and does nothing else', async () => {
    useShoppingStore.getState().replaceAuto([{ kind: 'rug', title: 'Earlier rug', price: 50, estimated: true, source: null, link: null, imageUrl: null }]);
    const d = deps({
      cloud: async () => {
        throw new DetectError('auth', 'Sign in to find the items in your design.');
      },
    });
    await scanDesign(target(), { deps: d });

    const state = useFurnitureStore.getState();
    expect(state.status).toBe('error');
    expect(state.error).toBe('Sign in to find the items in your design.');
    expect(d.search).not.toHaveBeenCalled();
    expect(useShoppingStore.getState().items.map((i) => i.title)).toEqual(['Earlier rug']);
  });

  it('gives a plain message for an unexpected failure', async () => {
    await scanDesign(target(), {
      deps: deps({
        cloud: async () => {
          throw new Error('kaboom');
        },
      }),
    });
    expect(useFurnitureStore.getState().error).toBe('We could not look through your design just now.');
    await scanDesign(target('v2'), {
      deps: deps({
        device: async () => {
          throw new Error('no wasm');
        },
      }),
      method: 'device',
    });
    expect(useFurnitureStore.getState().error).toContain('this device');
  });

  it('clears the earlier automatic lines when a design has no recognisable furniture', async () => {
    await scanDesign(target(), { deps: deps() });
    await scanDesign(target('v2'), { deps: deps({ cloud: async () => [] }) });
    expect(useFurnitureStore.getState().status).toBe('done');
    expect(useShoppingStore.getState().items).toEqual([]);
  });

  it('uses the finder on this device when asked', async () => {
    const d = deps();
    await scanDesign(target(), { method: 'device', deps: d });
    expect(d.device).toHaveBeenCalledTimes(1);
    expect(d.cloud).not.toHaveBeenCalled();
    expect(useFurnitureStore.getState().source).toBe('device');
  });

  it('looks a design through once, unless asked again', async () => {
    const d = deps();
    await scanDesign(target(), { deps: d });
    await scanDesign(target(), { deps: d });
    expect(d.cloud).toHaveBeenCalledTimes(1);
    await scanDesign(target(), { deps: d, force: true });
    expect(d.cloud).toHaveBeenCalledTimes(2);
  });

  it('runs at most three shop searches at once', async () => {
    const many: DesignItem[] = Array.from({ length: 8 }, (_, i) => ({ id: `v1:${i}`, kind: 'chair', name: `Chair ${i}`, query: `chair ${i}` }));
    let running = 0;
    let peak = 0;
    const search = vi.fn(async () => {
      running++;
      peak = Math.max(peak, running);
      await flush();
      running--;
      return { live: true, results: [] };
    });
    await scanDesign(target(), { deps: deps({ cloud: async () => many, search }) });
    expect(search).toHaveBeenCalledTimes(8);
    expect(peak).toBe(SEARCH_CONCURRENCY);
  });

  it('survives a search that throws', async () => {
    await scanDesign(target(), {
      deps: deps({
        search: async () => {
          throw new Error('network');
        },
      }),
    });
    expect(useFurnitureStore.getState().status).toBe('done');
    expect(useShoppingStore.getState().items.every((i) => i.estimated)).toBe(true);
  });

  it('ignores a scan that is overtaken by a new photograph', async () => {
    let release: () => void = () => undefined;
    const slow = deps({ cloud: () => new Promise<DesignItem[]>((resolve) => (release = () => resolve([sofa]))) });
    const pending = scanDesign(target(), { deps: slow });
    resetScan();
    release();
    await pending;

    const state = useFurnitureStore.getState();
    expect(state.versionId).toBeNull();
    expect(state.items).toEqual([]);
    expect(useShoppingStore.getState().items).toEqual([]);
  });

  it('ignores the answers of an older design once a newer one is being looked through', async () => {
    let releaseOld: () => void = () => undefined;
    const old = deps({ cloud: () => new Promise<DesignItem[]>((resolve) => (releaseOld = () => resolve([sofa]))) });
    const first = scanDesign(target('v1'), { deps: old });
    await scanDesign(target('v2'), { deps: deps({ cloud: async () => [{ ...rug, id: 'v2:0' }] }) });
    releaseOld();
    await first;

    expect(useFurnitureStore.getState().versionId).toBe('v2');
    expect(useFurnitureStore.getState().items.map((i) => i.name)).toEqual(['Jute rug']);
    expect(useShoppingStore.getState().items.map((i) => i.title)).toEqual(['Jute rug (estimate)']);
  });
});

describe('listLinesFor', () => {
  it('writes one line per piece', () => {
    const lines = listLinesFor([sofa, rug], { 'v1:0': { status: 'done', live: true, results: [product('Only sofa', 700)] } }, 'minimalist');
    expect(lines.map((l) => [l.title, l.price, l.estimated])).toEqual([
      ['Only sofa', 700, false],
      ['Jute rug (estimate)', estimateMid('rug', 'minimalist'), true],
    ]);
  });
});
