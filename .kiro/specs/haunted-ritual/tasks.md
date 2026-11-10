# Haunted Ritual: tasks

- [x] 1. Assets: `scripts/build-ritual-assets.mjs` builds the board, the unlit chamber and five candle patches (webp) and copies `script1..5.mp3`
- [x] 2. Geometry: art sizes, candle positions, cover and chamber placement (pure, tested)
- [x] 3. Ritual state: light in any order, ignore a lit candle, words and sound by count (tested)
- [x] 4. Script player: preload, one voice at a time, end callback (tested)
- [x] 5. `CandleRitual` dialog: five candles, flicker, text box, counter, keyboard, focus, live region, finale timing, close and Escape
- [x] 6. `BoardBackdrop` and `PolaroidStage`: animated Ouija board, blank polaroid as drop zone, photo in the centre, "Light the candles"
- [x] 7. Studio wiring: consent before the ritual, fifth candle starts the redesign, the not-ready toast, the board variants of `UploadContainer` and `GenerationProgress`
- [x] 8. Whisper guide in `PreferencesPanel` (Haunted only)
- [x] 9. Every screen: screenshots reviewed at 1920x1080, 1366x768, 1280x720, 1024x768, 820x1180 and 390x844; the page never scrolls at 1024 px and wider (a Haunted column scrolls inside itself by up to 22 px at 1280x720 and 72 px at 1024x768 with a photo)
- [x] 10. Reduced motion: all `rt-` animation off, words and flames kept
- [x] 11. Tests: unit and component tests for each piece; `tests/e2e/ritual.spec.ts`; `completeRitual` / `developPhotograph` helpers used by the older specs
- [ ] 12. Confirm the assumptions in `requirements.md` with the product owner
- [ ] 13. Licence check of the artwork and recordings under `public/images/haunted/ritual` and `public/audio/ritual`
- [ ] 14. Try Safari and Firefox (blend mode, audio after click)
