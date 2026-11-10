/**
 * Where things are in the two pieces of artwork, and how to place them on a screen of any size.
 *
 * All numbers are pixels of the artwork itself (both pictures are 1672 x 941). They were measured from the images
 * (see scripts/build-ritual-assets.mjs, which also writes the candle numbers to candles.json; a unit test keeps the
 * two in step). Everything here is pure, so it is easy to test.
 */

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A picture placed on screen: the scale it is drawn at and where its top-left corner lands. */
export interface Placement {
  scale: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

export const ART: Size = { width: 1672, height: 941 };

/** The Ouija board with its blank polaroid. */
export const BOARD = {
  src: '/images/haunted/ritual/ouija-board.webp',
  ...ART,
  /** The whole polaroid, white border and all. */
  card: { x: 646, y: 267, w: 375, h: 432 } as Rect,
  /** The window in the polaroid where the photograph shows. */
  window: { x: 672, y: 294, w: 324, h: 317 } as Rect,
  /** The two candles that are drawn on the board, as the centres of their flames. */
  flames: [
    { id: 'top-left', x: 118, y: 32 },
    { id: 'bottom-right', x: 1650, y: 790 },
  ],
} as const;

export type CandleId = 'top' | 'left' | 'right' | 'bottom-left' | 'bottom-right';

export interface CandleSpec {
  /** 1 to 5, the order they are read in for the keyboard and the screen reader. */
  n: number;
  id: CandleId;
  /** Name used in labels: "Light the left candle". */
  label: string;
  /** x of the wick, y of the flame tip, y where the flame meets the wick, and half the flame's width. */
  cx: number;
  tip: number;
  end: number;
  half: number;
  /** The patch of light this candle adds (a picture of that size, placed at x, y). */
  patch: Rect & { src: string };
}

const patch = (n: number, x: number, y: number, w: number, h: number) => ({ x, y, w, h, src: `/images/haunted/ritual/candle-${n}.webp` });

/** The five candles of the circle, with the light each one adds (the candle-N.webp files). */
export const CANDLES: readonly CandleSpec[] = [
  { n: 1, id: 'top', label: 'top', cx: 839, tip: 183, end: 217, half: 7, patch: patch(1, 747, 91, 184, 218) },
  { n: 2, id: 'left', label: 'left', cx: 435, tip: 356, end: 394, half: 8, patch: patch(2, 332, 253, 206, 244) },
  { n: 3, id: 'right', label: 'right', cx: 1226, tip: 360, end: 397, half: 9, patch: patch(3, 1126, 260, 200, 237) },
  { n: 4, id: 'bottom-left', label: 'lower left', cx: 575, tip: 629, end: 666, half: 9, patch: patch(4, 475, 529, 200, 237) },
  { n: 5, id: 'bottom-right', label: 'lower right', cx: 1098, tip: 635, end: 676, half: 10, patch: patch(5, 987, 524, 222, 263) },
];

export const CHAMBER = {
  src: '/images/haunted/ritual/chamber-unlit.webp',
  ...ART,
  /** The middle of the pentagram, where the message appears. */
  centre: { x: 840, y: 470 },
  /** Everything that must stay on screen: all five candles with some room around them. */
  ring: { x: 330, y: 120, w: 1010, h: 710 } as Rect,
};

export const CANDLE_SOUNDS = [1, 2, 3, 4, 5].map((n) => `/audio/ritual/script${n}.mp3`);

/** Draw `art` so it covers the whole viewport (some of it may be cropped). */
export function coverPlacement(view: Size, art: Size = ART): Placement {
  const scale = Math.max(view.width / art.width, view.height / art.height);
  const width = art.width * scale;
  const height = art.height * scale;
  return { scale, left: (view.width - width) / 2, top: (view.height - height) / 2, width, height };
}

/**
 * Draw the chamber as large as possible while keeping `must` (the candles) fully on screen. On a normal landscape
 * screen that is the same as covering the screen. On a tall phone the picture is smaller than the screen, and the
 * remaining space is left dark.
 */
export function chamberPlacement(view: Size, art: Size = ART, must: Rect = CHAMBER.ring): Placement {
  const cover = Math.max(view.width / art.width, view.height / art.height);
  const keep = Math.min(view.width / must.w, view.height / must.h);
  const scale = Math.min(cover, keep);
  return {
    scale,
    left: offsetOnAxis(view.width, art.width * scale, (must.x + must.w / 2) * scale),
    top: offsetOnAxis(view.height, art.height * scale, (must.y + must.h / 2) * scale),
    width: art.width * scale,
    height: art.height * scale,
  };
}

/**
 * Where the picture starts along one axis: the middle of the region that must stay visible goes to the middle of the
 * screen. Where the picture is big enough to fill the screen on this axis, it is never slid so far that its own edge shows.
 */
function offsetOnAxis(viewLength: number, drawnLength: number, mustCentre: number): number {
  const centred = viewLength / 2 - mustCentre;
  if (drawnLength >= viewLength) return Math.min(0, Math.max(viewLength - drawnLength, centred));
  return centred;
}

/** Where a rectangle of the artwork lands on screen. */
export function place(rect: Rect, p: Placement): Rect {
  return { x: p.left + rect.x * p.scale, y: p.top + rect.y * p.scale, w: rect.w * p.scale, h: rect.h * p.scale };
}

/** A rectangle expressed as percentages of `region`, for positioning children inside a box that shows that region. */
export function within(rect: Rect, region: Rect): { left: string; top: string; width: string; height: string } {
  const pct = (v: number) => `${+(v * 100).toFixed(3)}%`;
  return {
    left: pct((rect.x - region.x) / region.w),
    top: pct((rect.y - region.y) / region.h),
    width: pct(rect.w / region.w),
    height: pct(rect.h / region.h),
  };
}

/** The part of the board shown in the in-page polaroid on tablets and phones: the card with a little board around it. */
export const BOARD_CROP: Rect = { x: 586, y: 226, w: 494, h: 520 };

/** CSS that makes a box with the aspect ratio of `region` show just that part of the artwork as its background. */
export function cropBackground(region: Rect, art: Size = ART): { backgroundSize: string; backgroundPosition: string; aspectRatio: string } {
  const px = (v: number) => `${+v.toFixed(3)}%`;
  return {
    backgroundSize: `${px((art.width / region.w) * 100)} auto`,
    backgroundPosition: `${px((region.x / (art.width - region.w)) * 100)} ${px((region.y / (art.height - region.h)) * 100)}`,
    aspectRatio: `${region.w} / ${region.h}`,
  };
}

/** Wide enough for the three-column studio (Tailwind's lg). */
export const WIDE_QUERY_MIN = 1024;
