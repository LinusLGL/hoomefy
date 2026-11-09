/**
 * FurniturePanel
 *
 * Names the furniture in the design and helps the visitor shop for similar pieces.
 *
 *   - Right away: the pieces that usually make up this kind of room, with rough prices for the chosen style.
 *   - On request: a detector running on this device finds the pieces actually in the picture.
 *   - For any piece: search links for well-known shops, live product results when the site has a search key,
 *     and a button to add a piece (or an estimate) to the shopping list.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Plus, ScanSearch, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { useStudioStore } from '@/stores/studioStore';
import { useToast } from '@/hooks/useToast';
import { detectFurniture } from '@/features/furniture/detect';
import { runWithTransformers } from '@/features/furniture/transformersRunner';
import { useFurnitureStore } from '@/features/furniture/furnitureStore';
import { FURNITURE, type FurnitureKindId } from '@/features/furniture/taxonomy';
import { estimateMid, estimateRange, formatUsd, matchLabel, suggestPieces } from '@/features/furniture/estimate';
import { buildSearchQuery, retailerLinks, searchProducts, type ProductResult } from '@/features/furniture/search';
import { useShoppingStore } from '@/features/furniture/shoppingStore';

export function FurniturePanel() {
  const toast = useToast();
  const roomType = useStudioStore((s) => s.roomType);
  const style = useStudioStore((s) => s.selectedStyle);
  const palette = useStudioStore((s) => s.preferences.colorPalette);
  const activeId = useStudioStore((s) => s.activeVersionId);
  const version = useStudioStore((s) => s.history.find((v) => v.id === s.activeVersionId) ?? null);

  const { pieces, versionId, status, percent, error, selected, select } = useFurnitureStore();
  const detectedHere = versionId === activeId ? pieces : [];
  const add = useShoppingStore((s) => s.add);

  const startDetect = async () => {
    if (!version) return;
    const store = useFurnitureStore.getState();
    store.setStatus('loading', 0);
    try {
      const found = await detectFurniture(version.blob, runWithTransformers, (p) => {
        useFurnitureStore.getState().setStatus(p.stage === 'loading' ? 'loading' : 'detecting', p.percent ?? 0);
      });
      useFurnitureStore.getState().finish(version.id, found);
      if (found.length === 0) toast.info('Nothing recognised', 'Try the suggested pieces below.');
    } catch {
      useFurnitureStore.getState().fail('The on-device detector could not run in this browser. The suggested pieces below still work.');
    }
  };

  const suggested = useMemo(() => suggestPieces(roomType), [roomType]);
  const detectedKinds = new Set(detectedHere.map((p) => p.kind));
  const extraSuggestions = suggested.filter((k) => !detectedKinds.has(k));
  const busy = status === 'loading' || status === 'detecting';

  return (
    <div className="space-y-5" data-testid="furniture-panel">
      <div>
        <h3 className="text-sm font-semibold text-ivory">Furniture in this design</h3>
        <p className="mt-1 text-xs text-ivory/70">
          {version
            ? 'Find the pieces in your picture, then look for similar ones in shops.'
            : 'Pieces that usually suit this room. Generate a design to find the ones in your picture.'}
        </p>
      </div>

      {version && (
        <div className="space-y-2">
          <Button type="button" variant="secondary" size="sm" onClick={startDetect} disabled={busy} data-testid="detect-furniture">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ScanSearch className="h-4 w-4" aria-hidden="true" />}
            {busy ? (status === 'loading' ? `Preparing detector ${percent}%` : 'Looking…') : detectedHere.length ? 'Find again' : 'Find furniture in my design'}
          </Button>
          <p className="text-xs text-ivory/60">Runs on your device. The first time it downloads a small model (about 150 MB) that your browser keeps.</p>
          {error && (
            <p className="text-xs text-danger" role="alert">
              {error}
            </p>
          )}
        </div>
      )}

      {detectedHere.length > 0 && (
        <PieceList title="Found in your design" kinds={detectedHere.map((p) => p.kind)} confidence={new Map(detectedHere.map((p) => [p.kind, p.confidence]))} selected={selected} onSelect={select} style={style} />
      )}
      {extraSuggestions.length > 0 && (
        <PieceList title={detectedHere.length ? 'Also suits this room' : 'Suggested pieces'} kinds={extraSuggestions} selected={selected} onSelect={select} style={style} />
      )}

      {selected && (
        <PieceDetail
          key={selected}
          kind={selected}
          style={style}
          palette={palette}
          onAdd={(item) => {
            if (add(item)) toast.success('Added to your list', item.title);
            else toast.info('Already on your list', item.title);
          }}
        />
      )}
      <ActiveWatcher activeId={activeId} />
    </div>
  );
}

/** Clears the selection when the design on the canvas changes. */
function ActiveWatcher({ activeId }: { activeId: string | null }) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    useFurnitureStore.getState().select(null);
  }, [activeId]);
  return null;
}

