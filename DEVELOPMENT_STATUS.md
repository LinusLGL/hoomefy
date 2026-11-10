# Hoomefy Development Status

> **Correction (Nov 2026):** earlier revisions of this file marked frontend milestones "complete" and quoted
> percentages before the code had ever been compiled, linted or run. That was wrong: the first type-check
> found 112 errors. The frontend is now type-checked, linted (zero warnings), unit/integration tested
> (206 tests) and exercised end-to-end in a real browser (43 tests). Percentages in older sections below
> are estimates, not measurements. **The backend (AWS CDK, Lambda, Cognito, Bedrock) has not been started;
> every service in `frontend/src/services` is a development mock.**
>
> The haunted experience is a cinematic **haunted-mansion** takeover with a candle cursor, slow floating
> ghosts, and a build-the-house / replace-the-furniture mechanic that clears the ghosts.
> See `.kiro/specs/haunted-mansion/` (current art direction and gameplay) and `.kiro/specs/haunted-takeover/`
> (takeover mechanics; its school-era art direction is superseded) for requirements, design, tasks and limitations.
**Last Updated:** November 5, 2026  
**Phase:** Foundation & Setup Complete ✅

---

## ✅ Completed

### 1. Project Planning & Specifications
- [x] **Requirements Specification** - 80+ user stories with acceptance criteria
- [x] **Design Specification** - Complete architecture, data models, API design
- [x] **Task Breakdown** - 17 milestones, 80+ implementation tasks
- [x] **Kiro Steering Files** - Product, tech, structure, security, testing, design guidelines
- [x] **Root Documentation** - README, LICENSE, .gitignore

### 2. Frontend Foundation
- [x] **Project Structure** - Complete directory hierarchy created
- [x] **Build Configuration** - Vite + TypeScript + React setup
- [x] **Styling System** - Tailwind CSS with custom Hoomefy theme
- [x] **Type Definitions** - Core TypeScript types and interfaces
- [x] **Utilities** - Validation, constants, class name helpers
- [x] **Entry Points** - main.tsx, App.tsx with routing setup
- [x] **UI Components** - Button, Input, Card, Dialog, Toast, Spinner
- [x] **Layout Components** - Header, Footer, PageLayout with navigation
- [x] **Pages** - HomePage, HowItWorksPage, AboutPage, NotFoundPage
- [x] **Toast System** - Toast hook and container for notifications
- [x] **State Management** - Auth, Studio, and UI Zustand stores
- [x] **Authentication Pages** - SignUp, SignIn, ForgotPassword with validation
- [x] **Protected Routes** - Route wrapper for authenticated access
- [x] **Dynamic Header** - Shows user state and conditional navigation

### 3. Configuration Files
- [x] package.json with all dependencies
- [x] tsconfig.json with path aliases
- [x] vite.config.ts with test configuration
- [x] tailwind.config.js with custom theme
- [x] ESLint and Prettier configuration
- [x] .env.example with environment variables
- [x] Global CSS with custom styles

### 4. API Services Layer
- [x] **API Client** - Axios instance with auth interceptors
- [x] **Auth Service** - Sign up, sign in, forgot password (mock + Cognito-ready)
- [x] **Upload Service** - S3 presigned URLs, file validation
- [x] **Generation Service** - AI job creation and polling
- [x] **Projects Service** - CRUD operations for user projects
- [x] **Custom Hooks** - useImageUpload, useGeneration

### 5. Photo Upload Components
- [x] **ImageUpload** - Drag-drop with file selection fallback
- [x] **ImagePreview** - Image display with rotate and download
- [x] **UploadProgress** - Progress bar with percentage
- [x] **UploadContainer** - Complete upload workflow orchestrator

### 6. Design Selection Components
- [x] **RoomTypeSelector** - 7 room types with icons
- [x] **StyleSelector** - 10 design styles with color previews
- [x] **PreferencesPanel** - Color palette, intensity slider, custom instructions
- [x] **MoriAssistant** - Ghost guide with tips and messages

### 7. Design Studio & Generation
- [x] **StudioPage** - Three-panel responsive layout
- [x] **Step-by-step workflow** - Upload → Customize → Generate
- [x] **GenerationProgress** - Full-screen overlay with status
- [x] **Generation integration** - useGeneration hook with polling
- [x] **Protected routing** - Requires authentication

