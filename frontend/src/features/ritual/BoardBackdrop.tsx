/**
 * BoardBackdrop
 *
 * The Haunted Design Studio's table: the Ouija board with its blank polaroid, fixed behind the whole page and
 * lit by candles that never quite hold still. All movement is CSS (opacity and transform only), so it costs
 * almost nothing:
 *   - a glow over each of the two candles drawn on the board, flickering out of step with each other,
 *   - a warm light that wanders across the board and a shade that breathes with it,
 *   - a few specks of dust drifting up through the candlelight.
 * Under reduced motion the lights stay on but nothing moves.
 *
 * It sits behind the page content (z-index -1 inside the app layer) and ignores the pointer.
 */

import { useMemo } from 'react';
import { seeded } from '@/features/haunting/env';
import { BOARD, coverPlacement } from './geometry';
import { useViewportSize } from './useViewportSize';

interface Speck {
  left: number;
  top: number;
  size: number;
  rise: number;
  drift: number;
  dur: number;
  delay: number;
  alpha: number;
}

const SPECK_COUNT = 16;

interface BoardBackdropProps {
  /** Tablet and phone: the polaroid is shown in the page itself, so the table behind is darkened and softened. */
  dim?: boolean;
}

export function BoardBackdrop({ dim = false }: BoardBackdropProps) {
  const view = useViewportSize();
  const p = coverPlacement(view);
  const s = p.scale;

  const specks = useMemo<Speck[]>(() => {
    const rnd = seeded(1313);
    return Array.from({ length: SPECK_COUNT }, () => ({
      left: 6 + rnd() * 88,
      top: 30 + rnd() * 68,
      size: 1.5 + rnd() * 2.5,
      rise: 90 + rnd() * 170,
      drift: (rnd() - 0.5) * 70,
      dur: 11 + rnd() * 12,
      delay: -rnd() * 20,
      alpha: 0.25 + rnd() * 0.4,
    }));
  }, []);

  return (
    <div className="rt-board" aria-hidden="true" data-testid="ouija-board" data-dim={dim ? 'true' : 'false'}>
      <div className="rt-board__art" style={{ left: p.left, top: p.top, width: p.width, height: p.height }}>
        <img className="rt-board__img" src={BOARD.src} alt="" draggable={false} />
        {BOARD.flames.map((f, i) => (
          <span
            key={f.id}
            className="rt-board__glow"
            style={{ left: f.x * s, top: f.y * s, width: 560 * s, height: 560 * s, animationDelay: `${i * -1.7}s`, animationDuration: `${3.1 + i * 0.9}s` }}
          />
        ))}
        <span className="rt-board__wander" />
      </div>
      <div className="rt-board__shade" />
      <div className="rt-board__specks">
        {specks.map((k, i) => (
          <span
            key={i}
            className="rt-speck"
            style={{
              left: `${k.left}%`,
              top: `${k.top}%`,
              width: k.size,
              height: k.size,
              animationDuration: `${k.dur}s`,
              animationDelay: `${k.delay}s`,
              ['--rt-a' as string]: k.alpha,
              ['--rt-rise' as string]: `${-k.rise}px`,
              ['--rt-drift' as string]: `${k.drift}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
