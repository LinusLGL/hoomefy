/**
 * DesignSummary: what was asked for, in plain words, and the exact prompt that was sent.
 */

import { useStudioStore } from '@/stores/studioStore';
import { ROOM_TYPES } from '@/types';
import { STYLES } from '@/features/studio/styles';
import { cleanText } from '@/features/studio/prompt';

export function DesignSummary() {
  const roomType = useStudioStore((s) => s.roomType);
  const style = useStudioStore((s) => s.selectedStyle);
  const preferences = useStudioStore((s) => s.preferences);
  const version = useStudioStore((s) => s.history.find((v) => v.id === s.activeVersionId) ?? null);
  const count = useStudioStore((s) => s.history.length);

  const rows: Array<[string, string]> = [
    ['Room', roomType ? ROOM_TYPES[roomType].name : 'Not chosen yet'],
    ['Style', style ? (style === 'custom' ? 'Custom: ' + (cleanText(preferences.customStyle, 80) || 'describe it on the left') : STYLES[style].name) : 'Not chosen yet'],
    ['Palette', preferences.colorPalette ? preferences.colorPalette[0].toUpperCase() + preferences.colorPalette.slice(1) : 'Style default'],
    ['Intensity', `${Math.round((preferences.intensity ?? 0.7) * 100)}%`],
    ['Budget', preferences.budget ? `$${preferences.budget.toLocaleString('en-US')}` : 'Not set'],
  ];

  return (
    <div className="space-y-4 lg:space-y-2" data-testid="design-summary">
      <h3 className="text-sm font-semibold text-ivory">Current design</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm lg:gap-y-1 lg:text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ivory/70">{k}</dt>
            <dd className="text-ivory">{v}</dd>
          </div>
        ))}
      </dl>

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