### 8. Comparison Components
- [x] **BeforeAfterSlider** - Interactive drag slider for image comparison
- [x] **SideBySideComparison** - Grid layout for before/after view

---

## 🚧 In Progress

### Current Focus: Gallery & Project Management

Design Studio complete with full generation workflow! Now building the project gallery for browsing and managing saved designs.

---

## 📋 Next Steps (Priority Order)

### Milestone 3: Photo Upload & AI Generation ✅ COMPLETE (100%)

All tasks complete! Design studio fully functional with mock AI generation.

### Milestone 4: Results & Gallery (NEXT - 0%)

#### High Priority
1. **Results Display**
   - ⏳ Results page/modal with generated image
   - ⏳ Save to gallery functionality
   - ⏳ Download generated image
   - ⏳ Share functionality
   - ⏳ Regenerate with tweaks

2. **Project Gallery**
   - ⏳ GalleryPage with grid layout
   - ⏳ Project cards with thumbnails
   - ⏳ Search and filter
   - ⏳ Project detail view
   - ⏳ Edit project metadata
   - ⏳ Delete projects

3. **Haunted Mode Effects**
   - ⏳ Haunted mode toggle in header
   - ⏳ Atmospheric overlays (mist, particles)
   - ⏳ Mori animations
   - ⏳ Spooky sound effects (optional)
   - ⏳ Dark theme enhancements

### Milestone 4: Results & Comparison
4. Cognito integration
5. Protected routes

### Milestone 4: Upload & Studio
1. Photo upload component
2. Design studio layout
3. Room type selector
4. Style selector
5. Preferences panel
6. Image viewer

### Milestone 5: Generation System
1. Generation progress component
2. Job status polling
3. Before/after comparison
4. Results viewer

### Milestone 6: Gallery
1. Project gallery grid
2. Project detail view
3. Project management (rename, delete)

### Milestone 7: Haunted Experience
1. Mori ghost character design
2. Haunted mode toggle
3. Atmospheric effects
4. Animated interactions

### Milestone 8: Backend Infrastructure
1. AWS CDK project setup
2. Auth stack (Cognito)
3. Storage stack (S3, DynamoDB)
4. API stack (Lambda, API Gateway)
5. Generation worker

### Milestone 9: AI Integration
1. Image generation provider interface
2. Mock provider implementation
3. Bedrock provider implementation
4. Prompt engineering

### Milestone 10: Testing
1. Unit tests for utilities
2. Component tests
3. Integration tests
4. E2E tests

### Milestone 11: Deployment
1. Build optimization
2. Environment configuration
3. AWS deployment scripts
4. Documentation

---

## 📊 Progress Overview

**Overall Progress:** ~25% Complete

| Milestone | Status | Progress |
|-----------|--------|----------|
| 1. Planning & Foundation | ✅ Complete | 100% |
| 2. Frontend Core | ✅ Complete | 100% |
| 3. Authentication | 🟡 In Progress | 10% |
| 4. Upload & Studio | ⬜ Not Started | 0% |
| 5. Generation System | ⬜ Not Started | 0% |
| 6. Gallery | ⬜ Not Started | 0% |
| 7. Haunted Experience | ⬜ Not Started | 0% |
| 8. Backend Infrastructure | ⬜ Not Started | 0% |
| 9. AI Integration | ⬜ Not Started | 0% |
| 10. Testing | ⬜ Not Started | 0% |
| 11. Deployment | ⬜ Not Started | 0% |

---

## 🎯 Key Achievements

1. **Comprehensive Planning**: Over 30,000 lines of detailed specifications
2. **Kiro-Driven Development**: Full use of Kiro specs and steering files
3. **Type-Safe Foundation**: TypeScript with strict mode enabled
4. **Modern Tech Stack**: React 18, Vite, Tailwind CSS, AWS serverless
5. **Premium Design System**: Custom Hoomefy theme with haunted personality
6. **Zero-Cost Development**: Mock AI provider for cost-free iteration

---

## 🚀 How to Continue Development

### 1. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

Visit http://localhost:5173 to see the homepage.

### 3. Next Implementation Tasks

Follow the task order in `.kiro/specs/hoomefy/tasks.md`:
- Start with TASK-2.1: Design System Setup (Button, Input components)
- Continue with TASK-2.2: Routing and Navigation
- Follow the milestone sequence

