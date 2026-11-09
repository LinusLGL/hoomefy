/**
 * GhostAvatar
 *
 * The ghost that haunts the bottom-right corner of every Haunted page. It appears 3 seconds after
 * the haunted page does and stays. A speech bubble above its head tells the visitor what to do
 * (explore the Haunted Styles, find the holy water) and gives the clue for whichever room is open.
 *
 * Once a holy water is collected a bottle sits beside the ghost. Drag it onto the ghost, or press
 * it and then press the ghost (Enter works on both), to use it. That starts the cure.
 */

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { HolyWaterBottle } from '@/components/icons/HolyWaterBottle';
import { useHauntingStore } from '@/features/haunting/hauntingStore';
import { AVATAR_DELAY_MS, BUBBLE_MS, pickGhostMessage } from './copy';
import { useHolyWaterStore } from './holyWaterStore';

export const AVATAR_SRC = '/images/haunted/avatar.webp';
export const AVATAR_STILL_SRC = '/images/haunted/avatar-still.webp';

/** Dragging starts after the pointer has moved this far, so a plain click still toggles. */
const DRAG_THRESHOLD_PX = 8;

interface BottleSlotProps {
  armed: boolean;
  onToggle: () => void;
  onDropOnGhost: () => void;
  onOverGhost: (over: boolean) => void;
}

function BottleSlot({ armed, onToggle, onDropOnGhost, onOverGhost }: BottleSlotProps) {
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const moved = useRef(false);

  const isGhostAt = (x: number, y: number) => !!document.elementFromPoint(x, y)?.closest('[data-ghost-target]');

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    moved.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    if (!moved.current && Math.hypot(e.clientX - s.x, e.clientY - s.y) < DRAG_THRESHOLD_PX) return;
    moved.current = true;
    setDrag({ x: e.clientX, y: e.clientY });
    onOverGhost(isGhostAt(e.clientX, e.clientY));
  };

  const end = (e: ReactPointerEvent<HTMLButtonElement>, cancelled: boolean) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    start.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (!moved.current) return;
    setDrag(null);
    onOverGhost(false);
    if (!cancelled && isGhostAt(e.clientX, e.clientY)) onDropOnGhost();
  };

  const onClick = () => {
    // The click that follows a drag is not a press.
    if (moved.current) {
      moved.current = false;
      return;
    }
    onToggle();
  };

  return (
    <>
      <button
        type="button"
        className="hf-avatar__bottle"
        data-testid="holy-water-slot"
        data-armed={armed ? 'true' : 'false'}
        data-dragging={drag ? 'true' : 'false'}
        aria-pressed={armed}
        aria-label="Holy water. Drag it onto the ghost, or press it and then press the ghost."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => end(e, false)}
        onPointerCancel={(e) => end(e, true)}
        onClick={onClick}
      >
        <HolyWaterBottle className="hf-avatar__bottle-art" />
      </button>
      {drag && (
        <div className="hf-avatar__drag" style={{ left: drag.x, top: drag.y }} aria-hidden="true" data-testid="holy-water-drag">
          <HolyWaterBottle className="hf-avatar__bottle-art" />
        </div>
      )}
    </>
  );
}

export function GhostAvatar({ reducedMotion }: { reducedMotion: boolean }) {
  const sequence = useHauntingStore((s) => s.sequence);
  const phase = useHauntingStore((s) => s.phase);
  const openRoom = useHolyWaterStore((s) => s.openRoom);
  const foundIn = useHolyWaterStore((s) => s.foundIn);
  const armed = useHolyWaterStore((s) => s.armed);
  const scared = useHolyWaterStore((s) => s.scared);
  const cured = useHolyWaterStore((s) => s.cured);
  const resetCount = useHolyWaterStore((s) => s.resetCount);

  // The ghost only exists once the haunted page has settled, and not after it was dispersed.
  // A reset hides it and it makes its entrance again after the usual delay.
  const active = sequence === 'idle' && phase === 'none' && !cured;
  const [shown, setShown] = useState(false);
  useEffect(() => {
    setShown(false);
    if (!active) return undefined;
    const id = window.setTimeout(() => setShown(true), AVATAR_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [active, resetCount]);

  const message = pickGhostMessage({ openRoom, foundIn, armed, scared });
  const lasting = message.key === 'armed' || message.key.startsWith('clue:');
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [nudge, setNudge] = useState(0);
  const [overGhost, setOverGhost] = useState(false);

  // A new message opens the bubble. Instructions stay up while they apply; the rest fades after a while.
  useEffect(() => {
    if (!shown) {
      setBubbleOpen(false);
      return undefined;
    }
    setBubbleOpen(true);
    if (lasting) return undefined;
    const id = window.setTimeout(() => setBubbleOpen(false), BUBBLE_MS);
    return () => window.clearTimeout(id);
  }, [shown, message.key, lasting, nudge]);

  if (!shown) return null;

  const onGhost = () => {
    if (armed) useHolyWaterStore.getState().startCure();
    else setNudge((n) => n + 1);
  };

  // Two fixed layers on purpose. The ghost's picture has a black background that is removed by blending
  // it onto the page, and a blend only reaches the page when the blended element is not inside another
  // fixed (isolated) layer. So the ghost is its own layer; the bubble and the bottle share the other.
  return (
    <>
      <div className="hf-avatar" data-testid="ghost-avatar" data-still={reducedMotion ? 'true' : 'false'}>
        <div className="hf-avatar__bubble" role="status" data-open={bubbleOpen ? 'true' : 'false'} data-testid="ghost-bubble">
          <p>{message.text}</p>
        </div>
        {foundIn && (
          <BottleSlot
            armed={armed}
            onToggle={() => useHolyWaterStore.getState().setArmed(!armed)}
            onDropOnGhost={() => useHolyWaterStore.getState().startCure()}
            onOverGhost={setOverGhost}
          />
        )}
      </div>
      <button
        type="button"
        className="hf-avatar__ghost"
        data-ghost-target=""
        data-testid="ghost-target"
        data-still={reducedMotion ? 'true' : 'false'}
        data-armed={armed ? 'true' : 'false'}
        data-over={overGhost ? 'true' : 'false'}
        aria-label={armed ? 'The ghost. Press to use the holy water on him.' : 'The ghost guide. Press to hear him again.'}
        onClick={onGhost}
      >
        <img
          className="hf-avatar__img"
          src={reducedMotion ? AVATAR_STILL_SRC : AVATAR_SRC}
          alt=""
          width={128}
          height={128}
          decoding="async"
          draggable={false}
        />
      </button>
    </>
  );
}
