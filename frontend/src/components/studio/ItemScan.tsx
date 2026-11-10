/**
 * ItemScan: says what the studio is doing to find the pieces in the design on the canvas, and lets the visitor
 * start it, repeat it, or use the finder that runs on their own device. Shown at the top of the Summary and
 * Furniture tabs. The scan itself starts by itself when a design is ready (see StudioPage).
 */

import { Loader2, RefreshCw, ScanSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStudioStore } from '@/stores/studioStore';
import { useFurnitureStore } from '@/features/furniture/furnitureStore';
import { scanDesign } from '@/features/furniture/scan';

export function ItemScan() {
  const version = useStudioStore((s) => s.history.find((v) => v.id === s.activeVersionId) ?? null);
  const { versionId, status: storedStatus, error, percent, items, prices } = useFurnitureStore();

  if (!version) return null;
  const here = versionId === version.id;
  const status = here ? storedStatus : 'idle';
  const busy = status === 'loading' || status === 'detecting' || status === 'searching';
  const priced = items.filter((i) => prices[i.id]?.status === 'done').length;

  const run = (method: 'cloud' | 'device') => void scanDesign({ id: version.id, blob: version.blob, style: version.style }, { method, force: true });

  const message =
    status === 'detecting'
      ? 'Looking through your design…'
      : status === 'loading'
      ? `Getting the finder ready on this device… ${percent}%`
      : status === 'searching'
      ? `Searching the shops… ${priced} of ${items.length} priced`
      : status === 'error'
      ? error
      : status === 'done'
      ? items.length > 0
        ? `Found ${items.length} ${items.length === 1 ? 'piece' : 'pieces'} in your design.`
        : 'No furniture was recognised in this design.'
      : 'The pieces in this design have not been looked up yet.';

  return (
    <div className="space-y-2" data-testid="item-scan" data-status={status}>
      <p className="flex items-center gap-2 text-xs text-ivory/80" role={status === 'error' ? 'alert' : 'status'}>
        {busy && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />}
        <span>{message}</span>
      </p>

      {!busy && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => run('cloud')} data-testid="scan-items">
            {status === 'idle' ? <ScanSearch className="h-4 w-4" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            {status === 'idle' ? 'Find the pieces' : status === 'error' ? 'Try again' : 'Look again'}
          </Button>
          {(status === 'error' || status === 'idle') && (
            <Button type="button" variant="ghost" size="sm" onClick={() => run('device')} data-testid="scan-items-device">
              Use this device instead
            </Button>
          )}
        </div>
      )}
      {!busy && (status === 'error' || status === 'idle') && (
        <p className="text-xs text-ivory/60">The finder on this device downloads a small model (about 150 MB) the first time, which your browser then keeps.</p>
      )}
    </div>
  );
}
