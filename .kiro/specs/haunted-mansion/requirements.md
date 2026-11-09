# Haunted Mansion — Requirements

**Supersedes the art direction of `haunted-takeover`.** The takeover mechanics (stages, phases A–D, Skip,
reduced motion, opt-out, replay, safety rules) are unchanged. What changes is *what the Haunted experience is*:
an abandoned-school setting becomes a gothic **haunted mansion**, and the Haunted experience gains a purpose.

Reference: the supplied mock-up of the home page (gothic great hall, moonlit arched windows, chandelier,
candelabra, gilded mirror with a handprint, red velvet drapes, chaise, fireplace, portrait, a ghost on the stairs,
chequered marble floor, crimson mist; headline "Your Dream Home Has *Secrets.*").

## M1 — Mansion art direction
1. THE Haunted experience SHALL read as a candle-lit gothic mansion: warm near-black wood, antique candle gold,
   deep crimson velvet, moonlit blue-grey, sage-green text accents, drifting fog.
2. The home page hero SHALL follow the reference: eyebrow "HOOMEFY · HAUNTED MANSION", headline
   "Your Dream Home Has *Secrets.*" (final word in italic crimson), supporting copy, "Design My Room" (crimson)
   and "How It Works" (outlined), and a framed moonlit-room image with a crimson edge glow and glitch slices.
3. A "Haunted Styles" section SHALL follow with an ornamental divider and the line
   "Each style is a room with a story that lingers."
4. All school imagery and copy (corridor, classroom, lockers, noticeboard, bell-as-school) SHALL be removed.
5. Takeover copy: "YOU SHOULDN'T BE HERE." then "WELCOME TO THE MANSION." / "Your dream home has secrets."
   Whispers: "Something isn't right." · "You're not alone." · "The house remembers you."
6. Elegant mode is unchanged and SHALL still contain no horror cues.
7. Scene art stays procedural (no photography in the repo). The reference image is a design guide, not an asset.

## M2 — Candle cursor
1. In the Haunted experience on fine-pointer devices, the system cursor SHALL be replaced by a candle whose
   flame marks the pointer position and flickers, with a soft warm glow (additive, never darkening text).
2. The flame SHALL grow over interactive elements. Text fields SHALL keep the native I-beam and hide the candle.
3. It SHALL NOT appear on touch / coarse-pointer devices, in Elegant mode, or when horror is disabled.
4. Users SHALL be able to switch it off ("Candle cursor") and the preference SHALL persist.
5. `prefers-reduced-motion`: no flicker animation and no easing lag; the candle still tracks the pointer.

## M3 — Floating ghosts
1. In the Haunted experience, translucent ghosts SHALL drift slowly along the bottom of the viewport.
2. They SHALL be decorative: `aria-hidden`, `pointer-events: none`, max 0.2 opacity, no layout effect.
3. Count: one per uncleared room of the active house, capped at 3, and always at least 1.
4. Mobile: at most 2. Reduced motion: static and fainter. Hidden in Elegant mode and when horror is off.

## M4 — Build the house, replace the furniture, clear the ghosts  *(interpretation)*
The brief says users must build houses and replace furniture to clear the ghosts away. Interpretation:

1. A **house** has one slot per room type (7). Every room starts **haunted**. A house is **built** when all
   rooms are **cleared**; the user may then **build the next house**.
2. When a room is first photographed, it receives 1–3 **spirits**, each **bound to a furniture category**
   (seating, bed, tables, lighting, storage, rugs & curtains, mirrors & art). Seeded from the photo and room type
   so the result is deterministic. Only categories that make sense for that room type are used.
3. The user picks **Furniture to replace** (multi-select) before generating. The choice is added to the
   generation request (`preferences.replaceFurniture`, plus a sentence appended to the instructions).
4. When a generation **completes**, every spirit bound to a replaced category is **driven out**. Remaining
   spirits stay. A room with no spirits left is **cleared**.
5. Feedback: a "haunting report" before generating, a spirits-leaving animation and a plain-language outcome after
   ("2 spirits driven out. 1 lingers: replace the lamps."), and a mansion progress panel.
6. Each job SHALL be applied **at most once** (idempotent), and a failed or cancelled generation SHALL clear nothing.
7. Spirits, houses and progress exist **only in the Haunted experience**. Elegant mode shows the plain
   "furniture to replace" picker without any ghost language.
8. State is local to the browser (zustand + localStorage) because the backend does not exist yet; it is
   isolated in `mansionStore` so a server implementation can replace it.

## M5 — Quality
Type-check, lint (0 warnings), build, unit/integration tests, and real-browser tests (desktop + mobile) covering
the candle cursor, floating ghosts, spirit clearing end-to-end, and re-verification of the takeover.
Contrast ≥ 4.5:1 in both experiences (asserted in tests and by axe).
