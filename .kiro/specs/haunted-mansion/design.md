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
- UI: removed in November 2026 (`FurniturePicker`, `SpiritReport`, `SpiritOverlay`, the outcome banner), because the
  studio no longer has a room type or furniture to replace. (`MansionProgress`, the "Your mansion" panel, was removed
  earlier; `buildNextHouse` stays in the store but has no UI.) `FloatingGhosts` and the candle-lift code still read the store.
- Flow: none from the studio. `registerRoom` and `applyJob` are still in the store (and tested) but nothing calls them.

## Takeover changes
Only copy and scene names: `flashScene('abandoned'|'mansion')`, reveal headline, third whisper.
Timing, filters, palette tween, Skip, reduced motion, deferral and cleanup are untouched.
