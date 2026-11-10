import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignSummary } from './DesignSummary';
import { FurniturePanel } from './FurniturePanel';
import { ItemScan } from './ItemScan';
import { useStudioStore, type DesignVersion } from '@/stores/studioStore';
import { useFurnitureStore } from '@/features/furniture/furnitureStore';
import { useShoppingStore } from '@/features/furniture/shoppingStore';
import type { DesignItem, ItemPrices } from '@/features/furniture/items';
import { estimateMid } from '@/features/furniture/estimate';
import type { ProductResult } from '@/features/furniture/search';

const scanDesign = vi.hoisted(() => vi.fn());
vi.mock('@/features/furniture/scan', () => ({ scanDesign, resetScan: vi.fn() }));

const version: DesignVersion = {
  id: 'v1',
  url: 'blob:v1',
  blob: new Blob(['made']),
  createdAt: '2026-11-05T10:00:00Z',
  style: 'scandinavian',
  prompt: 'Edit this photograph of a room.',
  providerId: 'fake',
  demo: false,
};

const sofa: DesignItem = { id: 'v1:0', kind: 'sofa', name: 'Grey linen sofa', query: 'grey linen sofa' };
const rug: DesignItem = { id: 'v1:1', kind: 'rug', name: 'Jute rug', query: 'jute rug' };

const product = (title: string, price: number): ProductResult => ({ title, price, priceText: `$${price}`, source: 'Wayfair', link: `https://shop.example/${title.replace(/\s/g, '-')}`, imageUrl: null });

const sofaPrices: ItemPrices = { status: 'done', live: true, results: [product('Linen sofa A', 800), product('Linen sofa B', 900), product('Linen sofa C', 3000)] };
const noPrices: ItemPrices = { status: 'done', live: false, results: [] };

function showDesign() {
  useStudioStore.setState({ selectedStyle: 'scandinavian', history: [version], activeVersionId: version.id });
}

function showItems(over: Partial<ReturnType<typeof useFurnitureStore.getState>> = {}) {
  useFurnitureStore.setState({
    versionId: 'v1',
    items: [sofa, rug],
    prices: { 'v1:0': sofaPrices, 'v1:1': noPrices },
    status: 'done',
    source: 'cloud',
    percent: 100,
    error: null,
    selected: null,
    ...over,
  });
}

beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:made'), configurable: true, writable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true, writable: true });
  localStorage.clear();
  scanDesign.mockReset();
  useStudioStore.getState().reset();
  useFurnitureStore.getState().reset();
  useShoppingStore.setState({ items: [] });
});

describe('ItemScan', () => {
  it('shows nothing before there is a design', () => {
    const { container } = render(<ItemScan />);
    expect(container).toBeEmptyDOMElement();
  });

  it('offers to look through a design that has not been looked through yet', async () => {
    showDesign();
    render(<ItemScan />);
    expect(screen.getByTestId('item-scan')).toHaveAttribute('data-status', 'idle');
    await userEvent.click(screen.getByRole('button', { name: 'Find the pieces' }));
    expect(scanDesign).toHaveBeenCalledWith({ id: 'v1', blob: version.blob, style: 'scandinavian' }, { method: 'cloud', force: true });
  });

  it('says what it is doing while it works, and offers no buttons', () => {
    showDesign();
    showItems({ status: 'detecting', items: [], prices: {} });
    const { rerender } = render(<ItemScan />);
    expect(screen.getByRole('status')).toHaveTextContent('Looking through your design');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    act(() => showItems({ status: 'searching', prices: { 'v1:0': sofaPrices, 'v1:1': { status: 'searching', live: false, results: [] } } }));
    rerender(<ItemScan />);
    expect(screen.getByRole('status')).toHaveTextContent('Searching the shops… 1 of 2 priced');
  });

  it('reports a failure and offers to try again or to use this device', async () => {
    showDesign();
    showItems({ status: 'error', items: [], prices: {}, error: 'Sign in to find the items in your design.' });
    render(<ItemScan />);
    expect(screen.getByRole('alert')).toHaveTextContent('Sign in to find the items in your design.');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(scanDesign).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'v1' }), { method: 'cloud', force: true });
    await userEvent.click(screen.getByRole('button', { name: 'Use this device instead' }));
    expect(scanDesign).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'v1' }), { method: 'device', force: true });
  });

  it('counts the pieces found, or says none were recognised', () => {
    showDesign();
    showItems();
    const { rerender } = render(<ItemScan />);
    expect(screen.getByRole('status')).toHaveTextContent('Found 2 pieces in your design.');
    act(() => showItems({ items: [], prices: {} }));
    rerender(<ItemScan />);
    expect(screen.getByRole('status')).toHaveTextContent('No furniture was recognised');
  });

  it('treats results for another design as not looked up yet', () => {
    showDesign();
    showItems({ versionId: 'someone-else' });
    render(<ItemScan />);
    expect(screen.getByTestId('item-scan')).toHaveAttribute('data-status', 'idle');
  });
});