### 4. Use Kiro Steering Files

All development should reference:
- `.kiro/steering/tech.md` - Code conventions
- `.kiro/steering/design-guidelines.md` - Visual design
- `.kiro/steering/structure.md` - File organization
- `.kiro/steering/security.md` - Security practices
- `.kiro/steering/testing.md` - Test patterns

---

## 📦 Current File Structure

```
hoomefy/
├── .kiro/
│   ├── specs/hoomefy/          ✅ Complete
│   │   ├── requirements.md
│   │   ├── design.md
│   │   └── tasks.md
│   └── steering/               ✅ Complete
│       ├── product.md
│       ├── tech.md
│       ├── structure.md
│       ├── security.md
│       ├── testing.md
│       └── design-guidelines.md
├── frontend/                   🟡 In Progress
│   ├── public/                 ✅ Structure created
│   ├── src/
│   │   ├── components/         ⬜ Empty (next focus)
│   │   ├── pages/              ✅ HomePage, NotFoundPage
│   │   ├── types/              ✅ Core types defined
│   │   ├── utils/              ✅ Validation, constants
│   │   ├── styles/             ✅ Global CSS
│   │   ├── App.tsx             ✅ Created
│   │   └── main.tsx            ✅ Created
│   ├── package.json            ✅ Complete
│   ├── tsconfig.json           ✅ Complete
│   ├── vite.config.ts          ✅ Complete
│   ├── tailwind.config.js      ✅ Complete
│   └── .env.example            ✅ Complete
├── backend/                    ⬜ Not Started
├── README.md                   ✅ Complete
├── LICENSE                     ✅ Complete
└── .gitignore                  ✅ Complete
```

---

## 💡 Notes for Continued Development

1. **Run `npm install`** in the frontend directory to install all dependencies
2. **Follow the task list** in `.kiro/specs/hoomefy/tasks.md` for implementation order
3. **Reference steering files** for consistent code patterns and design
4. **Start with UI components** - Build the shadcn/ui-style components first
5. **Mock AI provider** - Use the mock provider during development to avoid AWS costs
6. **Test as you go** - Write tests alongside new features
7. **Git commits** - Make frequent, descriptive commits following conventional commit style

---

## 🎨 Design System Ready

The Hoomefy design system is fully defined:
- **Colors**: Midnight Navy, Deep Purple, Warm Amber, Ivory, Gold
- **Typography**: Playfair Display (headings), Inter (body)
- **Components**: Patterns defined in design-guidelines.md
- **Animations**: Custom keyframes for haunted effects
- **Responsive**: Mobile-first with defined breakpoints

---

## 🔐 Security Considerations

Security patterns are defined and ready to implement:
- JWT authentication flow
- Input validation on all forms
- File upload validation
- CORS configuration
- Rate limiting strategy

---

**Status:** Ready for component development! 🚀

The foundation is solid. Continue with TASK-2.1 to build the UI component library.

## Haunted landing page redesign (matches "Haunted Mansion Interior Design Landing Page")
Done:
- Haunted home follows the design: "Welcome to Hoomefy" title with a blood-red H, drips and swoosh; the three-line paragraph with the red italic "remember their past."; Design My Room and How It Works buttons; the framed mansion scene on the right; the three-step strip (Upload Your Room, Reimagine with AI, Discover New Spaces); a dark header with a red rule and ornament. Checked against the design at 1672px (text, buttons, frame and strip land within a few pixels) and at 1280, 1440, 900 and 390px.
- Background is the supplied `WallpaperWebsiteHaunted` image, fixed behind the page, with flickering chandelier/fireplace/candle glows, a slow push-in, fog and dust. The foreground candles, portrait, cobwebs and candelabra are cut from the design file so their edges match it.
- Sound (`soundtrack.ts`, `HauntedSoundtrack.tsx`): `HauntingStart.mp3` plays when the haunting is triggered (scroll, mirror, replay, or choosing Haunted mode in settings); when it ends, the cinematic ambient track loops. A reload that is already Haunted plays only the ambient loop. A visible mute button (also in settings) stops it and the choice is remembered. It pauses while the tab is hidden.
- Sign-in, sign-up and password screens (Haunted only): `SignupBackground.mp4` loops muted behind all of them; the card is translucent so the form stays readable. With reduced motion a still poster is shown instead.
- Tests: unit 282 (new: soundtrack, HauntedSoundtrack, backdrop video, CSS scope guard, GlitchText phrases); Playwright adds `soundtrack.spec.ts` and `signup-video.spec.ts`.

