/**
 * SpiritReport (Haunted only)
 *
 * What is haunting the room you have photographed, and what to replace to drive it out.
 * Reads the active house, so it always reflects spirits already cleared by earlier designs.
 */

import { Ghost, Sparkles } from 'lucide-react';
import type { RoomType } from '@/types';
import { ROOM_TYPES } from '@/types';
import { activeHouse, useMansionStore } from './mansionStore';
import { furnitureInfo } from './spirits';

export function SpiritReport({ roomType }: { roomType: RoomType }) {
  const room = useMansionStore((s) => activeHouse(s).rooms[roomType]);
  const roomName = ROOM_TYPES[roomType].name;
  if (!room) return null;

  if (room.cleared) {
    return (
      <section className="rounded-xl border border-accent/40 bg-navy-800 p-5 lg:rounded-none lg:border-x-0 lg:border-t-0 lg:border-b lg:border-navy-700 lg:bg-transparent lg:p-0 lg:pb-2 lg:mb-2" aria-label="Haunting report" data-testid="spirit-report" data-state="cleared">
        <p className="flex items-center gap-2 font-heading text-lg font-semibold text-accent lg:text-sm">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
          The {roomName} is at peace
        </p>
        <p className="mt-1 text-sm text-ivory/80 lg:text-xs">Every spirit that lived here has gone. Try another room.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-amber-600/50 bg-navy-800 p-5 lg:rounded-none lg:border-x-0 lg:border-t-0 lg:border-b lg:border-navy-700 lg:bg-transparent lg:p-0 lg:pb-2 lg:mb-2" aria-label="Haunting report" data-testid="spirit-report" data-state="haunted">
      <h3 className="flex items-center gap-2 font-heading text-lg font-semibold text-ivory lg:text-sm">
        <Ghost className="h-5 w-5 text-accent" aria-hidden="true" />
        {room.spirits.length === 1 ? 'A spirit lingers here' : `${room.spirits.length} spirits linger here`}
      </h3>
      {/* On wide screens the spirits are names on one wrapped line: the ghost icon on the furniture chips shows what each is bound to, and screen readers still hear it. */}
      <ul className="mt-3 space-y-2 lg:mt-1 lg:flex lg:flex-wrap lg:gap-x-2 lg:gap-y-0 lg:space-y-0">
        {room.spirits.map((key, i) => (
          <li key={key} className="text-sm text-ivory/90 lg:text-xs" data-spirit={key}>
            <span className="font-semibold">{furnitureInfo(key).spirit}</span>
            <span className="text-ivory/75 lg:sr-only">, bound to the {furnitureInfo(key).label.toLowerCase()}</span>
            {i < room.spirits.length - 1 && (
              <span aria-hidden="true" className="ml-2 hidden text-ivory/40 lg:inline">
                ·
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-ivory/75 lg:sr-only">Replace the furniture they cling to, then develop the photograph to drive them out.</p>
    </section>
  );
}