describe('DesignSummary', () => {
  it('lists the choices, with the visitor\'s wishes', () => {
    useStudioStore.setState({ selectedStyle: 'japandi', preferences: { intensity: 0.4, customInstructions: 'Add a green velvet sofa', budget: 3000 } });
    render(<DesignSummary />);
    const summary = screen.getByTestId('design-summary');
    expect(within(summary).getByText('Japandi')).toBeInTheDocument();
    expect(within(summary).getByText('Add a green velvet sofa')).toBeInTheDocument();
    expect(within(summary).getByText('40%')).toBeInTheDocument();
    expect(within(summary).getByText('$3,000')).toBeInTheDocument();
    expect(within(summary).queryByText('Room')).not.toBeInTheDocument();
    expect(within(summary).queryByText('Palette')).not.toBeInTheDocument();
  });

  it('lists each piece with its price and a total once the design has been looked through', () => {
    showDesign();
    showItems();
    render(<DesignSummary />);
    const rows = screen.getAllByTestId('summary-item');
    expect(rows).toHaveLength(2);
    // The product priced nearest the middle of the shop prices counts for the sofa.
    expect(rows[0]).toHaveTextContent('Grey linen sofa');
    expect(rows[0]).toHaveTextContent('$900');
    expect(rows[0]).not.toHaveTextContent('est.');
    // Nothing was found for the rug, so it carries the typical price for the style.
    expect(rows[1]).toHaveTextContent(`$${estimateMid('rug', 'scandinavian')} est.`);
    const total = 900 + estimateMid('rug', 'scandinavian');
    expect(screen.getByTestId('summary-total')).toHaveTextContent(`$${total.toLocaleString('en-US')}`);
    expect(screen.getByText(/1 of 2 prices come from shops/)).toBeInTheDocument();
  });

  it('says plainly when every price is an estimate', () => {
    showDesign();
    showItems({ prices: { 'v1:0': noPrices, 'v1:1': noPrices } });
    render(<DesignSummary />);
    expect(screen.getByText(/No shop prices were found/)).toBeInTheDocument();
  });

  it('shows no pieces before there is a design', () => {
    render(<DesignSummary />);
    expect(screen.queryByTestId('summary-items')).not.toBeInTheDocument();
  });
});

describe('FurniturePanel', () => {
  it('asks the visitor to make a design first', () => {
    render(<FurniturePanel />);
    expect(screen.getByText(/Make a design and the pieces in it are found here by themselves/)).toBeInTheDocument();
    expect(screen.queryByTestId('furniture-item')).not.toBeInTheDocument();
    // No suggested pieces for a room type any more.
    expect(screen.queryByText(/Suggested pieces/)).not.toBeInTheDocument();
  });

  it('lists the pieces found, each with the price counted for it', () => {
    showDesign();
    showItems();
    render(<FurniturePanel />);
    const rows = screen.getAllByTestId('furniture-item');
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('Grey linen sofa'),
      expect.stringContaining('Jute rug'),
    ]);
    expect(rows[0]).toHaveTextContent('$900');
    expect(rows[1]).toHaveTextContent('est.');
  });

  it('shows "Searching…" for a piece whose shops have not answered yet', () => {
    showDesign();
    showItems({ status: 'searching', prices: { 'v1:0': sofaPrices } });
    render(<FurniturePanel />);
    expect(screen.getAllByTestId('furniture-item')[1]).toHaveTextContent('Searching…');
  });

  it('shows the products for the chosen piece and adds one to the shopping list', async () => {
    showDesign();
    showItems();
    render(<FurniturePanel />);
    await userEvent.click(screen.getAllByTestId('furniture-item')[0]);

    const detail = screen.getByTestId('piece-detail');
    expect(within(detail).getByText(/3 shop prices found, from \$800 to \$3,000/)).toBeInTheDocument();
    const products = within(detail).getAllByTestId('product');
    expect(products).toHaveLength(3);
    for (const link of within(detail).getAllByRole('link')) expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));

    await userEvent.click(within(products[1]).getByRole('button', { name: /Add/ }));
    expect(useShoppingStore.getState().items).toEqual([expect.objectContaining({ title: 'Linen sofa B', price: 900, estimated: false, source: 'Wayfair' })]);
    // The same product is not added twice.
    await userEvent.click(within(products[1]).getByRole('button', { name: /Add/ }));
    expect(useShoppingStore.getState().items).toHaveLength(1);
  });

  it('falls back to shop links and an estimate when no prices were found', async () => {
    showDesign();
    showItems();
    render(<FurniturePanel />);
    await userEvent.click(screen.getAllByTestId('furniture-item')[1]);
    const detail = screen.getByTestId('piece-detail');
    expect(within(detail).getByText(/Live prices are not available right now/)).toBeInTheDocument();
    expect(within(detail).getByText(/Typical price for this style/)).toBeInTheDocument();
    expect(within(detail).getByRole('link', { name: /IKEA/ })).toHaveAttribute('href', expect.stringContaining('jute%20rug'));

    await userEvent.click(within(detail).getByRole('button', { name: 'Add estimate to list' }));
    expect(useShoppingStore.getState().items[0]).toMatchObject({ title: 'Jute rug (estimate)', estimated: true, price: estimateMid('rug', 'scandinavian') });
  });
});
