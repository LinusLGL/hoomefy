/**
 * FloatingGhosts
 *
 * Translucent ghosts drifting slowly along the bottom of the screen in the Haunted
 * experience. Pure CSS animation (transform and opacity only), so they cost no
 * JavaScript per frame.
 *
 * How many: one per uncleared room of the active house, capped at 3, never fewer than
 * one (see `ghostCount`). Clearing rooms thins the haunting out. Mobile shows at most 2.
 *
 * Decorative: `aria-hidden`, `pointer-events: none`, low opacity, screen-blended so they
 * never darken or obscure text. With reduced motion they stand still and are fainter.
 */

import { useMemo } from 'react';
import { ghostCount } from '@/features/mansion/spirits';
import { useUnclearedRooms } from '@/features/mansion/mansionStore';
import { useHauntingEnv } from './hauntingEnvContext';

interface GhostSpec {
  id: number;
  left: string;
  size: number;
  drift: string;
  driftSeconds: number;
  bobSeconds: number;
  delay: number;
  opacity: number;
}

const SPECS: readonly GhostSpec[] = [
  { id: 0, left: '8%', size: 130, drift: '34vw', driftSeconds: 78, bobSeconds: 7, delay: -12, opacity: 0.17 },
  { id: 1, left: '52%', size: 96, drift: '-30vw', driftSeconds: 104, bobSeconds: 9, delay: -46, opacity: 0.13 },
  { id: 2, left: '76%', size: 160, drift: '-38vw', driftSeconds: 132, bobSeconds: 11, delay: -80, opacity: 0.15 },
];

export function GhostSvg({ eyes = true }: { eyes?: boolean }) {
  return (
    <svg viewBox="0 0 100 150" width="100%" height="100%" focusable="false" aria-hidden="true">
      <defs>
        <linearGradient id="hf-ghost-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f2f6fb" stopOpacity="0.62" />
          <stop offset="0.6" stopColor="#d3dceb" stopOpacity="0.4" />
          <stop offset="1" stopColor="#bcc8dc" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M50 4 C28 4 14 22 14 46 L14 112 C14 120 10 126 6 132 C14 130 18 134 22 142 C27 134 33 134 38 142 C43 134 49 134 54 142 C59 134 65 134 70 142 C75 134 81 134 86 142 C88 133 92 130 94 132 C90 126 86 120 86 112 L86 46 C86 22 72 4 50 4Z"
        fill="url(#hf-ghost-body)"
      />
      {eyes && (
        <>
          <ellipse cx="38" cy="44" rx="5" ry="8.5" fill="#0b0809" opacity="0.42" />
          <ellipse cx="62" cy="44" rx="5" ry="8.5" fill="#0b0809" opacity="0.42" />
          <ellipse cx="50" cy="67" rx="3.2" ry="7" fill="#0b0809" opacity="0.26" />
        </>
      )}
    </svg>
  );
}

export function FloatingGhosts() {
  const uncleared = useUnclearedRooms();
  const { mobile, reducedMotion } = useHauntingEnv();
  const count = Math.min(ghostCount(uncleared), mobile ? 2 : 3);
  const ghosts = useMemo(() => SPECS.slice(0, count), [count]);

  return (
    <div className="hf-ghosts" aria-hidden="true" data-testid="floating-ghosts" data-count={count} data-still={reducedMotion ? 'true' : 'false'}>
      {ghosts.map((g) => (
        <div
          key={g.id}
          className="hf-ghost"
          data-testid="floating-ghost"
          style={
            {
              left: g.left,
              width: g.size,
              height: g.size * 1.5,
              opacity: reducedMotion ? g.opacity * 0.6 : g.opacity * 1.35,
              '--hf-drift': g.drift,
              '--hf-drift-s': `${g.driftSeconds}s`,
              '--hf-bob-s': `${g.bobSeconds}s`,
              '--hf-delay': `${g.delay}s`,
            } as React.CSSProperties
          }
        >
          <div className="hf-ghost__bob">
            <GhostSvg />
          </div>
        </div>
      ))}
    </div>
  );
}