Assumptions to confirm:
- The sign-up video plays **muted** (its audio track was removed) so the music keeps playing over it.
- Browsers block audio until the visitor has clicked, pressed a key or touched the page. Scrolling does not count. If the takeover starts before any interaction, the sound starts on the first click, key press or touch.
- The "How it works" steps section is replaced in Haunted by the strip under the hero; Elegant keeps its own section.
- The video was re-encoded from 19 MB to 2 MB (1280x720) and its audio dropped; the originals are untouched in `Resource/`.

Limits:
- The design's photographic parts (framed scene, foreground candles) are crops of the design image, not code. Its weathered title texture and the notched button corners are not reproduced.
- Not tested in Firefox or Safari, and the audio was not listened to.

## Haunted sign-in gate and shared auth design
- In Haunted mode, **/signin** first asks "Are You a Revisiting Companion or New Soul?" (`HauntedAuthGate`). The lantern card ("Revisiting Companion") opens the sign-in form; the key card ("New Soul") links to **/signup**, which goes straight to the sign-up form. The sign-in form has a "Not a returning companion? Go back" link. Elegant has no gate and goes straight to the form.
- Every way in for a signed-out Haunted visitor shows the gate: **Design My Room** and **Open the Studio** (the studio is protected, so they redirect to /signin), the header **Get Started** (desktop and mobile menu), the header **Sign In**, and typing a protected address. After a successful sign-in the visitor still lands where they were headed (the studio). Elegant is unchanged: Get Started goes to /signup, and Design My Room goes to the plain sign-in form.
- The gate is skipped only when the visitor has plainly answered already: the sign-up page's "Sign In" link, "Go to Sign In" after registering, and "Back to Sign In" / "Sign In" on the password pages. These pass `state.returning`.
- Sign-in, sign-up, forgot-password and check-your-email share one design through `AuthShell`: the looping video, the Hoomefy mark with the red rule (`HauntedAuthBrand`), and a gilded, chamfered card frame. The frame is gold for returning companions (sign-in, password reset) and crimson for new souls (sign-up). Labels, headings, inputs and buttons use the landing page's serif and crimson styles, and links take the frame's colour instead of the theme's sage accent.
- The lantern and key are drawn as SVG, not taken from the design image. Card frames are CSS.
- Verification: tsc, eslint, 282 unit tests, build and 87 Playwright tests (desktop and Pixel 5) pass. `auth-gate.spec.ts` has 21 tests: gate placement, both paths, Design My Room and Get Started entry points (sign in and register), the skip rules, shared design, the password page, Elegant unchanged, reduced motion, keyboard use and axe accessibility.
- Checked by eye at 1280x800 and 390px: the gate, the sign-in form, the sign-up form and the password page.
- Test fixes made on the way: the `openSignInForm` helper now uses role and label locators (the card title contains a `<br>`, so a CSS text match never found it); two candle and candlelight checks wait for their CSS fade with `toHaveCSS` instead of sampling mid-transition; and the takeover test takes its phase-C screenshot in the background, because that screenshot could take about 3s under load while phase D lasts only 1.5s, so the test sometimes missed D.

