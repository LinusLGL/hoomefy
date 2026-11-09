/**
 * ParanormalShadow
 *
 * A blurred humanlike silhouette (head, neck, shoulders, torso). It is invisible
 * until an effect reveals it; see shadowEffects.ts for `flashShadow`,
 * `crossShadow` and `useLurkOnHover`.
 *
 * Decorative only: `aria-hidden`, `pointer-events: none`.
 */

import { forwardRef, type CSSProperties } from 'react';
import { cn } from '@/utils/cn';

interface ParanormalShadowProps {
  className?: string;
  style?: CSSProperties;
  /** `fixed` positions against the viewport (used for the cross-screen shadow). */
  fixed?: boolean;
}

export const ParanormalShadow = forwardRef<HTMLDivElement, ParanormalShadowProps>(function ParanormalShadow(
  { className, style, fixed = false },
  ref
) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-hf-shadow=""
      className={cn('hf-shadow', fixed && 'hf-shadow--fixed', className)}
      style={style}
    >
      <svg viewBox="0 0 120 300" preserveAspectRatio="xMidYMax meet" focusable="false">
        <defs>
          <radialGradient id="hf-shadow-fade" cx="50%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#000" stopOpacity="0.96" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
          </radialGradient>
        </defs>
        <ellipse cx="60" cy="34" rx="19" ry="24" fill="url(#hf-shadow-fade)" />
        <path
          d="M50 54 L70 54 L72 66 C96 72 108 86 110 116 L114 214 C100 216 92 214 88 206 L84 150 L82 300 L66 300 L62 196 L58 196 L54 300 L38 300 L36 150 L32 206 C28 214 20 216 6 214 L10 116 C12 86 24 72 48 66 Z"
          fill="url(#hf-shadow-fade)"
        />
      </svg>
    </div>
  );
});
