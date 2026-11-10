# Haunted Mansion — Design

## Palette (Haunted)
Warm near-black surfaces, not the cold school greys.

| Role | Value |
|---|---|
| page / panel / border | `#0B0809` / `#17100F` / `#2A1F21` |
| text (bone) | `#E6DCCF` |
| accent surface (crimson velvet) | `#8E1B2C` (hover `#6F1523`) |
| accent text (sage) | `#9DB59A` |
| candle gold (art, cursor glow) | `#E8B76A` |
| moonlight (art) | `#9FB2C6` |

Brand constants live in `HORROR` in `palettes.ts` and are asserted by tests.

## Scenes (`scenes.ts`, procedural)
- `room` — elegant living room (unchanged).
- `mansion` — hero image: moonlit gothic window, crimson drapes, chaise, fireplace + portrait + candelabra, ghost.
- `abandoned` — the same room neglected: dust sheets, cobwebs, no fire (used by the "photo swap" anomaly).
- `hall` — wide backdrop for `HauntedMansionBackground`: staircase, window with a ghost, chandelier, gilded mirror
  with handprint, candelabra, rose under glass, chequered floor, red carpet.

## Candle cursor (`CandleCursor.tsx`)
Fixed element, `pointer-events: none`, moved with `transform` from `pointermove`; flame is the pointer position.
`html[data-candle='on']` hides the native cursor except on text fields. Mounted only for
`horrorEnabled && experience === 'haunted' && candleCursor && (hover: hover) and (pointer: fine)`.
Interactive hover detected with `closest()` on `pointerover`. All listeners and rAF cleaned up on unmount.

## Floating ghosts (`FloatingGhosts.tsx`)
Pure CSS keyframes (compositor-only: transform, opacity) so they cost no JS per frame.
Count from `mansionStore` via `ghostCount(unclearedRooms)`.

## Mansion gameplay (`features/mansion/`)
- `spirits.ts` — pure: furniture catalogue, per-room candidates, `seedSpirits`, `applyReplacement`.
- `mansionStore.ts` — houses, active house, `registerRoom`, `applyJob(jobId, …)` (idempotent), `buildNextHouse`.
- UI: `FurniturePicker` (both experiences), `SpiritReport`, `SpiritOverlay`
  (spirits leave the result image), outcome banner in `ResultPanel`. (`MansionProgress`, the "Your mansion"
  panel, was removed from the Studio and Gallery pages; `buildNextHouse` stays in the store but has no UI.)
- Flow: upload + room type → `registerRoom` → pick furniture → generate → on `completed` → `applyJob`.

## Takeover changes
Only copy and scene names: `flashScene('abandoned'|'mansion')`, reveal headline, third whisper.
Timing, filters, palette tween, Skip, reduced motion, deferral and cleanup are untouched.
