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
      <section className="rounded-xl border border-accent/40 bg-navy-800 p-5" aria-label="Haunting report" data-testid="spirit-report" data-state="cleared">
        <p className="flex items-center gap-2 font-heading text-lg font-semibold text-accent">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
          The {roomName} is at peace
        </p>
        <p className="mt-1 text-sm text-ivory/80">Every spirit that lived here has gone. Try another room.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-amber-600/50 bg-navy-800 p-5" aria-label="Haunting report" data-testid="spirit-report" data-state="haunted">
      <h3 className="flex items-center gap-2 font-heading text-lg font-semibold text-ivory">
        <Ghost className="h-5 w-5 text-accent" aria-hidden="true" />
        {room.spirits.length === 1 ? 'A spirit lingers here' : `${room.spirits.length} spirits linger here`}
      </h3>
      <ul className="mt-3 space-y-2">
        {room.spirits.map((key) => (
          <li key={key} className="text-sm text-ivory/90" data-spirit={key}>
            <span className="font-semibold">{furnitureInfo(key).spirit}</span>
            <span className="text-ivory/75">, bound to the {furnitureInfo(key).label.toLowerCase()}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-ivory/75">Replace the furniture they cling to, then develop the photograph to drive them out.</p>
    </section>
  );
}
