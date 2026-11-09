# Design Studio: design

Replaces the mocked studio with a working one. Free to run: Cloudflare (Workers with static assets), Supabase and Hugging Face.

## Decisions and why

| Decision | Reason |
|---|---|
| FLUX.2 klein 4B on the official Hugging Face Space, called from the browser | Apache 2.0, edits a reference photo in ~4 steps. Each visitor's free ZeroGPU allowance pays for their runs, so the site needs no GPU and no key. Checked against the live Space: `/infer` takes `prompt` and an `input_images` gallery and returns `[image, seed]`. |
| Ask the client for `events: ['data','status']` | Without it the Gradio client hides queue positions and the "ZeroGPU quota exceeded" failure; a failed run looked like an empty answer. Found by reading the raw event stream. |
| Provider interface (`ImageEditProvider`) with a chain, a demo provider and a Gradio provider | The studio does not know which model runs. The demo provider keeps development and tests free; a chain falls back when a Space is down but stops on quota, which every Space shares. |
| Photo pipeline on the device (`prepareImage`) | Straightens (EXIF), re-encodes through a canvas (drops all metadata), makes a 1024px inference copy and a 2048px display copy; the original never leaves memory. Verified in a real browser with a JPEG carrying fake GPS text. |
| Consent before the first send | The photo goes to a third party. The dialog says what is sent and what is kept; nothing is requested before the visitor agrees. |
| Furniture detection on the device with OWL-ViT (Transformers.js 3.8.1 from a pinned jsDelivr URL) | The two hosted detector Spaces tried took 80 to 100 seconds. In the browser it takes seconds, costs no GPU time and keeps the design on the device. Loaded only on request: its WebAssembly runtime is over Cloudflare Pages' 25 MiB file limit, so it is not bundled. Version 4.x lacks operators the model needs on WebAssembly, so 3.8.1 is pinned. |
| Product search through a Cloudflare Worker route, optional | There is no free product API without a key. Shop links always work; live prices appear only if a key is set, and the key never reaches the browser. |
| Supabase for accounts, rows and files | Free, no card, row-level security gives per-user privacy without writing a backend. Saved designs are opt-in with an explicit checkbox. |
| Studio stays behind sign-in by default | Earlier work made "Design My Room" open the sign-in gate. `VITE_ALLOW_GUESTS=true` opens the studio to guests (saving still needs an account). |

## Layout

Desktop: controls | canvas | assistant (summary, furniture, shopping list), side panels sticky. Tablet: controls
collapse. Phone: full-width canvas and a bottom bar (Design, Furniture, Settings); in Haunted mode the ghost and
the sound/settings buttons sit above the bar.

## Out of scope

Deleting an account (needs a server-side key), video, multi-room projects, payments.
