# Haunted Mansion — Tasks

- [x] 1 Palette + HORROR constants + tests
- [x] 2 Procedural scenes: `mansion`, `abandoned`, `hall`; render-check against the reference
- [x] 3 Replace school references (background component, scene names, copy, whispers, reveal)
- [x] 4 haunted.css restyle (nav, frames, séance table, hero glitch edge, ornament, crimson mist); fonts
- [x] 5 Home page haunted layout (emphasis word, Haunted Styles, mansion room names)
- [x] 6 Candle cursor (+ settings toggle, persistence, tests)
- [x] 7 Floating ghosts (+ count rule, tests)
- [x] 8 Mansion logic: spirits, store, idempotent job application (+ unit tests)
- [x] 9 Mansion UI: furniture picker, spirit report, progress, spirit overlay, outcome banner; Studio wiring
- [x] 10 Update existing unit/integration/e2e tests; add new ones
- [x] 11 Gates: tsc, lint, vitest, build, Playwright (desktop + mobile); visual review of screenshots

## Candlelight (added after review)

- [x] 12 Candle cursor fixes: native pointer is hidden only once the candle is drawn; the element under a still pointer is re-checked every 300 ms (stale "text field" state); candle z-index above the controls (9700 > 9600); a real mouse move enables the candle on hybrid devices whose media query reports touch
- [x] 13 Dark room: page 80% dark, a circle around the flame is 100% clear in the middle and fades to the full darkness at its edge (`candleLight.ts`, `useCandleLight.ts`, `.hf-candlelight`)
- [x] 14 Light radius: starts at 30%; **every click** lifts it one step 30 -> 50 -> 80 -> 100 (100% = whole room lit), the flame flares and its glow grows with the light; driving a spirit out also lifts one step; every 3.3 s it shrinks by 10% of itself (never below 12%), and a lift restarts that timer. A lift steps up from the step the light is burning down from (27% -> 50%, 90% -> 100%). Clicks closer than 250 ms count once.
- [x] 15 Settings toggle "Candlelight darkness" (persisted), keyboard focus moves the light, reduced motion removes the easing, a new house starts dark again, a built house is fully lit

Assumptions to confirm: a "click" is any click or keyboard activation anywhere on the page; clearing a spirit is an extra lift on top of that; "radius %" is a percentage of the shorter window side; "reduce the circle by 10%" is 10% of the current radius; the floor of 15% and the toggle are additions so the interface stays usable.

## Verification record (November 5, 2026)

| Gate | Result |
| --- | --- |
| `tsc --noEmit` | 0 errors |
| ESLint (`--max-warnings 0`) | 0 problems |
| Vitest | 13 files, 206 tests passed |
| `npm run build` | OK; main chunk 130.9 KB gzip, React vendor 52.9 KB gzip |
| Playwright (desktop + Pixel 5 emulation, system Chrome) | 43 of 43 passed |

Screenshots reviewed by eye: hero, Haunted Styles, takeover reveal, studio, haunting report,
outcome banner with a translucent spirit over the "Before" image, room cleared, house built.
Two element screenshots caught a momentary screen-tear burst (by design, 0.1–0.4 s).

## Assumptions (to be confirmed by the product owner)

- A house is 7 room slots; each starts haunted. The first photo of a room seeds 1–3 spirits, each bound to one furniture category.
- A spirit leaves only when a **completed** generation lists its furniture category as replaced. Failed or cancelled jobs clear nothing.
- Floating ghosts: one per uncleared room, minimum 1, maximum 3 (2 on touch devices).
- Elegant mode shows a plain furniture picker with no ghost language.

## Known limitations

- Mansion progress is stored in `localStorage` (`hoomefy_mansion`) because there is no backend. It is per browser, not per account.
- Scenes are procedural canvas paintings that follow the reference's composition, not photographs or authored art.
- Tested in desktop Chrome and a Pixel 5 emulation only. Firefox, Safari and real touch hardware are untested.
- Candle cursor and ghost look are not measured on a real GPU or low-end device.
- The synthesised ambient sound was replaced by the supplied recordings (see the landing page section below). Nobody has listened to the audio.

## Landing page redesign, sound and sign-up video

- [x] Rebuild the Haunted home to match the landing-page design (title, paragraph, buttons, framed scene, steps strip, header)
- [x] Wallpaper background with flickering lights; foreground art cut from the design
- [x] Haunting sting on trigger, then looping ambient track; mute control remembered; autoplay fallback on first interaction
- [x] Looping muted video behind the Haunted sign-up page; still poster for reduced motion
- [x] Unit and end-to-end tests for the above
- [x] Haunted sign-in gate at /signin: Revisiting Companion (sign-in form) or New Soul (/signup), over the looping video
- [x] Design My Room, Open the Studio, header Get Started and Sign In all open the gate for signed-out visitors; pages whose visitor has already answered (after sign-up, password reset) skip it
- [x] One shared Haunted design for sign-in, sign-up and password screens (video, brand mark and rule, gold or crimson card frame)
- [x] Gates after the refactor: tsc, eslint, 282 unit tests, build, 87 Playwright tests (desktop + Pixel 5)

## Rooms, holy water, ghost avatar and jumpscare

- [x] The three Haunted Styles cards show the drawing room, library and grand ballroom paintings; clicking one expands it (modal viewer above the darkness)
- [x] A holy water hidden in each room (SVG vial); one collected is enough
- [x] Ghost avatar (`avatar.gif`, re-encoded) at the bottom right 3 s after the Haunted page, on every Haunted page, with a speech bubble: intro, per-room clue, "bring it to me"
- [x] Holy water use: drag onto the ghost or press bottle then ghost; `Holywatereffect.mp4`, then the site returns to Elegant
- [x] Jumpscare (`Jumpscare.mp4`) after 12 s at the candle's lowest light; once per tab session; cancelled by a click or by holding the holy water; waits for uploads and generations
- [x] Session memory (sessionStorage), soundtrack pauses under the videos, reduced-motion and touch behaviour
- [x] Tests: 57 unit, 35 desktop and 2 mobile end-to-end; full gates after: tsc, eslint, 339 unit tests, build, 124 Playwright tests
