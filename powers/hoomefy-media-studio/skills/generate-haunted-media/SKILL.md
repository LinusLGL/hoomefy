---
name: generate-haunted-media
description: Use when you need a new image, video clip or sound for Hoomefy (haunted room scenes, the five-candle ritual, the mirror takeover, the jumpscare, Mori the ghost, ambient audio). Produces an on-brand prompt and generates it with the OpenArt MCP server.
---

# Generate haunted media for Hoomefy

Hoomefy is a professional interior design tool with a haunted overlay ("Dream Home. Haunted Twist."). Media must feel premium and a little mischievous, and must never get in the way of the room photo.

## Brand constraints

- Palette: midnight navy `#0A1128`, deep purple `#1C0B33`, warm amber `#D4A574`, ivory `#F5F1E8`, gold `#C9A961`.
- Light: candlelight and soft mist. Avoid harsh red, gore and realistic injury.
- Mori, the ghost mascot, is soft, translucent and friendly.
- No text, logos, watermarks or real people in the image.
- Sound and music: original or generated only. Never imitate a known song, score or voice.

## Steps

1. Identify the asset: type (image, video, sound), where it appears, size or length, and format. Read the existing asset in `frontend/public/` or `frontend/src/features/haunting/` that it replaces or sits next to.
2. Write the prompt in this order: subject, mood, palette, lighting, camera or aspect ratio, and a short "avoid" list. Show it to the user before generating.
3. Generate with the `OpenArt` tools. If a tool asks for sign-in or credits, tell the user and stop.
4. Report: tool used, prompt, result link or id, proposed file name and path (kebab-case), format, and any licence note the tool shows.
5. Remind the user to record the asset and its licence in the project's attribution notes before it ships.

## Do not

- Claim an asset was generated unless a tool call returned it.
- Put keys, tokens or personal photos in a prompt.
- Add heavy files to `frontend/public/` without checking the size budget (initial bundle under 200 KB; media is lazy loaded).
