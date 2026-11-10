# Haunted School Takeover — Design

## 1. Theming: two palettes, one set of CSS variables

`features/haunting/palettes.ts` is the single source of truth. It lists every themeable token
(`navy-50…950`, `purple-*`, `amber-*`, `ivory`, `paper`, `ink`, `on-accent`, `accent`,
`accent-hover`, `success/danger/info/warning`) with an Elegant and a Haunted value.

- `tailwind.config.js` maps colours to `rgb(var(--token) / <alpha-value>)`, so every existing
  utility (`bg-navy-900`, `text-ivory/80`, `border-amber-600/20`) re-skins automatically.
- `injectThemeStyles()` writes `:root{…elegant…}` and `html[data-experience="haunted"]{…haunted…}`
  into a `<style>` tag before React renders.
- Values are space-separated channels (`"247 243 234"`), so **GSAP can tween the variables
  directly** during Phase C. That is what makes the possession a live transformation instead of
  a class swap. After the tween, inline variables are removed and the attribute takes over.
- Semantics: `navy-*` is the *surface* scale (900 = page, 800 = panel, 700 = border) and
  `ivory` is the *text* colour. Both invert correctly between themes.

## 2. State

`hauntingStore` (zustand, persisted: `experience`, `horrorEnabled`, `takeoverSeen`):

```
experience: 'elegant' | 'haunted'
horrorEnabled: boolean
takeoverSeen: boolean
sequence: 'idle' | 'running'          // not persisted
takeoverRequest: number               // monotonic; controller reacts to increments
skipRequest: number
```

Actions: `requestTakeover(reason)`, `requestSkip()`, `finishTakeover()`, `setExperience`,
`disableHorror`, `enableHorror`, `replay`.
(`mirrorTouches` / `touchMirror` were removed: the mirror no longer escalates; `requestTakeover('mirror')` is a deliberate request that skips the once-only rule.)
A pure function `canAutoTakeover(state)` encodes the "never force a reveal" rules.

The existing auth/studio/toast stores are untouched.

## 3. Components (`src/features/haunting/`)

| Component | Role |
|---|---|
| `HauntedExperienceProvider` | Applies `data-experience` / `data-takeover` to `<html>`, tracks reduced-motion and mobile, mounts effect layers and background, exposes context. |
| `HorrorTakeoverController` | Builds and runs the GSAP timeline (`takeoverTimeline.ts`), owns ScrollTrigger for `[data-haunt-trigger]`, skip handling, reduced-motion path, cleanup via `gsap.context`. |
| `AnomalyDirector` (hook `useAnomalies`) | ScrollTrigger progress → one-shot anomalies with min spacing. |
| `RealityDistortionOverlay` | Fixed pointer-transparent layer: SVG `feTurbulence`+`feDisplacementMap` filter `#hf-warp`, scanlines, flicker, flash frames, message layer. Exposes an imperative handle. |
| `ChromaticAberrationEffect` | SVG filter `#hf-chromatic`: splits R/G/B, offsets R and B, screen-blends. Handle `setOffset(px)`. |
| `ScreenTearing` | Strips with `clip-path` slices showing corridor imagery and red/cyan split bars. Handle `burst()`. |
| `GlitchText` | Renders per-character spans (a11y text kept in an `sr-only` span). Used for hero heading, nav, logo. |
| `DistortedImageTransition` | On-demand WebGL1 shader: noise warp, sliced tearing/duplication, channel split, dissolve between two painted scenes. Falls back to a 2D cross-fade. |
| `SceneFrame` | Editorial image using `DistortedImageTransition` (elegant room ⇄ classroom ⇄ corridor). |
| `HauntedSchoolBackground` | Fixed 2D canvas: corridor, flickering light, fog, dust, grain. 30 fps cap. |
| `ParanormalShadow` | Blurred humanlike silhouette; flash / cross / lurk-on-hover. |
| `HauntedMirror` | Antique mirror on the home page. Elegant: a press requests the takeover (reason `mirror`) at once, every time, unless the visitor opted out. Haunted: a press plays the jumpscare video (`scareNow`), every time, but not with reduced motion. |
| `HauntingControls` | Discreet control menu + Skip button. |
| `ambientAudio.ts` | WebAudio synthesis (drone, hallway air, distant bell, footsteps). |

Scenes are painted procedurally (`scenes.ts`) because the repo has no photography. `SceneFrame`
and the background take painter functions, so real photographs can replace them later.

## 4. Takeover timeline

```
t(s)  0 ───── 1.2 ───────── 2.7 ─────────── 4.5 ──── 6.0
        A: break   B: corrupt   C: possession   D: reveal
```

- **A** ramp warp (scale 0→14), chroma offset 0→5 px, scanlines, 3 tear bursts, char jitter on
  visible `[data-glitch]`, 2 low-contrast flicker pulses.
- **B** warp 14→38, higher frequency, 2 school-imagery flash frames (≥ 400 ms apart, α ≤ 0.28),
  large strips, shader slice duplication on the hero scene, silhouettes behind `[data-distort]`.
- **C** tween all palette variables; background canvas fades in; panels become translucent
  (`html[data-takeover="possess"]`); hero scene shader dissolves to the corridor; hero chars
  scatter then `flushSync` swaps experience → new copy → chars reassemble; nav chars glitch and
  reform; shadow crosses; mist rises; "YOU SHOULDN'T BE HERE." glitches in and out.
- **D** hard cut: warp 0, brief dim beat, headline + subline + ghost logo, fade overlay, `finishTakeover()`.

Targets for filters are `[data-distort]` elements currently in the viewport and ≤ 1.5 viewport
heights tall (≤ 3 on mobile), never the whole page. Filters are removed at the end of C.

Skip (button / Esc / `requestSkip`) → `timeline.progress(1)` after forcing the end state, then cleanup.
Reduced motion → 0.8 s variable tween + static caption (fade only).

## 5. Haunted UI surface (`styles/haunted.css`)

Scoped to `html[data-experience="haunted"]` and `[data-takeover="possess"]`:
translucent surfaces over the corridor, noticeboard header (cork-less, scratched, red active
underline), framed-photo style cards (`.hf-frame`), evidence board upload (`.hf-evidence`),
developing-photograph generation overlay, grain + vignette, red focus rings. Copy swaps use
`ThemedText` / `useIsHaunted()`. Mori becomes a faint presence (no bobbing).

## 6. Safety rules encoded in code

- Overlays: `pointer-events:none`, `aria-hidden`, except the Skip button.
- Anomalies/takeover read `useStudioStore.isGenerating` / upload state and defer.
- Flash limiter: shared `FlashBudget` (max 3 per second, α cap).
- All animation lives in `gsap.context()`; `revert()` on unmount; WebGL `loseContext()`; audio `close()`.

## 7. Testing

Vitest: palette parity (Tailwind config ↔ palettes), store rules, reduced-motion path, skip,
opt-out, anomaly spacing, unmount cleanup, overlay inertness. Playwright (system Edge) script:
scroll trigger, phase screenshots, theme state, restore, replay, mobile, keyboard, studio
upload → generation in Haunted mode.