## Haunted rooms, holy water, the ghost and the jumpscare
- **Rooms:** the three cards under "Haunted Styles" (The Drawing Room, The Library, The Grand Ballroom) now show `drawingroom`, `thelibrary` and `grandballroom`. Clicking a card opens the painting full-screen (`RoomViewer`: a modal dialog; the page behind is inert; Esc, the close button or a click outside closes it; focus goes back to the card). The viewer sits above the candlelight darkness so the whole painting can be searched. Elegant keeps its colour swatches and has no room buttons.
- **Holy water:** each room hides its own bottle, drawn as an SVG vial on top of the painting. The spots are the library desk between the inkwell and the great tome, the drawing-room table to the right of the framed portrait, and the ballroom cloth to the right of the decanter. They are set in `features/holywater/rooms.ts` as percentages of the painting. A faint glint marks each bottle. **One is enough:** collecting any one hides the others.
- **The ghost** (`avatar.gif`, re-encoded): appears at the bottom right 3 seconds after the Haunted page settles, on every Haunted page, and stays. A speech bubble on its head says "Explore the Haunted Styles and collect the holy water, or I will scare you when the fire is gone.", then the clue of whichever room is open, then "bring it to me" once the water is found. Pressing the ghost says the last message again. The picture has a solid black background, so it is blended onto the page (`mix-blend-mode: screen`); with reduced motion it shows a still frame.
- **Using the holy water:** once collected, the bottle sits beside the ghost. Drag it onto the ghost, or press it and then press the ghost (Enter works on both). `Holywatereffect.mp4` plays full-screen (with a Skip button), then the whole site returns to Elegant. The ghost stays away for the rest of the tab, even if Haunted mode is chosen again.
- **Jumpscare:** if the candle stays at its lowest light (15%) for 12 seconds in a row, `Jumpscare.mp4` plays full-screen. It plays **once per tab session** and never again. It is cancelled by a click that brightens the candle, or by already holding the holy water. It waits while an upload or generation is running, and needs the candle to be in use (Haunted, candle cursor and darkness on, a mouse): on a touch screen there is no candle, so no scare. With reduced motion the video is skipped. Escape ends either video.
- **Remembered:** the holy water, the scare and the cure live in `sessionStorage` (per tab). A reload keeps them; a new tab starts fresh.
- **Sound:** the soundtrack stops while a video plays and comes back afterwards.
- **Assets** (originals untouched in `Resource/`): the three paintings as WebP (about 130 to 210 KB each, plus 800px thumbnails), the avatar as a 521 KB animated WebP plus a 9 KB still, both videos recompressed to about 0.9 and 1.0 MB with their sound kept.
- **Code:** `features/holywater/` (`rooms`, `holyWaterStore`, `copy`, `useScareTimer`, `RoomViewer`, `GhostAvatar`, `FullscreenVideo`, `HolyWaterLayer`), `components/icons/HolyWaterBottle.tsx`, `styles/haunted-holywater.css` (every rule scoped to Haunted, guarded by a test).
- **Verification:** tsc, eslint, 339 unit tests (57 new), build, and 124 Playwright tests (desktop and Pixel 5) pass. The 12-second rule is tested with a frozen browser clock: nothing at 10 s, the scare by 13 s, once only. The suite also covers all three rooms, the 3-second arrival, the clue in the bubble, drag and press-press use, the cure to Elegant, keyboard use, axe accessibility and the phone layout.
- **Seen by eye:** the home cards, the library viewer with the vial and the ghost's clue, the bottle beside the ghost, and the phone layout. I did not watch the two videos play to the end by eye or listen to them; the tests confirm they load, play and end.

Assumptions to confirm:
- The ghost speaks in the first person ("I will scare you"), though your note said "he". The text is one line in `features/holywater/copy.ts`.
- Holding the holy water protects you from the scare: it only plays if none has been collected.
- Pressing the ghost without the bottle in hand does nothing except repeat the message.
- If the browser blocks sound for the jumpscare (it plays with no click in that moment), the picture plays muted. Sound is expected once the visitor has clicked anywhere on the site.

