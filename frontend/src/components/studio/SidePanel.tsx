/**
 * SidePanel: the right-hand panel. Three tabs (summary, furniture, shopping list) with a count on the list.
 */

import { useId, useRef } from 'react';
import { cn } from '@/utils/cn';
import { useShoppingStore } from '@/features/furniture/shoppingStore';
import { DesignSummary } from './DesignSummary';
import { FurniturePanel } from './FurniturePanel';
import { ShoppingList } from './ShoppingList';

export type SideTab = 'summary' | 'furniture' | 'list';

const TABS: Array<{ id: SideTab; label: string }> = [
  { id: 'summary', label: 'Summary' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'list', label: 'Shopping list' },
];

interface SidePanelProps {
  tab: SideTab;
  onTabChange: (tab: SideTab) => void;
  /** Shown under the tabs on the summary tab (tips). */
  tips?: React.ReactNode;
}

export function SidePanel({ tab, onTabChange, tips }: SidePanelProps) {
  const base = useId();
  const count = useShoppingStore((s) => s.items.length);
  const refs = useRef<Record<SideTab, HTMLButtonElement | null>>({ summary: null, furniture: null, list: null });

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = TABS[(index + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length].id;
    onTabChange(next);
    refs.current[next]?.focus();
  };

  return (
    <section className="rounded-xl border border-navy-700 bg-navy-800 lg:flex lg:min-h-[10rem] lg:flex-1 lg:flex-col lg:overflow-hidden" aria-label="Design assistant and furniture">
      <div role="tablist" aria-label="Design assistant" className="flex border-b border-navy-700 lg:shrink-0">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[t.id] = el;
            }}
            id={`${base}-tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            aria-controls={`${base}-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => onTabChange(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'min-h-[44px] flex-1 px-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 lg:min-h-[36px]',
              tab === t.id ? 'border-b-2 border-amber-500 text-accent' : 'text-ivory/75 hover:text-ivory'
            )}
          >
            {t.label}
            {t.id === 'list' && count > 0 && <span className="ml-1 rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] text-on-accent">{count}</span>}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${base}-panel-${tab}`} aria-labelledby={`${base}-tab-${tab}`} className="p-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:p-3">
        {tab === 'summary' && (
          <div className="space-y-6 lg:space-y-3">
            <DesignSummary />
            {tips}
          </div>
        )}
        {tab === 'furniture' && <FurniturePanel />}
        {tab === 'list' && <ShoppingList />}
      </div>
    </section>
  );
}
