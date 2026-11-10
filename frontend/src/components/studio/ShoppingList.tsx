/**
 * ShoppingList
 *
 * The pieces found in the design (added by themselves) and any the visitor picked, a running total and how it
 * compares with their budget. Prices marked "est." are typical prices for the style; products from the search use
 * the shop's own price.
 */

import { Copy, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { useStudioStore } from '@/stores/studioStore';
import { useToast } from '@/hooks/useToast';
import { formatUsd } from '@/features/furniture/estimate';
import { listAsText, shoppingTotal, useShoppingStore } from '@/features/furniture/shoppingStore';

export function ShoppingList() {
  const toast = useToast();
  const items = useShoppingStore((s) => s.items);
  const remove = useShoppingStore((s) => s.remove);
  const clear = useShoppingStore((s) => s.clear);
  const budget = useStudioStore((s) => s.preferences.budget);

  const total = shoppingTotal(items);
  const over = budget !== undefined && budget > 0 && total > budget;
  const share = budget && budget > 0 ? Math.min(100, Math.round((total / budget) * 100)) : null;
  const hasEstimates = items.some((i) => i.estimated);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(listAsText(items, total, budget));
      toast.success('Copied', 'Your shopping list is on the clipboard.');
    } catch {
      toast.error('Could not copy', 'Select the list and copy it by hand.');
    }
  };

  return (
    <div className="space-y-4" data-testid="shopping-list">
      <div>
        <h3 className="text-sm font-semibold text-ivory">Shopping list</h3>
        <p className="mt-1 text-xs text-ivory/70">The pieces found in your design are added here by themselves, one line each. Add more, or remove any, from the Furniture tab.</p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-navy-600 p-4 text-sm text-ivory/70">Nothing here yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 rounded-lg border border-navy-700 bg-navy-900 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ivory">{item.title}</p>
                <p className="text-xs text-ivory/70">
                  {formatUsd(item.price)}
                  {item.estimated ? ' est.' : ''}
                  {item.source ? ` · ${item.source}` : ''}
                </p>
                {item.link && (
                  <a href={item.link} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-[32px] items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover">
                    View <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label={`Remove ${item.title}`}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-ivory/70 hover:bg-navy-800 hover:text-danger"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 rounded-lg border border-navy-700 bg-navy-900 p-4" aria-live="polite">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-ivory/80">Estimated total</span>
          <span className="font-heading text-xl font-semibold text-ivory" data-testid="shopping-total">
            {formatUsd(total)}
          </span>
        </div>
        {share !== null && budget ? (
          <>
            <div className="h-2 overflow-hidden rounded-full bg-navy-700" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={share} aria-label="Share of budget used">
              <div className={cn('h-full rounded-full transition-all', over ? 'bg-danger' : 'bg-amber-500')} style={{ width: `${share}%` }} />
            </div>
            <p className={cn('text-xs', over ? 'text-danger' : 'text-ivory/70')}>
              {over ? `${formatUsd(total - budget)} over your ${formatUsd(budget)} budget` : `${formatUsd(budget - total)} left of your ${formatUsd(budget)} budget`}
            </p>
          </>
        ) : (
          <p className="text-xs text-ivory/60">Set a budget in the controls to see how much is left.</p>
        )}
        {hasEstimates && <p className="text-xs text-ivory/60">Items marked “est.” are rough ranges, not shop prices.</p>}
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={copy}>
            <Copy className="h-4 w-4" aria-hidden="true" /> Copy list
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={clear}>
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
