# Hoomefy

**Dream Home. Haunted Twist.**

An AI interior-design studio. Upload a photo of a room, pick a theme, and the AI restyles that same room: the
walls, windows and layout stay, the furniture, colours and light change. Then it finds the furniture in the
result and helps you shop for similar pieces. A second, haunted mode turns the whole site into a candle-lit
mansion without changing what the studio can do.

Built for **Kiroween 2026**, Costume Contest category.

---

## What it does

- **Design studio** with three panels: controls on the left, the design canvas in the middle, the assistant and
  furniture on the right. On a tablet the controls collapse; on a phone a bottom bar switches between Design,
  Furniture and Settings.
- **Real AI redesign.** The photo is edited by [FLUX.2 \[klein\] 4B](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B)
  (Apache 2.0) on Hugging Face's free GPUs, called straight from the browser. The photo is the reference image,
  so it is an edit and not a new room.
- **Five themes plus your own words:** Scandinavian, Japandi, Modern Luxury, Minimalist and Halloween. Choosing
  a theme changes the prompt that is sent to the model, and so do the colour palette, intensity, extra
  instructions and the custom style text.
- **Private by design.** Photos are straightened, shrunk and stripped of camera and location data on your
  device. Only that copy goes to the AI service, and only after you agree. Nothing is stored unless you press
  Save design and tick the box.
- **Canvas tools:** before/after slider, zoom and pan, fullscreen, version history, download as JPEG,
  regenerate, save.
- **Furniture:** shows pieces that suit the room straight away, finds the ones actually in your picture with a
  detector that runs on your device, estimates prices for your theme, and links to IKEA, Wayfair, Target,
  Amazon, Etsy and Google Shopping. Live product prices appear if you add a search key. A shopping list adds
  up the pieces against your budget.
- **Accounts:** sign up and sign in with Supabase, a gallery of saved designs, delete any time.
- **Haunted mode:** a gothic mansion theme with a candle cursor, a ghost, hidden holy water and a jumpscare.
  Everything in the studio works the same in both modes.

## Architecture

```
Browser (React + TypeScript + Vite + Tailwind + Zustand)
 ├── photo pipeline            checks, straightens, strips EXIF, makes the 1024px copy (on device)
 ├── prompt builder            theme + palette + intensity + instructions -> the edit prompt
 ├── AI provider  ──────────►  Hugging Face Space black-forest-labs/FLUX.2-klein-4B  (visitor's free GPU allowance)
 ├── furniture detector        OWL-ViT in the browser (WebAssembly), loaded only when asked for
 └── Supabase client  ──────►  Supabase: Auth, a `designs` table and a private `designs` storage bucket (row-level security)

Cloudflare Workers (static assets)
 ├── the built site (static, from wrangler.jsonc)
 ├── worker/index.ts                     routes /api, and serves video and audio with Range support
 └── functions/api/furniture-search.ts   optional live product prices; keeps the search key off the device
```

There is no server of our own to run. See [docs/DEPLOY.md](docs/DEPLOY.md) to set up the free services.

## Run it locally

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

With nothing configured the studio runs in **demo mode**: sign-in is simulated, designs are kept in the tab and
the "AI" is a colour-grade stand-in, so you can use every screen without spending anyone's free GPU time.

To try the real model locally: `VITE_AI_PROVIDER=live npm run dev` (PowerShell: `$env:VITE_AI_PROVIDER='live'; npm run dev`).
To check the AI service on its own: `npm run smoke:live -- path/to/room.jpg`.

Settings live in `frontend/.env.example`.

## Tests

```bash
cd frontend
npm run type-check
npm run lint
npx vitest --run     # unit and component tests
npm run test:e2e     # Playwright, desktop and mobile (uses the demo renderer)
```

## Deploy

Free, no card needed for the main path: **Cloudflare Workers** + **Supabase**. Step by step in
[docs/DEPLOY.md](docs/DEPLOY.md).

## Project structure

```
frontend/
  src/
    pages/StudioPage.tsx            the three-panel workspace
    components/studio/              controls, canvas, side panel, dialogs
    features/studio/                themes, prompt builder, photo pipeline, AI providers
    features/furniture/             taxonomy, on-device detection, product search, shopping list
    features/haunting/ mansion/ holywater/   the haunted experience
    services/                       auth and saved designs (Supabase, with a local fallback)
  worker/index.ts, wrangler.jsonc   Cloudflare Worker entry and deploy config
  functions/api/                    product search handler used by the worker
  scripts/live-smoke.mjs            one-off check of the real AI service
supabase/migrations/0001_init.sql   database table, storage bucket and security rules
docs/DEPLOY.md                      free deployment guide
.kiro/                              specs, steering and hooks used to build the project
```

## Built with Kiro

The project was built spec-first with Kiro. The requirements, design and task lists are in `.kiro/specs`
(`hoomefy`, `scandinavian-elegant`, `haunted-takeover`, `haunted-mansion`, `design-studio`), and the product,
design, tech, security, testing and structure rules that guided every change are in `.kiro/steering`.

## Credits and licence

- Image model: FLUX.2 [klein] 4B by Black Forest Labs, Apache 2.0. Furniture detector: OWL-ViT (Apache 2.0) via
  Transformers.js.
- MIT licence, see [LICENSE](LICENSE).
