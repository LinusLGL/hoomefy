import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StyleSelector } from './StyleSelector';
import { PreferencesPanel } from './PreferencesPanel';
import { ShoppingList } from './ShoppingList';
import { ConsentDialog } from './ConsentDialog';
import { SidePanel, type SideTab } from './SidePanel';
import { useShoppingStore } from '@/features/furniture/shoppingStore';
import { useStudioStore } from '@/stores/studioStore';
import { useState } from 'react';

describe('StyleSelector', () => {
  it('shows the five themes and a custom card', () => {
    render(<StyleSelector selected={null} onSelect={() => undefined} />);
    for (const name of ['Scandinavian', 'Japandi', 'Modern Luxury', 'Minimalist', 'Halloween', 'Custom']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${name}`) })).toBeInTheDocument();
    }
  });

  it('tells which theme is chosen and reports a click', async () => {
    const onSelect = vi.fn();
    render(<StyleSelector selected="japandi" onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: /^Japandi/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^Halloween/ })).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(screen.getByRole('button', { name: /^Halloween/ }));
    expect(onSelect).toHaveBeenCalledWith('halloween');
  });

  it('opens a text box only for the custom style', () => {
    const { rerender } = render(<StyleSelector selected="japandi" onSelect={() => undefined} />);
    expect(screen.queryByLabelText('Describe your style')).not.toBeInTheDocument();
    const onChange = vi.fn();
    rerender(<StyleSelector selected="custom" onSelect={() => undefined} customStyle="cozy" onCustomStyleChange={onChange} />);
    const box = screen.getByLabelText('Describe your style');
    expect(box).toHaveValue('cozy');
    fireEvent.change(box, { target: { value: 'cozy cabin' } });
    expect(onChange).toHaveBeenCalledWith('cozy cabin');
  });

  it('is disabled while generating', () => {
    render(<StyleSelector selected={null} onSelect={() => undefined} disabled />);
    expect(screen.getByRole('button', { name: /^Japandi/ })).toBeDisabled();
  });
});

describe('PreferencesPanel', () => {
  it('sets and clears the palette, and reports the budget as a number', async () => {
    const onChange = vi.fn();
    render(<PreferencesPanel preferences={{ colorPalette: 'warm', intensity: 0.5 }} onChange={onChange} />);
    expect(screen.getByRole('button', { name: /Warm/ })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: /Warm/ }));
    expect(onChange).toHaveBeenLastCalledWith({ colorPalette: undefined });
    await userEvent.click(screen.getByRole('button', { name: /Cool/ }));
    expect(onChange).toHaveBeenLastCalledWith({ colorPalette: 'cool' });

    fireEvent.change(screen.getByLabelText(/Furniture budget/), { target: { value: '2500' } });
    expect(onChange).toHaveBeenLastCalledWith({ budget: 2500 });
  });

  it('clears the budget when the box is emptied', () => {
    const onChange = vi.fn();
    render(<PreferencesPanel preferences={{ budget: 2500 }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/Furniture budget/), { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith({ budget: undefined });
  });

  it('always shows the extra instructions box', () => {
    render(<PreferencesPanel preferences={{}} onChange={() => undefined} />);
    expect(screen.getByLabelText(/Extra instructions/)).toBeInTheDocument();
  });
});

describe('ShoppingList', () => {
  beforeEach(() => {
    localStorage.clear();
    useShoppingStore.setState({ items: [] });
    useStudioStore.getState().setPreferences({ budget: undefined });
  });

  const add = (title: string, price: number, estimated = false) =>
    useShoppingStore.getState().add({ kind: 'sofa', title, price, estimated, source: null, link: null, imageUrl: null });

  it('starts empty and asks for a budget', () => {
    render(<ShoppingList />);
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
    expect(screen.getByTestId('shopping-total')).toHaveTextContent('$0');
    expect(screen.getByText(/Set a budget/)).toBeInTheDocument();
  });

  it('totals the items and shows how much of the budget is left', () => {
    useStudioStore.getState().setPreferences({ budget: 2000 });
    add('Sofa A', 800);
    add('Sofa B (estimate)', 450, true);
    render(<ShoppingList />);
    expect(screen.getByTestId('shopping-total')).toHaveTextContent('$1,250');
    expect(screen.getByText('$750 left of your $2,000 budget')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '63');
    expect(screen.getByText(/rough ranges/)).toBeInTheDocument();
  });

  it('warns when the list goes over budget', () => {
    useStudioStore.getState().setPreferences({ budget: 500 });
    add('Sofa A', 800);
    render(<ShoppingList />);
    expect(screen.getByText('$300 over your $500 budget')).toBeInTheDocument();
  });

  it('removes an item', async () => {
    add('Sofa A', 800);
    render(<ShoppingList />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Sofa A' }));
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
  });
});

describe('ConsentDialog', () => {
  it('says where the photo goes and offers three ways forward', async () => {
    const handlers = { onAccept: vi.fn(), onDemo: vi.fn(), onCancel: vi.fn() };
    render(<ConsentDialog open {...handlers} />);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Hugging Face/, { selector: 'p' })).toBeInTheDocument();
    expect(within(dialog).getByText(/Location and camera details are removed/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Send and generate' }));
    expect(handlers.onAccept).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /demo rendering/ }));
    expect(handlers.onDemo).toHaveBeenCalled();
    await userEvent.keyboard('{Escape}');
    expect(handlers.onCancel).toHaveBeenCalled();
  });

  it('renders nothing when closed', () => {
    render(<ConsentDialog open={false} onAccept={() => undefined} onDemo={() => undefined} onCancel={() => undefined} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('SidePanel', () => {
  function Harness() {
    const [tab, setTab] = useState<SideTab>('summary');
    return <SidePanel tab={tab} onTabChange={setTab} />;
  }

  it('switches tabs with the arrow keys', async () => {
    render(<Harness />);
    const summary = screen.getByRole('tab', { name: 'Summary' });
    expect(summary).toHaveAttribute('aria-selected', 'true');
    summary.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Furniture' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('furniture-panel')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByTestId('shopping-list')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByTestId('design-summary')).toBeInTheDocument();
  });
});
