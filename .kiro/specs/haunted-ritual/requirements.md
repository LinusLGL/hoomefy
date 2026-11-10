# Haunted Ritual: requirements

The Haunted Design Studio becomes a spirit board. The photograph is laid on a blank polaroid in the middle of a
Ouija board, and it is developed by lighting five candles in a moonlit ritual chamber. Elegant is unchanged.

Items marked **(assumed)** were not stated in the brief. They are the reading chosen, so they can be confirmed or
changed.

## R1. The board

1. IN the Haunted experience the whole Design Studio SHALL sit on a Ouija board. A blank polaroid in the middle of the board is the place for the photograph.
2. The board SHALL animate like candlelight: a slow flicker of warm light, drifting smoke and small embers. Nothing SHALL block clicks.
3. With no photograph, the polaroid SHALL be a drop zone (drag a file, or press it to choose one) with the line "Lay a photograph of the room here."
4. When the visitor adds a photograph, it SHALL appear in the centre of the polaroid, in the polaroid's own frame (not in a separate card).
5. The studio controls (style and preferences) SHALL stay usable beside the board, on the same screen sizes as before.
6. IN Elegant the studio SHALL look and behave as it did before this feature.

## R2. Whisper guide (spooky custom instructions) **(assumed: this is the "custom instruction guide")**

1. IN Haunted the extra-instructions box SHALL be labelled "Whisper your wishes".
2. A "How to whisper to the spirits" guide SHALL explain, in plain words, what to write (keep, change, feel).
3. The guide SHALL offer phrases that add themselves to the box with one press, within the existing length limit, each as a new sentence.
4. IN Elegant the box and its wording SHALL be unchanged.

## R3. Lighting the candles

1. Touching the photograph (or the "Light the candles" button on it, or "Develop the Photograph" in the toolbar) SHALL open the **Gothic Moonlit Ritual Chamber**: the supplied artwork filling the screen, with five candles in the circle.
2. The candles SHALL be lit **in any order**, by clicking or tapping them, or with the keyboard (Tab to a candle, then Enter or Space).
3. A lit candle SHALL burn with a flickering flame. An unlit candle SHALL be visibly unlit.
4. Lighting a candle SHALL show a spooky text box in the middle of the screen and play that candle's recording.
5. Words and recordings **(assumed: they follow the number of candles lit, not which candle was touched, so the five lines always come in order)**:

   | Lit | Words | Sound |
   |---|---|---|
   | 1st | By the first flame, awaken the secrets buried beneath these walls. | `script1.mp3` |
   | 2nd | By the second flame, bind the restless echoes wandering between worlds. | `script2.1.mp3` |
   | 3rd | By the third flame, purge the darkness from every forgotten memory. | `script3.mp3` |
   | 4th | By the fourth flame, let all corrupted spirits dissolve into eternal silence. | `script4.mp3` |
   | 5th | By the fifth and final flame, the power of the circle COMPELS YOU! | `script5.mp3` |

6. Two recordings SHALL never play at once: a new one cuts off the one before it.
7. Touching a candle that is already lit SHALL do nothing **(assumed)**.
8. The sound SHALL obey the site's sound switch. When sound is off, the words still appear.
9. Escape or the close button SHALL leave the chamber without starting anything.

## R4. Developing the photograph

1. Lighting the fifth candle SHALL start the redesign **(assumed)**, through the same path as the old "Develop the Photograph" button (consent, AI chain, quota, demo fallback).
2. After the fifth recording has ended (plus a short pause; 3.8 s with sound off, 12 s at most) the chamber SHALL stay open while the design is still being made, showing "The photograph is developing. Stay within the circle" and the queue position. When the design finishes or fails it SHALL fade out and the studio SHALL show the result. Close or Escape only dismisses; the design carries on.
3. A style SHALL be chosen first (or described, for the custom style). If it is not, pressing the photograph SHALL say "The flames are not ready" and explain what is missing, and no chamber opens. (The room type was removed; see studio-items.)
4. When the live AI is in use, the existing consent dialog SHALL come **before** the chamber opens.

## R5. Every screen

1. The chamber SHALL keep the whole circle of five candles on screen at any size from a 390 px wide phone (the narrowest size checked) up, centred, and SHALL never crop a candle.
2. On a tall screen the picture SHALL be letterboxed and fade into black; the text box SHALL stay in the middle of the circle, or under the picture on narrow screens.
3. Candles SHALL be at least 44 by 44 px to touch.
4. While the chamber is open the page behind it SHALL not scroll, and Mori and the drifting ghosts SHALL stay out of it.

## R6. Accessibility and motion

1. The chamber SHALL be a labelled dialog. Focus moves into it when it opens and returns to the photograph when it closes.
2. The words SHALL be announced to screen readers as they appear (a polite live region), not typed out letter by letter for them.
3. With reduced motion (system setting or the site's own switch) all flicker, drift and typing SHALL stop, and the flames and words SHALL stay visible.
4. Text on the text box SHALL keep a contrast of at least 4.5:1.

## R7. Free and private

1. The new artwork and recordings are static files from the site. No new service, key or cost.
2. Nothing about the ritual is sent anywhere; only the redesign request is, as before.

## Out of scope

Lighting candles on the Elegant side; a different set of words per candle position; a way to replay the ritual after the photograph is developed (the studio's Regenerate button does that without it).

## Click sound and candle dimming (follow-up)

- Every click in the Haunted site plays the first 1.4 s of `firesound.mp3` (volume 0.55, restarts on each click, silent when sound is off or a video plays).
- The candle cursor light now shrinks every 3.3 s (was 5 s) down to a floor of 12 % (was 15 %), so it is very dim before the 12 s jumpscare starts **(interpretation of 'dim 50 % more', to be confirmed)**. *Superseded: it was still too slow, so it now shrinks by 15 % every 1.2 s (about 7 s to the floor). See DEVELOPMENT_STATUS.md.*
