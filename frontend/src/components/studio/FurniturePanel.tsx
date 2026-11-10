/**
 * FurniturePanel
 *
 * The pieces found in the design on the canvas, each with a price, and the shops that sell something like it.
 *
 *   - The pieces are found by themselves when a design is ready (see ItemScan and features/furniture/scan.ts).
 *   - Each piece shows the price counted for it: a real shop price when the search found some, otherwise a typical
 *     price for the style marked "est.".
 *   - Choosing a piece shows the products found, search links for well-known shops, and buttons to add a
 *     product (or the estimate) to the shopping list.
 */

import { ExternalLink, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { useStudioStore } from '@/stores/studioStore';
import { useToast } from '@/hooks/useToast';
import { useFurnitureStore } from '@/features/furniture/furnitureStore';
import { pickPrice, type DesignItem, type ItemPrices } from '@/features/furniture/items';
import { estimateMid, estimateRange, formatUsd, matchLabel } from '@/features/furniture/estimate';
import { retailerLinks } from '@/features/furniture/search';
import { useShoppingStore, type ShoppingItem } from '@/features/furniture/shoppingStore';
import type { DesignStyle } from '@/types';
import { ItemScan } from './ItemScan';

export function FurniturePanel() {
  const toast = useToast();
  const version = useStudioStore((s) => s.history.find((v) => v.id === s.activeVersionId) ?? null);
  const { versionId, items, prices, selected, select } = useFurnitureStore();
  const add = useShoppingStore((s) => s.add);

  const style = version?.style ?? null;
  const here = version !== null && versionId === version.id;
  const found = here ? items : [];
  const chosen = found.find((i) => i.id === selected) ?? null;

  return (
    <div className="space-y-4" data-testid="furniture-panel">
      <div>
        <h3 className="text-sm font-semibold text-ivory">Furniture in this design</h3>
        <p className="mt-1 text-xs text-ivory/70">
          {version ? 'The pieces in your picture, with what similar ones cost in the shops.' : 'Make a design and the pieces in it are found here by themselves.'}
        </p>
      </div>

      <ItemScan />

      {found.length > 0 && (
        <section aria-label="Found in your design" className="space-y-2">
          <ul className="grid grid-cols-1 gap-2">
            {found.map((item) => (
              <ItemRow key={item.id} item={item} prices={prices[item.id]} style={style} on={selected === item.id} onSelect={() => select(selected === item.id ? null : item.id)} />
            ))}
          </ul>
        </section>
      )}

      {chosen && (
        <ItemDetail
          key={chosen.id}
          item={chosen}
          prices={prices[chosen.id]}
          style={style}
          onAdd={(line) => {
            if (add(line)) toast.success('Added to your list', line.title);
            else toast.info('Already on your list', line.title);
          }}
        />
      )}
    </div>
  );
}

interface ItemRowProps {
  item: DesignItem;
  prices: ItemPrices | undefined;
  style: DesignStyle | null;
  on: boolean;
  onSelect: () => void;
}

function ItemRow({ item, prices, style, on, onSelect }: ItemRowProps) {
  const pick = pickPrice(item, prices, style);
  const searching = prices === undefined || prices.status === 'searching';
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={on}
        data-piece={item.kind}
        data-testid="furniture-item"
        className={cn(
          'flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-amber-500',
          on ? 'border-amber-500 bg-amber-500/10 text-ivory' : 'border-navy-700 bg-navy-900 text-ivory hover:border-amber-500/60'
        )}
      >
        <span className="min-w-0 font-medium">
          {item.name}
          {item.confidence !== undefined && <span className="ml-2 text-xs font-normal text-ivory/60">{matchLabel(item.confidence)}</span>}
        </span>
        <span className="shrink-0 text-xs text-ivory/70 tabular-nums">{searching ? 'Searching…' : `${formatUsd(pick.price)}${pick.estimated ? ' est.' : ''}`}</span>
      </button>
    </li>
  );
}

interface ItemDetailProps {
  item: DesignItem;
  prices: ItemPrices | undefined;
  style: DesignStyle | null;
  onAdd: (item: Omit<ShoppingItem, 'id'>) => void;
}

function ItemDetail({ item, prices, style, onAdd }: ItemDetailProps) {
  const pick = pickPrice(item, prices, style);
  const [min, max] = estimateRange(item.kind, style);
  const searching = prices === undefined || prices.status === 'searching';
  const results = prices?.results ?? [];

  return (
    <section className="space-y-4 rounded-lg border border-navy-700 bg-navy-900 p-4" aria-label={`${item.name} details`} data-testid="piece-detail">
      <div>
        <h4 className="font-heading text-base font-semibold text-ivory">{item.name}</h4>
        <p className="text-xs text-ivory/70">
          {pick.estimated
            ? `Typical price for this style: ${formatUsd(min)}–${formatUsd(max)}.`
            : `${pick.shops} shop ${pick.shops === 1 ? 'price' : 'prices'} found, from ${formatUsd(pick.low ?? pick.price)} to ${formatUsd(pick.high ?? pick.price)}.`}{' '}
          Search: “{item.query}”
        </p>
      </div>

      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() =>
          onAdd({ kind: item.kind, title: `${item.name} (estimate)`, price: estimateMid(item.kind, style), estimated: true, source: null, link: null, imageUrl: null })
        }
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add estimate to list
      </Button>

      <div className="space-y-2">
        <h5 className="text-xs font-semibold uppercase tracking-wide text-ivory/70">Similar products</h5>
        {searching && <p className="text-xs text-ivory/60">Searching…</p>}
        {!searching && results.length === 0 && <p className="text-xs text-ivory/60">Live prices are not available right now. Use the shop links below.</p>}
        <ul className="space-y-2">
          {results.map((p) => (
            <li key={p.link} className="flex gap-3 rounded-md border border-navy-700 p-2" data-testid="product">
              {p.imageUrl && <img src={p.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-14 w-14 shrink-0 rounded object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs font-medium text-ivory">{p.title}</p>
                <p className="text-xs text-ivory/70">
                  {p.priceText ?? 'Price on site'} · {p.source}
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <a href={p.link} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-[32px] items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover">
                    View <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                  {p.price !== null && (
                    <button
                      type="button"
                      className="inline-flex min-h-[32px] items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover"
                      onClick={() => onAdd({ kind: item.kind, title: p.title, price: p.price ?? 0, estimated: false, source: p.source, link: p.link, imageUrl: p.imageUrl })}
                    >
                      <Plus className="h-3 w-3" aria-hidden="true" /> Add
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h5 className="text-xs font-semibold uppercase tracking-wide text-ivory/70">Search the shops</h5>
        <ul className="flex flex-wrap gap-2">
          {retailerLinks(item.query).map((r) => (
            <li key={r.name}>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[36px] items-center gap-1 rounded-md border border-navy-600 px-3 text-xs font-medium text-ivory hover:border-amber-500 hover:text-accent"
              >
                {r.name} <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
