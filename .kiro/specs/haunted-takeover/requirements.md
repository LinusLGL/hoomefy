# Haunted School Takeover — Requirements

Supersedes the playful "haunted mode toggle" in `hoomefy/requirements.md` (US: haunted mode).
The playful Halloween direction (cute ghosts, pumpkins, light-to-dark theme toggle) is **no longer the target**.

## Product intent

Hoomefy opens as a premium, elegant AI interior-design site. As the visitor scrolls, the site
shows controlled anomalies, then undergoes a one-time cinematic distortion sequence and becomes an
abandoned-school psychological-horror interface. Every real feature (auth, upload, AI generation,
studio, navigation) keeps working in both experiences.

## Terminology

- **Elegant experience**: default beige/ivory premium look.
- **Haunted experience**: abandoned-school horror look.
- **Anomaly**: a short, non-blocking glitch shown while still Elegant.
- **Takeover**: the 6-second transformation sequence (phases A–D).
- **Opt-out**: user disables horror effects entirely.

## Requirements

### R1 — Elegant first impression
1. WHEN a first-time visitor opens `/` THE SYSTEM SHALL render the Elegant experience with beige/ivory surfaces, editorial serif typography and a luxury interior image.
2. THE Elegant experience SHALL NOT contain visible horror cues (no ghost icons, no "haunted" copy, no dark theme). Page title and meta description SHALL not mention haunting.

### R2 — Stage two anomalies
1. WHILE the visitor scrolls the home page in the Elegant experience THE SYSTEM SHALL trigger, at most once each per session, these anomalies at increasing scroll progress: text shift, shadow in image, horizontal tear, photo swap to an abandoned room, school-bell glyph, fluorescent flicker, silhouette behind a card, and whisper messages ("Something isn't right.", "You're not alone.", "Class is still in session.").
2. Anomalies SHALL be spaced at least 1.5 s apart, SHALL NOT shift layout, and SHALL NOT intercept pointer events.
3. Anomalies SHALL NOT run when horror is disabled, when `prefers-reduced-motion` is set, or while an upload or generation request is in flight.

### R3 — Takeover sequence
1. WHEN the designated reveal section (`[data-haunt-trigger]`) reaches the trigger line, OR the user activates the antique mirror enough times, OR the user chooses "Replay the Haunting", THE SYSTEM SHALL run the takeover once.
2. Phase A (0–1.2 s) SHALL apply horizontal tearing, RGB channel separation, chromatic aberration, scanline interference, displaced typography and uneven flicker to the real interface.
3. Phase B (1.2–2.7 s) SHALL intensify using an animated SVG displacement map, WebGL image warping, large glitch strips, duplicated segments, distorted shadows, warped text and rapid low-contrast flashes of school imagery.
4. Phase C (2.7–4.5 s) SHALL tween the whole UI palette from Elegant to Haunted, warp the hero image into a school corridor, fragment and reassemble the hero heading, distort navigation text, cross a shadow silhouette, raise mist, and show "YOU SHOULDN'T BE HERE."
5. Phase D (4.5–6 s) SHALL cut the distortion, show "WELCOME TO THE OTHER SIDE.", "Your dream home has a dark side." and a ghostly Hoomefy logo, then release to the live Haunted UI.
6. The takeover SHALL be implemented with overlay layers and targeted filters on existing DOM. It SHALL NOT remount the React tree or reset any store.
7. The takeover SHALL run once per visitor unless the user deliberately replays it.

### R4 — Haunted UI
1. Navigation SHALL read as a distressed school noticeboard with red hover indicators.
2. Interior style cards SHALL read as framed photographs / aged school records.
3. The upload panel SHALL read as an evidence board with the copy "Every room has a story. Show us yours."
4. The generation overlay SHALL read as developing a haunted photograph, show "Reconstructing your space…", and its stage SHALL reflect the real job status.
5. Buttons SHALL remain readable and unmistakably interactive (≥ 4.5:1 text contrast, visible focus).
6. Palette: #08090B, #16191B, #728C74, #9D2028, #D8D4C8, #686C69.

### R5 — User control
1. THE SYSTEM SHALL provide, on every page, a discreet control offering: Elegant mode, Haunted mode, Replay the Haunting, Disable/Enable horror effects, Ambient sound, and Skip transition (during a takeover).
2. Skip SHALL also be reachable with the Escape key and SHALL finish in the Haunted end state immediately.
3. Preferences (experience, horror enabled, takeover seen) SHALL persist. After opt-out or after the visitor has seen the takeover, it SHALL NOT replay automatically.
4. Ambient audio SHALL be off by default, start only after a user gesture, and use only original synthesized sound.

### R6 — Safety, accessibility, performance
1. The system SHALL NOT interrupt or alter uploads, generation polling, auth, or any store state.
2. Overlays SHALL have `pointer-events: none` except the Skip control. Navigation SHALL stay operable throughout.
3. No full-screen flash exceeding 3 flashes per second; flashes SHALL be low contrast.
4. WHEN `prefers-reduced-motion: reduce` THE SYSTEM SHALL replace the sequence with a ≤ 1 s palette cross-fade and a static caption; no anomalies.
5. Text contrast SHALL be ≥ 4.5:1 in both experiences.
6. On mobile / coarse pointers: fewer strips and particles, lower canvas resolution, no more than 3 filtered elements.
7. All GSAP timelines, ScrollTriggers, listeners, WebGL contexts and audio nodes SHALL be released on unmount.
8. Continuous rendering SHALL be limited to the 2D background (30 fps cap, paused when hidden or not Haunted). WebGL SHALL render on demand only.

### R7 — Verification
Automated: type-check, lint, build, unit/component tests for the state machine, palette parity, reduced-motion path, skip, cleanup, opt-out. Browser: scripted run in a real browser covering scroll trigger, phases, theme activation, restore, replay, mobile viewport, keyboard navigation, and upload → generation after the takeover.
