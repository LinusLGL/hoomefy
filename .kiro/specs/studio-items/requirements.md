# Studio: wishes, items and prices: requirements

The Design Studio asks for less and does more. The visitor's own words steer the picture, the room type, colour
palette and "furniture to replace" are gone, and once a design is made the studio finds the furniture in it and
looks up what it costs. Elegant and Haunted behave the same. Items marked **(assumed)** were not stated in the
brief; they are the reading chosen, so they can be confirmed or changed.

## R1. Wishes
1. The wishes box ("Extra instructions"; "Whisper your wishes" in Haunted) SHALL be in the **left** panel, under the style.
2. What the visitor writes there SHALL change the picture. It SHALL be sent to the image model **first**, marked as the priority, ahead of the style.
3. The style SHALL still be chosen and SHALL fill in everything the wishes do not mention. Intensity SHALL still apply.
4. The "keep the layout" rules SHALL give way to anything the wishes ask to change (for example "add a window"). With no wishes the strict rules apply as before.
5. The demo renderer cannot read wishes. When a wish was written and the result is a demo rendering, the studio SHALL say so in plain words.

## R2. Fewer questions
1. The room type, the colour palette and the "furniture to replace" picker SHALL be removed, from the screen, the saved data and the prompt.
2. A photo and a style SHALL be all that is needed to design. The Haunted ritual SHALL be gated on the same two things.
3. Older stored data that still holds those choices SHALL be read without error and the choices ignored.
4. Because the spirits of the haunted house were bound to those choices, designing no longer clears them **(assumed; see design.md)**. Ghosts, holy water, candles and the jumpscare are unchanged.

## R3. Finding the items
1. When a design finishes, the studio SHALL find the furniture and decor in it by itself, with nothing to press.
2. For each piece it SHALL name what it is in plain words and the words to search for it. Unknown kinds SHALL be dropped, names and search words cleaned, and at most ten pieces kept.
3. Finding SHALL be for signed-in visitors only and rate limited per user.
4. If it fails, the studio SHALL say why, keep the design and the shopping list as they were, and offer **Try again** and a finder that runs on the visitor's own device.
5. A design opened from My Designs SHALL keep the shopping list it was saved with and SHALL NOT be looked through again until the visitor asks.

## R4. Prices
1. Each piece SHALL be searched in the shops, three at a time. The product priced nearest the middle of the results SHALL be the one counted.
2. When no shop price is found (no search key, not signed in, nothing listed) the piece SHALL carry the typical price for the style, marked "est.". The shop links SHALL still work.
3. The search route SHALL answer signed-in visitors only and SHALL be rate limited per user.

## R5. The three tabs
1. **Summary** SHALL show the choices (style, wishes, intensity, budget), each piece with its price, a total, and how many prices come from shops.
2. **Furniture** SHALL list the pieces with their prices; choosing one SHALL show the products found, shop links and buttons to add a product or the estimate to the list.
3. **Shopping list** SHALL already hold one line per piece. A new design SHALL replace the lines the last one added and keep the lines the visitor added.
4. The total SHALL be compared with the budget, if one was set.
