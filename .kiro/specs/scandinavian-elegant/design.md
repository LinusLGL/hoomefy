# Scandinavian Elegant — how the Elegant mode follows the design

Source: `Scandinavian Dreams by Hoomefy.png` (1780 x 884). The mockup is 1:1 CSS pixels at a 1780px-wide window
(header 64px + 1px border, 18px body text), so measurements from it are real sizes.

## What was taken from the design file

| Item | How |
| --- | --- |
| Colours | Measured with a canvas sampler: page `#F0EEEB`, header `#F5F3F1`, ink `#0B2124`, buttons `#4A6F57`, header CTA `#2C4A3D`, sage `#B7C2BA`, swoosh `#A4B2AC`. They are the Elegant tokens in `palettes.ts`; new tokens `cta`, `cta-hover`, `header`. |
| Type | Closest Google font found by rendering candidates next to the crop: Newsreader (headings, 500; wordmark 700). Inter for body. Haunted keeps Playfair Display (`--font-heading`). |
| Hero photograph | `public/images/hero/scandinavian-room.jpg`, cropped from the design (x 656..1780, y 67..833). The paragraph's last words that reached into its left edge were removed and feathered. |
| Foreground leaves | `public/images/hero/hero-leaves.png`, keyed out of the design's left strip into a transparent PNG. |
| Waves | Edges traced from pixels, smoothed to Bezier paths (`components/landing/heroArtPaths.ts`), drawn by `HeroArt.tsx` with the measured gradients. |

## Layout (`styles/elegant.css`)

* At 1180px and up, the hero and the top of the styles section share one box (`.hf-top`). `--k` is one design pixel at the current width, so the photo, waves, text and label keep the mockup's proportions at any width. At 1780px the text rows match the design within 1px.
* Below 1180px the hero stacks: text, a square window onto the photograph (so the baked-in label and wave are cropped out), then the label card.
* Every rule is scoped to `html:not([data-experience='haunted'])` (guarded by `elegant.test.ts`), so Haunted cannot change.

## Takeover

The hero is still the WebGL scene frame. Its "from" image is now the photograph, and the shader fits each texture by its own aspect ratio, so the mansion painting keeps its framing. The text-shift anomaly keeps the photograph rather than swapping in the painted room.

## Known limits

* The photograph is a crop of the design file, so the label ("Scandinavian ...") and the "Styles, curated" strip are painted into it. The live label card covers the first exactly; the wave covers the second. A clean export of the photo (no text, no card) would remove this dependency: replace `scandinavian-room.jpg` keeping the same crop.
* The serif is a close match, not a confirmed one.
* Letter shapes are kept inline (for kerning) except while the takeover animates them.
* Between 1180px and about 1300px the text column is narrower than the design's; it is checked visually at 1280, 1440, 1780, 900 and 390px, not on real devices.
