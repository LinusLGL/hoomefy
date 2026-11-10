# Studio: wishes, items and prices: tasks

- [x] 1. Prompt: wishes first and marked as the priority, layout rule gives way to them; no room, no palette (`prompt.ts`, tested)
- [x] 2. Remove room type, colour palette and furniture to replace from types, store (persist version 3), prompt, saved designs, copy and the ritual gate
- [x] 3. Move the preferences card to the left panel; larger wishes box
- [x] 4. Remove the spirit report, outcome banner, overlay and furniture picker; keep the house, ghosts and candle code
- [x] 5. Worker: `/api/detect-items` (`worker/detect.ts`), `requireUser` (`worker/guard.ts`), sign-in and rate limit on `/api/furniture-search`, `SEARCH_LIMITER`
- [x] 6. Client: `detectApi.ts`, `items.ts`, `scan.ts`, stores, `ItemScan`
- [x] 7. Summary with the pieces, prices and total; Furniture tab from the found pieces; Shopping list filled in by itself
- [x] 8. Demo renderer says it cannot follow wishes
- [x] 9. Unit tests: prompt, items, scan, detect API, Worker detect, guard and routes, panels
- [x] 10. E2E: `design-studio.spec.ts` (wishes in the left panel, no room/palette/furniture, found / priced / listed, estimates, failure and retry, empty), `ritual.spec.ts`, `mansion.spec.ts`, `studio-fit.spec.ts`, `mobile.spec.ts`
- [ ] 11. Live check on the deployed site: the vision model's real answer format, and a real wish changing a real redesign
- [ ] 12. Add `SERPER_API_KEY` as a Worker secret to turn on shop prices (until then every price is an estimate)
- [ ] 13. Confirm the assumptions in `requirements.md` (ghosts no longer cleared by designing; automatic scan only for new designs)
