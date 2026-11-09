/**
 * MansionProgress (Haunted only)
 *
 * The house being built: one slot per room, haunted until a design drives out its last
 * spirit. When all rooms are clear the house is built and the next one can be started.
 */

import { Building2, Check, Ghost } from 'lucide-react';
import { ROOM_TYPES } from '@/types';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { activeHouse, clearedCount, isHouseBuilt, useMansionStore } from './mansionStore';
import { ROOM_SLOTS } from './spirits';

export function MansionProgress({ className }: { className?: string }) {
  const house = useMansionStore((s) => activeHouse(s));
  const houseCount = useMansionStore((s) => s.houses.length);
  const buildNextHouse = useMansionStore((s) => s.buildNextHouse);
  const cleared = clearedCount(house);
  const total = ROOM_SLOTS.length;
  const built = isHouseBuilt(house);

  return (
    <section className={cn('rounded-xl border border-navy-700 bg-navy-800 p-5', className)} aria-label="Your mansion" data-testid="mansion-progress">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Your mansion</p>
          <h3 className="mt-1 flex items-center gap-2 font-heading text-lg font-semibold text-ivory" data-testid="house-name">
            <Building2 className="h-5 w-5" aria-hidden="true" />
            {house.name}
          </h3>
        </div>
        {houseCount > 1 && <p className="text-xs text-ivory/70">{houseCount - 1} built</p>}
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-navy-700"
        role="progressbar"
        aria-label="Rooms cleared"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={cleared}
        aria-valuetext={`${cleared} of ${total} rooms cleared`}
      >
        <div className="h-full rounded-full bg-gradient-to-r from-amber-700 to-amber-500 transition-all duration-700" style={{ width: `${(cleared / total) * 100}%` }} />
      </div>
      <p className="mt-2 text-sm text-ivory/80" data-testid="rooms-cleared">
        {cleared} of {total} rooms cleared
      </p>

      <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {ROOM_SLOTS.map((slot) => {
          const room = house.rooms[slot];
          const isCleared = !!room?.cleared;
          return (
            <li
              key={slot}
              data-room={slot}
              data-cleared={isCleared ? 'true' : 'false'}
              className={cn('flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm', isCleared ? 'bg-accent/10 text-ivory' : 'bg-navy-900 text-ivory/85')}
            >
              <span>{ROOM_TYPES[slot].name}</span>
              <span className={cn('inline-flex items-center gap-1 text-xs font-semibold', isCleared ? 'text-accent' : 'text-ivory/75')}>
                {isCleared ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Ghost className="h-3.5 w-3.5" aria-hidden="true" />}
                {isCleared ? 'Cleared' : room ? `${room.spirits.length} lingering` : 'Haunted'}
              </span>
            </li>
          );
        })}
      </ul>

      {built && (
        <div className="mt-4 rounded-lg border border-accent/40 bg-accent/10 p-3" data-testid="house-built">
          <p className="text-sm font-semibold text-accent">{house.name} is built, and at peace.</p>
          <Button type="button" size="sm" className="mt-3" onClick={buildNextHouse}>
            Build the next house
          </Button>
        </div>
      )}
    </section>
  );
}
