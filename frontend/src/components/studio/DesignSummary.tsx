/**
 * DesignSummary: what was asked for in plain words, the pieces found in the design with what they cost, and the
 * exact prompt that was sent.
 */

import { useStudioStore } from '@/stores/studioStore';
import { STYLES } from '@/features/studio/styles';
import { cleanText } from '@/features/studio/prompt';
import { useFurnitureStore } from '@/features/furniture/furnitureStore';
import { pickPrice, totalPrice } from '@/features/furniture/items';
import { formatUsd } from '@/features/furniture/estimate';
import { ItemScan } from './ItemScan';

export function DesignSummary() {
  const style = useStudioStore((s) => s.selectedStyle);
  const preferences = useStudioStore((s) => s.preferences);
  const version = useStudioStore((s) => s.history.find((v) => v.id === s.activeVersionId) ?? null);
  const count = useStudioStore((s) => s.history.length);
  const { versionId, items, prices } = useFurnitureStore();

  const wishes = cleanText(preferences.customInstructions, 120);
  const rows: Array<[string, string]> = [
    ['Style', style ? (style === 'custom' ? 'Custom: ' + (cleanText(preferences.customStyle, 80) || 'describe it on the left') : STYLES[style].name) : 'Not chosen yet'],
    ['Wishes', wishes || 'None'],
    ['Intensity', `${Math.round((preferences.intensity ?? 0.7) * 100)}%`],
    ['Budget', preferences.budget ? `$${preferences.budget.toLocaleString('en-US')}` : 'Not set'],
  ];

  const found = version && versionId === version.id ? items : [];
  const picks = found.map((item) => ({ item, pick: pickPrice(item, prices[item.id], version?.style ?? style) }));
  const total = totalPrice(picks.map((p) => p.pick));
  const fromShops = picks.filter((p) => !p.pick.estimated).length;

  return (
    <div className="space-y-4 lg:space-y-2" data-testid="design-summary">
      <h3 className="text-sm font-semibold text-ivory">Current design</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm lg:gap-y-1 lg:text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ivory/70">{k}</dt>
            <dd className="break-words text-ivory">{v}</dd>
          </div>
        ))}
      </dl>

      {version && (
        <section className="space-y-2 border-t border-navy-700 pt-4 lg:pt-2" aria-label="Pieces in this design" data-testid="summary-items">
          <h4 className="text-sm font-semibold text-ivory">In this design</h4>
          <ItemScan />
          {picks.length > 0 && (
            <>
              <ul className="space-y-1 text-xs">
                {picks.map(({ item, pick }) => (
                  <li key={item.id} className="flex items-baseline justify-between gap-3" data-testid="summary-item">
                    <span className="min-w-0 truncate text-ivory">{item.name}</span>
                    <span className="shrink-0 tabular-nums text-ivory/80">
                      {formatUsd(pick.price)}
                      {pick.estimated ? ' est.' : ''}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex items-baseline justify-between gap-3 border-t border-navy-700 pt-2 text-sm">
                <span className="text-ivory/80">About</span>
                <span className="font-heading text-lg font-semibold text-ivory" data-testid="summary-total">
                  {formatUsd(total)}
                </span>
              </div>
              <p className="text-xs text-ivory/60">
                {fromShops > 0 ? `${fromShops} of ${picks.length} prices come from shops.` : 'No shop prices were found, so these are typical prices for the style.'}
                {fromShops > 0 && fromShops < picks.length ? ' “est.” is a typical price for the style.' : ''}
              </p>
            </>
          )}
        </section>
      )}

      {version && (
        <div className="space-y-2 border-t border-navy-700 pt-4 text-xs text-ivory/70 lg:space-y-1 lg:pt-2">
          <p>
            {count} {count === 1 ? 'version' : 'versions'} this visit.{' '}
            {version.demo ? 'This one is a demo rendering, not an AI redesign.' : 'Made with FLUX.2 klein 4B.'}
          </p>
          <details>
            <summary className="cursor-pointer text-accent hover:text-accent-hover">View the prompt that was sent</summary>
            <p className="mt-2 select-text break-words text-ivory/80" data-testid="prompt-text">
              {version.prompt}
            </p>
          </details>
        </div>
      )}
    </div>
  );
}