interface PieceListProps {
  title: string;
  kinds: FurnitureKindId[];
  confidence?: Map<FurnitureKindId, number>;
  selected: FurnitureKindId | null;
  onSelect: (kind: FurnitureKindId | null) => void;
  style: Parameters<typeof estimateRange>[1];
}

function PieceList({ title, kinds, confidence, selected, onSelect, style }: PieceListProps) {
  return (
    <section aria-label={title} className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ivory/70">{title}</h4>
      <ul className="grid grid-cols-1 gap-2">
        {kinds.map((kind) => {
          const [min, max] = estimateRange(kind, style);
          const on = selected === kind;
          const score = confidence?.get(kind);
          return (
            <li key={kind}>
              <button
                type="button"
                onClick={() => onSelect(on ? null : kind)}
                aria-pressed={on}
                data-piece={kind}
                className={cn(
                  'flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-amber-500',
                  on ? 'border-amber-500 bg-amber-500/10 text-ivory' : 'border-navy-700 bg-navy-900 text-ivory hover:border-amber-500/60'
                )}
              >
                <span className="font-medium">
                  {FURNITURE[kind].label}
                  {score !== undefined && <span className="ml-2 text-xs font-normal text-ivory/60">{matchLabel(score)}</span>}
                </span>
                <span className="shrink-0 text-xs text-ivory/70">
                  {formatUsd(min)}–{formatUsd(max)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

interface PieceDetailProps {
  kind: FurnitureKindId;
  style: Parameters<typeof estimateRange>[1];
  palette?: Parameters<typeof buildSearchQuery>[2];
  onAdd: (item: { kind: FurnitureKindId; title: string; price: number; estimated: boolean; source: string | null; link: string | null; imageUrl: string | null }) => void;
}

function PieceDetail({ kind, style, palette, onAdd }: PieceDetailProps) {
  const query = buildSearchQuery(kind, style, palette);
  const [state, setState] = useState<{ status: 'loading' | 'done'; live: boolean; results: ProductResult[] }>({ status: 'loading', live: false, results: [] });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', live: false, results: [] });
    searchProducts(query, controller.signal).then((r) => {
      if (!controller.signal.aborted) setState({ status: 'done', live: r.live, results: r.results });
    });
    return () => controller.abort();
  }, [query]);

  const label = FURNITURE[kind].label;
  const [min, max] = estimateRange(kind, style);

  return (
    <section className="space-y-4 rounded-lg border border-navy-700 bg-navy-900 p-4" aria-label={`${label} details`} data-testid="piece-detail">
      <div>
        <h4 className="font-heading text-base font-semibold text-ivory">{label}</h4>
        <p className="text-xs text-ivory/70">
          Estimated {formatUsd(min)}–{formatUsd(max)} for this style. Search: “{query}”
        </p>
      </div>

      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => onAdd({ kind, title: `${label} (estimate)`, price: estimateMid(kind, style), estimated: true, source: null, link: null, imageUrl: null })}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add estimate to list
      </Button>

      <div className="space-y-2">
        <h5 className="text-xs font-semibold uppercase tracking-wide text-ivory/70">Similar products</h5>
        {state.status === 'loading' && <p className="text-xs text-ivory/60">Searching…</p>}
        {state.status === 'done' && state.results.length === 0 && (
          <p className="text-xs text-ivory/60">Live prices are not available right now. Use the shop links below.</p>
        )}
        <ul className="space-y-2">
          {state.results.map((p) => (
            <li key={p.link} className="flex gap-3 rounded-md border border-navy-700 p-2">
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
                      onClick={() => onAdd({ kind, title: p.title, price: p.price ?? 0, estimated: false, source: p.source, link: p.link, imageUrl: p.imageUrl })}
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
          {retailerLinks(query).map((r) => (
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
