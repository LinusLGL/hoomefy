/**
 * ChromaticAberrationEffect
 *
 * Defines the SVG filter `#hf-chromatic`. It splits the source into its R, G and
 * B channels, offsets red and blue in opposite directions, and screen-blends
 * them back together. Applied with `filter: url(#hf-chromatic)` this separates
 * the *real* rendered interface (text, images, cards), not an overlay copy.
 *
 * The component renders only the (invisible) filter definition; the offset is
 * driven imperatively so GSAP can tween it without React re-renders.
 */

import { forwardRef, useImperativeHandle, useRef } from 'react';

export const CHROMATIC_FILTER_ID = 'hf-chromatic';

export interface ChromaticHandle {
  /** Horizontal offset in px for the red (+) and blue (-) channels. */
  setOffset: (px: number, verticalPx?: number) => void;
}

export const ChromaticAberrationEffect = forwardRef<ChromaticHandle>(function ChromaticAberrationEffect(_props, ref) {
  const redRef = useRef<SVGFEOffsetElement>(null);
  const blueRef = useRef<SVGFEOffsetElement>(null);

  useImperativeHandle(ref, () => ({
    setOffset: (px, verticalPx = 0) => {
      redRef.current?.setAttribute('dx', String(px));
      redRef.current?.setAttribute('dy', String(verticalPx));
      blueRef.current?.setAttribute('dx', String(-px));
      blueRef.current?.setAttribute('dy', String(-verticalPx));
    },
  }));

  return (
    <filter
      id={CHROMATIC_FILTER_ID}
      x="-4%"
      y="-4%"
      width="108%"
      height="108%"
      colorInterpolationFilters="sRGB"
    >
      <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
      <feOffset ref={redRef} in="r" dx="0" dy="0" result="ro" />
      <feOffset ref={blueRef} in="b" dx="0" dy="0" result="bo" />
      <feBlend in="ro" in2="g" mode="screen" result="rg" />
      <feBlend in="rg" in2="bo" mode="screen" />
    </filter>
  );
});
