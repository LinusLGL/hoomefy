# Haunted School Takeover — Tasks

> **Art direction superseded:** the school theme was replaced by the haunted mansion. The takeover mechanics
> (stages, timeline, controls, accessibility) still apply. See `.kiro/specs/haunted-mansion/`. The counts below
> are the school-era record; the current record is in the mansion `tasks.md`.

Status legend: `[x]` done and verified · `[~]` done, with a stated limitation

Verification record (all re-run after the final change):
`tsc --noEmit` 0 errors · `eslint --max-warnings 0` clean · `vitest` 8 files / 124 tests · `vite build` ok ·
Playwright in real Chrome: 22/22 (19 desktop, 3 mobile/Pixel 5).

## M1 Theming foundation
- [x] 1.1 `palettes.ts` with Elegant/Haunted tokens; WCAG AA contrast asserted for every text/surface pair in both themes
- [x] 1.2 Tailwind colours → CSS variables; parity with `palettes.ts` asserted by a test
- [x] 1.3 Theme styles injected before first render (`bootstrap.ts`); title/meta neutral
- [x] 1.4 Existing components/pages migrated to semantic tokens (button, card, input, toast, header, footer, studio, upload, comparison, auth, about, 404)

## M2 State and provider
- [x] 2.1 `hauntingStore` + `canAutoTakeover` (never forces a reveal; busy-aware)
- [x] 2.2 `HauntedExperienceProvider` (attributes, reduced motion, mobile)

## M3 Visual engine
- [x] 3.1 `scenes.ts` procedural painters (room, classroom, corridor)
- [x] 3.2 `DistortedImageTransition` WebGL shader + 2D fallback; `SceneFrame` (pixel-checked in e2e)
- [x] 3.3 `ChromaticAberrationEffect`, `RealityDistortionOverlay`, `ScreenTearing`
- [x] 3.4 `GlitchText`, `ParanormalShadow`
- [x] 3.5 `HauntedSchoolBackground` (24 fps cap, paused when hidden)

## M4 Sequencing
- [x] 4.1 `takeoverTimeline.ts` phases A–D
- [x] 4.2 `HorrorTakeoverController` (deferral while busy, Skip, opt-out abort, cleanup)
- [x] 4.3 `ScrollHauntingDirector` + `anomalies.ts` (rate-limited, retried, one-shot)
- [x] 4.4 `HauntedMirror` escalation; generation-result reveal distortion

## M5 Application integration
- [x] 5.1 Home page redesign with reveal trigger section
- [x] 5.2 Haunted skin: noticeboard nav, framed style cards, evidence-board upload, developing-photograph generation
- [x] 5.3 Studio: stage derived from real job status; result panel with before/after slider
- [x] 5.4 `HauntingControls` (Elegant/Haunted, opt-out, replay, skip), synthesised ambient audio (opt-in)
- [x] 5.5 Gallery page ("The Archive")

## M6 Verification
- [x] 6.1 tsc, eslint, build
- [x] 6.2 Vitest (state machine, timeline, reduced motion, skip, abort, cleanup, a11y structure, service regression)
- [x] 6.3 Real-browser run: scroll trigger, phases, theme activation, restore, replay, opt-out, mirror, reduced motion, mobile, keyboard, axe scans, studio upload → generation after the takeover

## Known limitations
- [ ] Scene art is procedural placeholder art, not photography. Painters share one signature so real images can replace them.
- [ ] Verified on Chrome only (software WebGL). Safari/Firefox are untested. Safari's SVG-filter-on-HTML support is partial.
- [ ] Haunted scrolling measured ~27 fps under *software* rendering before optimisation; not re-measured on a GPU.
- [ ] Ambient audio is implemented but was not auditioned (no audio output in the test environment).
- [ ] The generation service is the development mock; the result image is a colour-graded copy of the user's photo (labelled "Demo rendering").
- [ ] Initial JS is ~122 KB gzip plus ~53 KB React vendor, close to the 200 KB steering target.