Limits:
- Chrome only. The bottle is easy to find with the clue; if it proves too easy or too hard, move it in `rooms.ts`.
- The ghost covers the bottom-right corner (the footer's social icons, when scrolled there).

## Design studio rebuilt as a working product (Nov 2026)

Replaced the mocked studio and the AWS plan with a free, working stack: Cloudflare, Supabase and Hugging Face. Details in `.kiro/specs/design-studio` and `docs/DEPLOY.md`.

- **Themes and prompt:** Scandinavian, Japandi, Modern Luxury, Minimalist, Halloween and a custom text style replace the old ten styles. The theme, palette, intensity, extra instructions and custom text all go into the prompt, which tells the model to keep the layout, windows, doors, camera and furniture positions.
- **Photo pipeline:** real file-type check by first bytes, 10 MB and 512 px limits, EXIF rotation, metadata stripped by re-encoding, a 1024 px copy for the AI and a 2048 px copy for display, the original kept separately and never sent. The EXIF removal is tested in a real browser.
- **AI:** FLUX.2 klein 4B on the official Hugging Face Space, called from the browser. Checked live: a ruined Gothic room became a bright Scandinavian one in 7 to 13 seconds with the architecture kept. A consent dialog comes first. When the visitor's free GPU time is used up the studio says so and offers a token, retry or a clearly labelled demo rendering. This needed `events: ['data', 'status']`: without it the client dropped the quota failure and showed an empty answer.
- **Canvas:** before/after slider, After/Before views, zoom and pan, fullscreen, version history, JPEG download, regenerate, save.
- **Furniture:** suggestions per room with price estimates, on-device detection with OWL-ViT (boxes over the picture), shop links, optional live prices through `functions/api/furniture-search.ts`, shopping list with a budget bar.
- **Accounts and saving:** Supabase sign-up and sign-in, a `designs` table with row-level security, a private storage bucket, 50 designs per person, a gallery to open, download and delete. Saving needs an explicit checkbox.
- **Layout:** three panels on desktop (side panels stay in view), collapsible controls on a tablet, a bottom bar on a phone. In Haunted mode the ghost and the settings buttons sit above the bar.
- **Cloudflare:** security headers and CSP in `public/_headers`, the product-search function. Deployed as a Cloudflare Worker with static assets (see the Nov 5 hosting fix below). The production build was served locally with `wrangler dev` and run against the real model with no console errors. The detector library loads from a pinned CDN because its WebAssembly runtime is larger than Pages' 25 MiB file limit.
- **Not done or not checked:** no real Supabase project was available here, so sign-up, saving and the storage rules are tested against the in-memory fallback and by unit tests, not against Supabase itself. Run `supabase/migrations/0001_init.sql` and follow `docs/DEPLOY.md` before relying on them. Live product prices need a `SERPER_API_KEY` and were not exercised against Serper. The WebGPU path was not tested (no GPU adapter here); the detector runs on WebAssembly. Chrome only.
- **Fixed on the way:** `haunted-holywater.css` was overwritten by a mistake and rebuilt from the last production bundle; the stylesheet tests pass and screenshots match the earlier ones.
- **Test results:** type check and lint clean, 457 unit and component tests, 140 Playwright tests (desktop and mobile), production build ok.

## Hosting fix: blank page on workers.dev (Nov 5, 2026)

The first Git-connected deploy showed a blank page. Cloudflare had created a **Worker** (`hoomefy.<account>.workers.dev`), not a Pages project, and with no `wrangler.jsonc` it uploaded the whole `frontend/` folder as static files. The address served the unbuilt `index.html` (pointing at `/src/main.tsx`) and even `package.json`; nothing could run.

- **Fix:** `frontend/wrangler.jsonc` points the assets at `./dist`, turns on the single-page-app fallback, and runs `worker/index.ts` first for `/api/*`, `/video/*` and `/audio/*`. The earlier "no wrangler config" decision was right for Pages and wrong for Workers.
- **Worker:** `/api/furniture-search` calls the existing handler; other `/api/*` paths answer 404 JSON; video and audio get HTTP Range support (206/416), because Workers static assets answer a Range request with the whole file and Safari will not play that. A missing media file is a real 404, not the app's HTML.
- **Scripts:** `pages:dev` is now `workers:dev` (`wrangler dev`); `deploy` runs `wrangler deploy`.
- **Verified locally** with `wrangler dev` (the Workers runtime): home, deep links (`/studio`, `/gallery`) fall back to the app, `/src/main.tsx`, `/package.json` and `/functions/*` are no longer public, security headers and the immutable cache on `/assets/*` apply, API 200/400/404/405, media 200/206/416/404, Chrome loads the Haunted backdrop video with a 206 and no console or CSP errors.
- **Not verified:** the deploy on Cloudflare itself (the dashboard build settings are the user's), Safari playback, and `wrangler deploy` from Cloudflare's builder. Build variables (`VITE_*`) must be set as **Build** variables in the Worker's settings, not only as runtime variables.

## "Space metadata could not be loaded" on the live site (Nov 2026)

On `*.workers.dev` the AI step failed with "The AI service could not finish this design: Space metadata could not be loaded." The Space was healthy. The Gradio client asks `https://huggingface.co/api/spaces/<space>/host` from the browser, and Hugging Face answers **404 with no CORS header** when that request carries a `Referer` from a `*.workers.dev` address (`pages.dev`, `github.io`, `example.com` and `localhost` are fine, which is why local runs and `wrangler dev` never showed it). The site's `Referrer-Policy: strict-origin-when-cross-origin` sent exactly that Referer.

- **Found by:** reproducing in Chrome on the live origin (Failed to fetch, CORS error), then replaying the request with curl one header at a time (`Origin` alone: 200; `Referer` alone: 404), then trying referrer policies from the live page (`same-origin` and `no-referrer`: 200).
- **Fix:** `Referrer-Policy: same-origin` in `public/_headers` and `<meta name="referrer" content="same-origin">` in `index.html`. Other sites, Hugging Face included, no longer receive the page address. Do not change this back to `strict-origin-when-cross-origin`.
- **Also covered:** the in-browser furniture detector downloads its model from `huggingface.co`, which the same Referer rule would have broken.

## Backup AI source: Cloudflare Workers AI (Nov 2026)

Hugging Face's free GPU time ("The free AI time for today is used up") is one allowance per visitor that all ZeroGPU Spaces share, so more Hugging Face Spaces cannot be a backup. Cloudflare Workers AI hosts the same FLUX.2 [klein] 4B with image editing and has its own free allowance (10,000 neurons a day on the Free plan, about 100 designs; a Free plan cannot be billed past it).

- **Chain:** Hugging Face, then Cloudflare, then the labelled demo rendering. `createChainProvider` now uses a `quotaGroup` per provider: a "used up" answer skips the rest of its group (all Hugging Face Spaces) but not providers with their own allowance. Refusals (`invalid`) and cancellations still end the attempt at once so a declined photo is not sent twice. If every source fails, the "used up" error is the one shown.
- **Route:** `POST /api/redesign` (`worker/redesign.ts`). In order: POST only; multipart body up to 1.5 MB with a Content-Length; caller must be a signed-in user of this Supabase project (checked by calling Supabase `/auth/v1/user` with the visitor's own token and key, so the Worker holds no secret); per-user rate limit of 4 a minute; prompt, size (256 to 1024, multiples of 8), seed and photo validated, the photo by its first bytes. The model call goes through the `AI` binding. The answer travels back as base64 JSON, decoded by the browser, because the Free plan allows 10 ms of CPU per request. Prompt and photo are never logged.
- **Browser:** `cloudflareProvider.ts` shrinks the photo to 480 px (the model takes reference images under 512 px) with `shrinkToJpeg`, posts it with the Supabase session, and maps 429 QUOTA to `quota`, 429 RATE_LIMITED to `busy`, 400 to `invalid`, everything else to `unavailable`. Only added to the chain when Supabase is configured and `VITE_AI_FALLBACK` is not `off`; guests skip it.
- **Privacy:** the consent dialog, the privacy note and the allowance panel name Cloudflare. The consent key moved to `hoomefy_ai_consent_v2` so people who agreed to Hugging Face alone are asked again.
- **Config:** `wrangler.jsonc` gained the `ai` binding, `vars.SUPABASE_URL` (public) and a `ratelimits` binding. Dry-run deploy accepts it. `workers:dev` now needs `wrangler login` because Workers AI always runs remotely.
- **Tests:** 514 unit tests pass (57 new: chain rules, the Cloudflare provider, the route's every refusal and error mapping). Browser tests for the studio, mobile and sign-in gate pass (39).
- **Verified live** (workers.dev, real Supabase account, real Workers AI): the route refuses GET, a missing size, a non-form body, no sign-in and a fake token (405, 411, 415, 401, 401); with Hugging Face blocked in the browser the studio falls back and returns a 1024x720 design in 6 s; with Hugging Face allowed but out of free time (the real situation) it falls back by itself and returns a 1024x688 design in 11 s; no console or CSP errors; the consent dialog and privacy note name Cloudflare.
- **Quality caveat (measured):** the Cloudflare model sees a 480 px reference, so the layout is kept more loosely than on Hugging Face. Over 5 samples of the app's own prompt the sofa, main window and fireplace stayed in place every time; an arched window became square in some, and an extra window or door appeared in some. Prompt rewordings ("image 0" wording, a short preserve-first prompt) and a 512 px reference did not do better, so the prompt was left as it is.
- **Not verified:** both sources used up at once (it would take about 100 designs; covered by unit tests only), Safari and Firefox, the guest path on the live site.

## "Your mansion" panel removed (Nov 2026)

Removed the Haunted-only "Your mansion" panel (`MansionProgress`: house name, "0 of 7 rooms cleared", the room list and the "Build the next house" button) from the Studio right column and from the Gallery. The component file is deleted.

- **Kept:** the spirit mechanic (haunting report, furniture "a spirit is bound to this" markers, spirits leaving the result, outcome banner, floating ghosts, candle light level) and the saved game state (`hoomefy_mansion`), so progress is still recorded and survives a reload.
- **Consequence:** the rooms-cleared count is no longer shown anywhere, and once all 7 rooms are clear there is no button to start a second house (`buildNextHouse` is still in the store and its tests, but nothing calls it).
- **Tests:** the three panel unit tests were deleted; the browser tests that read the count from the panel now read it from the saved state (`clearedRooms` helper), the "build the next house" and "gallery shows the progress" tests were trimmed or removed.

## Design Studio fits the screen (Nov 2026)

On laptop and desktop screens (1024px wide and up) the Design Studio is now one fixed screen: the page never scrolls, the footer is hidden there, and none of the three columns needs to scroll. Before, the page scrolled by about 400 to 660px at every size tested (1366x768, 1440x900, 1920x1080) and the left column was 1,200 to 1,800px too tall for its space.

- **Frame:** `PageLayout fit` makes the page exactly `100dvh` on `lg+` and drops the footer there; `data-studio-fit` (set by `StudioPage`) locks page scroll in `globals.css`, because the Haunted background layers (mist, grain, drifting ghosts) extend past the bottom and would add a scrollbar.
- **Layout (`lg`):** columns of 260/280px (300/340px at `xl`) around a flexible canvas. Left: photo, room type, style, and the furniture picker (with the Haunted haunting report inside its card). Right: assistant, preferences, then the Summary / Furniture / Shopping tabs, which scroll inside their own panel. The toolbar is one slim row with Reset next to Generate.
- **Compact controls:** every shared control gets `lg:` variants only, so tablet and phone layouts are unchanged: room chips wrap instead of a 2-column grid of cards, style tiles are 3 across with the tagline kept for screen readers, palette chips sit in one row, the notes box is two lines, the photo row is one line with icon-only Replace and Remove, and the spirit list is names on one line.
- **Canvas:** upload, preview, progress and result fill the available height and show the whole photo (`object-contain`) instead of a cropped 16:9 frame (`BeforeAfterSlider fitHeight`). The tools, version thumbnails and demo note share rows.
- **Placement:** a few controls live in different columns by screen size (preferences, AI allowance, reset, the haunting report). They are rendered once, chosen by `useMediaQuery('(min-width: 1024px)')`, because two copies would duplicate ids and labels.
- **Floating Haunted buttons:** the fixed sound/settings buttons used to sit on the last row of furniture chips. The left column now keeps 56px free beneath it.
- **Measured** (Chrome, the studio with no photo, a photo, and a finished design, in Elegant and Haunted): zero page scroll and zero column scroll at 1366x768, 1440x900 and 1920x1080. On shorter screens the page still never scrolls; Haunted at 1280x720 and 1536x730 needs up to 28px of scrolling inside the left column, and Elegant at 1280x720 up to 5px in the right column.
- **Worst case:** a Haunted room can have three spirits, a long outcome banner and two versions; the test seeds exactly that at 1366x768 and the image keeps about 350px of height.
- **Tests:** `tests/e2e/studio-fit.spec.ts` (6 tests: both experiences at three sizes) checks that the page and every column fit, every control is on screen, the floating buttons cover nothing clickable, and the canvas keeps room. 511 unit tests still pass.
- **Not changed or checked:** tablet (768 to 1023px) and phone layouts keep their existing scrolling and bottom-bar behaviour (checked by the existing tests, not redesigned); Safari and Firefox were not tried; browser zoom above 100% makes the viewport smaller, so it behaves like a shorter screen.

- **Checked on the live site** (workers.dev, real Supabase account, real-AI mode, which shows the "More free AI time" panel that the test server never renders): zero page scroll at 1366x768, 1440x900 and 1920x1080; the footer is hidden. Measured again locally with that panel on (empty and photo states only, to spend no AI time): zero scroll anywhere at 1366x768 and larger in both experiences; at 1280x720 the right column scrolls up to 26px and the Haunted left column up to 22px. The allowance panel was tightened (`lg:p-2.5`) and the tabs panel minimum lowered to 8.5rem as a result.
