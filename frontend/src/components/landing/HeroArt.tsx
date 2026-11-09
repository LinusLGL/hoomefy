import { HERO_ART } from './heroArtPaths';

/**
 * The soft sage waves at the bottom of the Elegant hero (from "Scandinavian Dreams by Hoomefy").
 *
 * Decorative only. It draws, from back to front: the pale fill (with the sage tint on the left and
 * in the lower-right corner), the cream band on the left wave, and the darker crescent at the
 * lower right. The fill also hides the lower edge of the hero photograph. The colours at the very
 * bottom row match the `.hf-styles` section background so the two join without a seam.
 */
export function HeroArt() {
  const { width, height, fill, swoosh, cream } = HERO_ART;
  return (
    <svg
      className="hf-hero__waves"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMin slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Sage on the left, fading toward the middle: colour depends on x + y (a diagonal ramp). */}
        <linearGradient id="hf-wave-left" gradientUnits="userSpaceOnUse" x1="367" y1="367" x2="668" y2="668">
          <stop offset="0" stopColor="#B5C1B8" />
          <stop offset="0.23" stopColor="#B6C1BA" />
          <stop offset="0.48" stopColor="#BAC5BE" />
          <stop offset="0.55" stopColor="#C4CBC5" />
          <stop offset="0.62" stopColor="#CAD0CA" />
          <stop offset="0.73" stopColor="#D7DAD5" />
          <stop offset="0.87" stopColor="#E2E2DE" />
          <stop offset="1" stopColor="#E4E3DF" />
        </linearGradient>
        {/* A second ramp from the lower-right corner. */}
        <linearGradient id="hf-wave-right" gradientUnits="userSpaceOnUse" x1="1780" y1="819" x2="1520" y2="559">
          <stop offset="0" stopColor="#C0C9C2" stopOpacity="1" />
          <stop offset="0.06" stopColor="#C0C9C2" stopOpacity="1" />
          <stop offset="0.37" stopColor="#C0C9C2" stopOpacity="0.72" />
          <stop offset="0.75" stopColor="#C0C9C2" stopOpacity="0.17" />
          <stop offset="1" stopColor="#C0C9C2" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hf-swoosh" gradientUnits="userSpaceOnUse" x1="1346" y1="0" x2="1780" y2="0">
          <stop offset="0" stopColor="#9FAEA8" />
          <stop offset="0.45" stopColor="#A4B2AC" />
          <stop offset="1" stopColor="#B3BFB9" />
        </linearGradient>
        <linearGradient id="hf-cream" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="400" y2="0">
          <stop offset="0" stopColor="#F3EBDF" />
          <stop offset="1" stopColor="#EFE9DF" />
        </linearGradient>
      </defs>
      <path d={cream} fill="url(#hf-cream)" />
      <path d={fill} fill="#E4E3DF" />
      <path d={fill} fill="url(#hf-wave-left)" />
      <path d={fill} fill="url(#hf-wave-right)" />
      <path d={swoosh} fill="url(#hf-swoosh)" />
    </svg>
  );
}
