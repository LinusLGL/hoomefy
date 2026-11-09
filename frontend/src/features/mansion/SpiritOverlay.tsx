/**
 * SpiritOverlay (Haunted only)
 *
 * Ghosts drawn over a photograph. Spirits that were driven out play a short "leaving"
 * animation and then disappear; spirits that remain keep drifting. Decorative:
 * `aria-hidden`, `pointer-events: none`. The outcome is also stated in text (OutcomeBanner).
 */

import { useEffect, useState } from 'react';
import type { FurnitureKey } from '@/types';
import { GhostSvg } from '@/features/haunting/FloatingGhosts';

export interface OverlaySpirit {
  key: FurnitureKey;
  /** `leaving` plays the exit animation; `lingering` stays. */
  state: 'lingering' | 'leaving';
}

const SLOTS = [
  { left: '12%', top: '26%', size: '18%', leave: '-14%' },
  { left: '44%', top: '36%', size: '15%', leave: '6%' },
  { left: '72%', top: '20%', size: '17%', leave: '12%' },
];

export function SpiritOverlay({ spirits }: { spirits: readonly OverlaySpirit[] }) {
  // Once the exit animation has played, take the leaving spirits out of the layout entirely.
  const [gone, setGone] = useState(false);
  const hasLeaving = spirits.some((s) => s.state === 'leaving');
  useEffect(() => {
    if (!hasLeaving) return undefined;
    const id = window.setTimeout(() => setGone(true), 2800);
    return () => window.clearTimeout(id);
  }, [hasLeaving]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" data-testid="spirit-overlay">
      {spirits.map((s, i) => {
        const slot = SLOTS[i % SLOTS.length];
        const state = s.state === 'leaving' && gone ? 'gone' : s.state;
        return (
          <div
            key={s.key}
            className="hf-spirit"
            data-testid="spirit"
            data-state={state}
            data-furniture={s.key}
            style={{ left: slot.left, top: slot.top, width: slot.size, aspectRatio: '2 / 3', '--hf-leave-x': slot.leave } as React.CSSProperties}
          >
            <GhostSvg />
          </div>
        );
      })}
    </div>
  );
}
