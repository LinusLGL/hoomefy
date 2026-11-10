/**
 * OutcomeBanner (Haunted only)
 *
 * Plain-language result of a design: who was driven out, who still lingers, and what to
 * replace next. Announced politely to assistive technology.
 */

import type { JobOutcome } from './mansionStore';
import { ROOM_TYPES } from '@/types';
import { furnitureInfo } from './spirits';
import { useMansionStore, activeHouse } from './mansionStore';

const names = (keys: readonly string[], pick: (k: never) => string) => keys.map((k) => pick(k as never)).join(', ');

export function OutcomeBanner({ outcome, replacedAny }: { outcome: JobOutcome; replacedAny: boolean }) {
  const houseName = useMansionStore((s) => activeHouse(s).name);
  const driven = outcome.driven.length;
  const remaining = outcome.remaining.length;
  const room = ROOM_TYPES[outcome.roomType].name;

  let headline: string;
  let detail: string;

  if (driven > 0) {
    headline = driven === 1 ? 'A spirit has been driven out' : `${driven} spirits have been driven out`;
    detail = `Gone: ${names(outcome.driven, (k) => furnitureInfo(k).spirit)}.`;
  } else if (!replacedAny) {
    headline = 'No furniture was replaced, so the spirits stay';
    detail = 'Choose the pieces they cling to, then develop the photograph again.';
  } else if (outcome.remaining.length === 0 && !outcome.roomCleared) {
    headline = 'There was nothing to drive out';
    detail = 'The furniture you replaced held no spirit.';
  } else {
    headline = 'None of those pieces held a spirit';
    detail = 'The ones that linger are bound to other furniture.';
  }

  const next =
    remaining > 0
      ? `Still lingering: ${names(outcome.remaining, (k) => furnitureInfo(k).spirit)}. Replace the ${names(outcome.remaining, (k) => furnitureInfo(k).label.toLowerCase())} to send them away.`
      : null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="outcome-banner"
      data-driven={driven}
      data-remaining={remaining}
      data-room-cleared={outcome.roomCleared ? 'true' : 'false'}
      className="mb-4 rounded-lg border border-accent/40 bg-navy-900 p-4 lg:mb-2 lg:shrink-0 lg:p-2.5"
    >
      <p className="font-heading text-lg font-semibold text-ivory lg:text-base">{headline}</p>
      <p className="mt-1 text-sm text-ivory/85 lg:text-xs lg:leading-snug">
        <span className="block lg:inline">{detail}</span>
        {next && <span className="mt-1 block lg:ml-1 lg:mt-0 lg:inline">{next}</span>}
      </p>
      {outcome.roomCleared && <p className="mt-2 text-sm font-semibold text-accent lg:mt-1 lg:text-xs">The {room} is at peace.</p>}
      {outcome.houseBuilt && <p className="mt-1 text-sm font-semibold text-accent lg:text-xs">Every room is clear. {houseName} is built.</p>}
    </div>
  );
}
