# Haunted Ritual: design

Code is in `frontend/src/features/ritual/`; styles in `frontend/src/styles/haunted-ritual.css`; the glue is in
`frontend/src/pages/StudioPage.tsx`.

## Decisions and why

| Decision | Reason |
|---|---|
| Light the candles with the unlit chamber picture plus one `screen`-blended patch per candle | The supplied art is one picture with the candles already burning. `scripts/build-ritual-assets.mjs` rebuilds it with every candle unlit (`chamber-unlit.webp`) and cuts each lit flame into its own transparent patch (`candle-1..5.webp`). Placing a patch back at its pixel position lights exactly that candle, with no second lit picture to keep in step. |
| Each patch sits in a `.rt-flamebox` that flickers | The box scales and fades like a flame while the picture inside ignites once, so a lit candle moves and still lines up. |
| Message and sound follow the **count** of lit candles | The visitor may light any candle first, but the five lines are a spell that must be read in order. (Assumed; one function, `messageFor` / `soundFor`, decides it, so changing it is a small edit.) |
| A single `ScriptPlayer` owns all five recordings | Preloads them, and stops the voice that is speaking when the next starts. A finished recording reports back through a callback, which the finale waits for. |
| Lighting the fifth candle calls `onComplete`; the page runs `startGeneration` | One path for old and new buttons (consent, quota, fallback). The chamber only owns its own animation. |
| The chamber is portaled to `document.body`, z-index 8200 | It must cover the header, the floating buttons and the Haunted overlay layers. `html[data-ritual='open']` blocks page scroll and hides `.hf-avatar`, `.hf-avatar__ghost`, `.hf-ghosts` (they come back unchanged). |
| `chamberPlacement(viewport)` in `geometry.ts` | Pure maths: fits the picture so the whole candle ring (`CHAMBER.ring`) is on screen and centred, reporting a letterbox when the screen is taller than the art. Unit tested. |
| Wide screens: `PolaroidStage` is `position: fixed` on top of `BoardBackdrop` | The backdrop covers the viewport, so the stage uses the same cover maths to land exactly on the blank card of the board. |
| Tablet and phone: the board is a cropped block in the page (`BOARD_CROP`), the backdrop dimmed | A fixed board would put the card behind the stacked panels. |
| Haunted `GenerationProgress variant="board"` shows only status, queue and buttons | The photograph develops on the polaroid itself (`.rt-photo[data-stage]`). Keeping the old card with its own image would show the photo twice. |
| Consent first, then the chamber | The visitor should know the photo will be sent before a ritual implies it. Choosing "demo" is kept in `ritualDemoRef`. |

## Pieces

- `geometry.ts`: art sizes, `BOARD` (card, window, flames), `CHAMBER` (candle positions, ring), `CANDLE_SOUNDS`, `coverPlacement`, `chamberPlacement`, `WIDE_QUERY_MIN`.
- `ritualState.ts`: plain data. `lightCandle` ignores a lit candle; `messageFor`, `soundFor`, `isComplete`.
- `scriptAudio.ts`: `createScriptPlayer(urls, makeAudio)` with `preload`, `play(url, onEnd)`, `stop`.
- `CandleRitual.tsx`: the dialog, five `button.rt-candle[data-candle]`, the text box, the counter, the finale timer.
- `BoardBackdrop.tsx`, `PolaroidStage.tsx`: the board and the polaroid (drop zone, photo, strip line, "Light the candles" overlay).
- `copy.ts`, `whisper.ts`: wording and `appendPhrase`.

## Finale timing

After the fifth candle: wait for the `script5` recording to end plus 1200 ms; if it never ends, 12 s; if sound is
off, 3.8 s. Then, while the design is still working, the chamber stays open with the `.rt-wait` line (props `working`, `status`). When `working` turns false it fades 800 ms and closes. Close or Escape before the fifth candle leaves early and starts nothing;
after it, they only dismiss.

## Candle geometry (art is 1672 x 941)

| Candle | x | flame tip y | base y |
|---|---|---|---|
| top | 839 | 183 | 217 |
| left | 435 | 356 | 394 |
| right | 1226 | 360 | 397 |
| bottom-left | 575 | 629 | 666 |
| bottom-right | 1098 | 635 | 676 |

Board card {x 646, y 267, w 375, h 432}; photo window {672, 294, 324, 317}.

## Test ids

`candle-ritual` (`data-lit`, `data-complete`, `data-ready`, `data-leaving`), `ritual-message`, `ritual-count`,
`ouija-board`, `polaroid-stage`, `polaroid-dropzone`, `polaroid-photo`, `stage-line`, `begin-ritual`,
`whisper-guide`.

## Known limits

- The artwork and the recordings come from the project's `Resource/` folder. Their licences were not checked here; confirm them before the contest entry.
- The board crop on tablets and phones is hand-placed from the art, not measured per device.
- The text box's contrast ratio (R6.4) was judged by eye on the screenshots (ivory on near-black), not measured with a tool.
- Only Chrome was tried. Safari and Firefox are untested, in particular `mix-blend-mode: screen` on the patches and audio autoplay after a click.
