# Studio: wishes, items and prices: design

## Decisions and why
| Decision | Reason |
|---|---|
| Wishes go first in the prompt: `The owner's request comes first and must be clearly visible in the result: "…"`, then the style for everything else | Before, the wish came after the style, the palette and the intensity and just before a rule that forbade changing windows, layout and main furniture, so many wishes were overruled. `buildEditPrompt` in `features/studio/prompt.ts` is the one place the three AI sources (Hugging Face, Workers AI, demo) take their prompt from. |
| With wishes, the layout rule becomes "Otherwise keep … Change those only where the request above asks for it" | A wish like "add a window" would otherwise contradict the next sentence. Without wishes the original strict rule is used word for word. |
| The whole preferences card moves to the left (wishes, intensity, budget) | The right column is now the place for results; the left is everything that goes into the prompt. |
| Items come from a **vision model** on the Worker (`worker/detect.ts`), not from the browser | The on-device detector (OWL-ViT) is a 150 MB download that had to be started by hand and only knows 24 fixed labels. The vision model names each piece with its colour or material and writes the shop words, which makes the price search far more precise. It uses the AI binding already declared; one look costs a small fraction of one redesign out of the same free 10,000 neurons a day. |
| `@cf/meta/llama-4-scout-17b-16e-instruct`, then `@cf/google/gemma-4-26b-a4b-it` | Both read pictures and are in the current catalogue; the catalogue is being refreshed, so a second choice avoids a dead feature if the first is retired. Quota errors stop the loop (the allowance is the same for both). |
| The picture is sent as a data URL in a JSON body of at most 400 KB | The Free plan allows 10 ms of CPU a request. A 640-pixel JPEG is small to parse and forward; the work is in the model, not the Worker. The browser makes the small copy (`shrinkToJpeg`). |
| The model's answer is untrusted | `cleanFound` keeps only known kinds, cleans names and search words to the same rule as the search route, removes repeats and caps at ten. The client cleans again (`sanitizeItems`). Nothing is logged except a clipped reason with any data URL cut out. |
| Prices: the product nearest the **median** counts (`pickPrice`) | The first result is often an accessory, and the cheapest or dearest is often an outlier. |
| No shop price means a typical price for the style, marked "est." | The studio must work without a search key. `estimateMid(kind, style)` already existed. |
| `/api/furniture-search` now needs a signed-in user, and `/api/detect-items` too | Finding and searching are now automatic, so each design costs about ten searches. Anyone could have called the old public route. `worker/guard.ts` (`requireUser`) checks the Supabase session and a per-user limit (`REDESIGN_LIMITER` for finding, new `SEARCH_LIMITER` at 40 a minute for searching). |
| `scanDesign` (`features/furniture/scan.ts`) is plain code, not a React effect | It must outlive tab switches and be cancelled by a new photo. A module-level `current` holds the abort controller; every store write checks the design is still the one on the canvas. |
| The shopping list marks its own lines `auto: true` | The next design replaces those and leaves the visitor's own lines alone. |
| Opened designs are not scanned automatically | The saved list is the visitor's. A **Find the pieces** button runs it on request. |
| Mansion: the studio stops feeding it | The spirits were bound to the removed inputs (`registerRoom(roomType)`, `applyJob(replaced)`). `FurniturePicker`, `SpiritReport`, `OutcomeBanner` and `SpiritOverlay` existed only for them and were deleted, with `composeInstructions`. `mansionStore`, `FloatingGhosts` and the candle-lift code are untouched, so the house still exists but a design no longer clears a room. `RoomType` and `FurnitureKey` now live in `features/mansion/spirits.ts`. |
| `designs.room_type` stays in the database | The column is nullable, so nothing needs migrating. New rows leave it empty; old rows are read and the value ignored. |

## Flow
1. `StudioPage` effect: a job completes, so `scanDesign({ id, blob, style })`.
2. `detectItemsInCloud` posts the shrunk design with the Supabase token. The Worker checks the user and limit, asks the vision model, returns `{ items }`.
3. `furnitureStore.setItems`; then up to three `searchProducts` run at once; each answer goes to `setPrices`.
4. `listLinesFor` builds one line per piece (a product, or an estimate) and `shoppingStore.replaceAuto` swaps the previous automatic lines.
5. `DesignSummary`, `FurniturePanel` and `ShoppingList` read the stores; `ItemScan` shows the status and the buttons (**Find the pieces**, **Try again**, **Use this device instead**).

## Files
- `features/furniture/`: `items.ts` (types, cleaning, `pickPrice`), `detectApi.ts`, `scan.ts`, `furnitureStore.ts`, `shoppingStore.ts` (`replaceAuto`), `search.ts`.
- `components/studio/`: `ItemScan.tsx`, `DesignSummary.tsx`, `FurniturePanel.tsx`, `ShoppingList.tsx`, `PreferencesPanel.tsx`.
- `worker/`: `detect.ts`, `guard.ts`, `index.ts` (routes), `wrangler.jsonc` (`SEARCH_LIMITER`).
- `lib/accessAuth.ts`: the Supabase token and key as request headers.
