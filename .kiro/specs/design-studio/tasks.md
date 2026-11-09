# Design Studio: tasks

All tasks below are done and verified (unit tests, Playwright on desktop and mobile, and runs against the real
Hugging Face Space in a browser).

- [x] 1. Themes and prompt engine: Scandinavian, Japandi, Modern Luxury, Minimalist, Halloween, custom text; palette, intensity and instructions in the prompt; aspect-correct sizes (multiples of 8, at most 1024)
- [x] 2. Photo pipeline: magic-byte type check, size and dimension limits, EXIF rotation, metadata stripping, separate original and inference copies, progress, replace and remove
- [x] 3. AI provider layer: interface, demo provider, Gradio provider for FLUX.2 klein, error classification (quota, busy, unavailable, timeout, aborted), chain, optional Hugging Face token
- [x] 4. Consent dialog and privacy notes (the photo is only sent after the visitor agrees)
- [x] 5. Three-panel workspace: left controls, canvas, right assistant; tablet collapse; phone bottom bar
- [x] 6. Canvas tools: before/after slider, After/Before views, zoom and pan, fullscreen, history, download, regenerate, save
- [x] 7. Furniture: suggestions per room, on-device detection with boxes, estimates, shop links, optional live prices, shopping list and budget
- [x] 8. Accounts and saved designs with Supabase (auth, table, private storage, row-level security, 50 designs per person), gallery with open, download, delete
- [x] 9. Cloudflare Pages: security headers and CSP, product-search function, wrangler config, deploy guide
- [x] 10. Tests: 460+ unit and component tests, Playwright desktop and mobile flows, real-browser EXIF test, opt-in live smoke test

## Verified against the real services

- FLUX.2 klein 4B: a ruined Gothic room restyled as Scandinavian in 7 to 13 seconds with windows, fireplace and furniture positions kept.
- Browser, production build with the strict CSP served by `wrangler pages dev`: consent, generation, JPEG download and furniture detection with no console errors.
- Quota exhausted: the studio explains it, offers a token, retry or a demo rendering.
