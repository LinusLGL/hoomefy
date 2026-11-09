/**
 * RoomViewer
 *
 * Opens a Haunted room's painting full-screen. A bottle of holy water is hidden somewhere in each
 * painting; clicking it collects it (one is enough). The ghost's speech bubble gives the clue.
 *
 * It sits above the candlelight darkness so the painting is fully visible, and is a modal dialog:
 * the page behind is inert, Tab stays inside, Escape or a click outside closes it, and focus goes
 * back to the card that opened it.
 */

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { HolyWaterBottle } from '@/components/icons/HolyWaterBottle';
import { ROOMS } from './rooms';
import { useHolyWaterStore } from './holyWaterStore';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function RoomViewer() {
  const openRoom = useHolyWaterStore((s) => s.openRoom);
  const foundIn = useHolyWaterStore((s) => s.foundIn);
  const cured = useHolyWaterStore((s) => s.cured);
  const close = useHolyWaterStore((s) => s.closeRoomViewer);
  const collect = useHolyWaterStore((s) => s.collect);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!openRoom) return undefined;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const app = document.querySelector('.hf-app');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    app?.setAttribute('inert', '');
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialogRef.current?.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey, true);

    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = previousOverflow;
      app?.removeAttribute('inert');
      opener?.focus?.();
    };
  }, [openRoom, close]);

  if (!openRoom) return null;
  const room = ROOMS[openRoom];
  const showBottle = !foundIn && !cured;
  const justFound = foundIn === openRoom;

  return createPortal(
    <div
      ref={dialogRef}
      className="hf-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={`${room.name}, enlarged`}
      data-testid="room-viewer"
      data-room={room.id}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="hf-viewer__stage">
        <figure className="hf-viewer__figure">
          <div className="hf-viewer__canvas">
            <img className="hf-viewer__image" src={room.image} alt={room.alt} width={1672} height={941} decoding="async" />
            {showBottle && (
              <button
                type="button"
                className="hf-viewer__bottle"
                style={{ left: `${room.bottle.x}%`, top: `${room.bottle.y}%` }}
                aria-label="Holy water, hidden in this room. Collect it."
                data-testid={`holy-water-${room.id}`}
                onClick={() => collect(room.id)}
              >
                <HolyWaterBottle className="hf-viewer__bottle-art" />
              </button>
            )}
          </div>
          <figcaption className="hf-viewer__caption">
            <span>{room.name}</span>
            <span className="hf-viewer__found" role="status">
              {justFound ? 'Holy water collected. Take it to the ghost.' : ''}
            </span>
          </figcaption>
        </figure>
      </div>
      <button ref={closeRef} type="button" className="hf-viewer__close" aria-label="Close the room" onClick={close}>
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>,
    document.body
  );
}
