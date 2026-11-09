# Deploying Hoomefy for free

Hoomefy runs on three free services. You need an account on each, and no credit card for the main path.

| Part | Service | What it does |
|---|---|---|
| The website | **Cloudflare Workers** (static assets) | Hosts the site and one small function for product search |
| Accounts, saved designs, images | **Supabase** | Sign-up and sign-in, a table of designs, private image storage |
| The AI image model | **Hugging Face Spaces** | FLUX.2 klein 4B, called from the visitor's browser. Nothing to set up |

The site works without any of the first two while you develop (it falls back to a demo mode), so you can do
the steps in any order and check each one as you go.

---

## 1. Supabase (accounts and saved designs) — about 10 minutes

1. Sign in at <https://supabase.com> and press **New project**. Choose a name, a database password (keep it
   somewhere safe; the site never uses it) and the region closest to your visitors.
2. Open **SQL Editor → New query**, paste the whole of [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql)
   and press **Run**. It creates the `designs` table, a private `designs` storage bucket, and the rules that
   let each person see only their own rows and files.
3. Open **Authentication → Sign In / Providers → Email** and decide how sign-up works:
   - **Easiest (recommended for a demo or a hackathon):** switch **Confirm email** off and press **Save**. People can
     sign up and use the studio straight away, and judges can make an account in seconds. Leave **Enable Email
     provider** switched **on**: turning that off instead makes every sign-up fail with "Email signups are disabled".
   - **With email confirmation:** leave it on, then open **Authentication → Email Templates** and add the code
     `{{ .Token }}` to the *Confirm signup* and *Reset password* templates, because the site asks people to type
     the code. Supabase's built-in mailer only sends a few emails an hour, so connect your own SMTP service for
     real use.
4. Open **Authentication → URL Configuration** and set **Site URL** to your Cloudflare address once you have it
   (step 2 below), for example `https://hoomefy.your-name.workers.dev`.
5. Open **Project Settings → API** and copy two values:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon public** key

   The anon key is meant to be public. Never copy the **service_role** key anywhere in this project.

Supabase's free plan includes 50,000 monthly sign-ins, and small amounts of database and file storage (check
the current numbers on Supabase's pricing page). Each person can keep up to 50 designs, enforced in the database,
which keeps storage use small. Free Supabase projects may be paused after a period without activity; if that
happens press **Restore** in the dashboard.

## 2. GitHub, then Cloudflare (the website) — about 15 minutes

### 2a. Put the code on GitHub

The project is already a git repository with its first commit. You only need an empty place on GitHub to send it to.

1. Sign in at <https://github.com> and open <https://github.com/new>.
2. Repository name: `hoomefy`. Choose **Public** (Kiroween requires a public repository). **Do not** tick *Add a README*,
   *Add .gitignore* or *Choose a license*; the project already has them and the first push would clash.
3. Press **Create repository**, then copy the address it shows, like `https://github.com/your-name/hoomefy.git`.
4. In a terminal in the project folder (the one that contains `frontend`, `docs` and `.kiro`):

   ```
   git remote add origin https://github.com/your-name/hoomefy.git
   git push -u origin main
   ```

   The first push opens a browser window asking you to sign in to GitHub; approve it.
5. Refresh the repository page. You should see `frontend`, `docs`, `supabase` and `.kiro`, and a MIT licence badge.

Check that `.kiro` is there: Kiroween disqualifies a repository that leaves it out.

A note for Windows: this folder lives inside OneDrive. OneDrive and git's hidden `.git` folder sometimes fight
over locked files. If git ever reports a lock or corrupt-file error, right-click the folder in OneDrive and
choose *Always keep on this device*, or move the project to a folder outside OneDrive (for example
`C:\dev\hoomefy`) and clone it again from GitHub.

### 2b. Connect Cloudflare to the repository

Cloudflare now creates new Git-connected sites as **Workers** (the address ends in `.workers.dev`). The repository
already contains `frontend/wrangler.jsonc`, which tells Cloudflare that the site is the built `dist` folder and
that `/api/*` goes to a small worker. You do not set an output directory in the dashboard.

1. In the Cloudflare dashboard open **Workers & Pages → Create application → Import a repository** (Connect to Git).
2. Press **Connect GitHub**, sign in, and allow Cloudflare to see the `hoomefy` repository (choose *Only select
   repositories* if you prefer). Select it.
3. Set the project name to `hoomefy`. It must match `"name"` in `frontend/wrangler.jsonc`, otherwise the build stops
   with a name mismatch.
4. Use these build settings (after creating the project they are under **Settings → Build**):
   - **Root directory:** `frontend`
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
5. Add these as **Build** variables (**Settings → Build → Variables and secrets**), not only as the Worker's
   runtime variables. The `VITE_` values are written into the site while it is built, so a runtime variable does not reach it:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | the Project URL from Supabase |
   | `VITE_SUPABASE_ANON_KEY` | the anon public key from Supabase |
   | `VITE_ALLOW_GUESTS` | `true` if visitors should use the studio without an account (optional) |
   | `NODE_VERSION` | `20` (optional; the build also works on newer versions) |

   `VITE_AI_PROVIDER` is not needed: production builds use the real AI model by default.
6. Press **Save and Deploy**. When it finishes, copy the `*.workers.dev` address into Supabase's **Site URL** (step 1.4).

From now on every `git push` to `main` rebuilds and publishes the site by itself, and every other branch gets its own preview address.
After you change a build variable, open the **Deployments** or **Builds** tab and retry the build, or push a commit.

**A blank page that serves files like `/package.json` or `/src/main.tsx` means Cloudflare uploaded the project
folder instead of the built site.** Check that `frontend/wrangler.jsonc` is in the repository, that the root
directory is `frontend`, and that the deploy command is exactly `npx wrangler deploy` with no `--assets` option.

### Option B: no GitHub at all (deploy from your own computer)

GitHub is only one way to feed Cloudflare. You can also build the site on your computer and upload it with
`wrangler`. Do this part after step 1, because the build needs the two Supabase values.

1. Create `frontend/.env.production.local` (it is ignored by git, so it never gets published) with:

   ```
   VITE_SUPABASE_URL=https://abcd1234.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   VITE_ALLOW_GUESTS=true
   ```

   `VITE_ALLOW_GUESTS` is optional. These values are baked into the site when it is built, so they must exist
   *before* you build. Setting them in the Cloudflare dashboard has no effect on a site you build yourself.
2. In a terminal: `cd frontend`, then `npx wrangler login` (a browser window opens; approve it).
3. Run `npm run deploy`. It builds the site, uploads it with the settings in `frontend/wrangler.jsonc`, and prints your
   `https://hoomefy.<your-account>.workers.dev` address.
4. Run `npm run deploy` again after every change.

To try the finished build on your own computer first, run `npm run workers:dev` and open the address it prints. It runs the
same Workers runtime Cloudflare uses, including the security headers and the `/api` route.

The one environment variable the worker needs, `SERPER_API_KEY`, is always set in the Cloudflare dashboard under
**Settings → Variables and secrets**, whichever way you deploy.

Hackathons such as Kiroween still ask for a public GitHub repository to judge the code. That is separate from
hosting: you can deploy from your computer and publish the code on GitHub, or connect the two later.

### How Cloudflare and Supabase fit together

They are not linked inside either dashboard. The site simply holds Supabase's public address and anon key (the
two `VITE_SUPABASE_*` values) and talks to Supabase directly from the browser. So the order is: set up Supabase
first (step 1), then build and deploy with its values, then paste the finished `workers.dev` address back into
Supabase's **Site URL** (step 1.4).

### Optional: live product prices

The furniture panel always shows search links for IKEA, Wayfair, Target, Amazon, Etsy and Google Shopping.
To also show live products with prices:

1. Create a free key at <https://serper.dev>.
2. In Cloudflare open your Worker's **Settings → Variables and secrets** and add `SERPER_API_KEY` as a **Secret**.
3. Redeploy. The key stays on Cloudflare's servers; the browser never sees it.

Without the key nothing breaks: the panel says live prices are not available and the shop links still work.

## 3. Check that everything works

1. Open your `*.workers.dev` address and press **Design My Room**, then create an account.
2. Upload a room photo, pick a room type and a theme, and press **Generate Design**. You should see the consent
   message, then a redesigned room in 10 to 30 seconds.
3. Press **Save design**, tick the box, then open **My Designs**. In Supabase, **Table Editor → designs** and
   **Storage → designs** should now show the row and the two images.
4. In the furniture tab press **Find furniture in my design** (it downloads a small model the first time).

From your computer, `cd frontend && npm run smoke:live -- path/to/room.jpg` checks the AI service on its own, and
`npm run check:supabase` checks that your Supabase project keeps every person's designs and photos private (it makes two
throwaway accounts, tries to read one from the other, cleans up, and tells you which users to delete in the dashboard).

## 4. The free AI allowance, and what visitors see

The AI runs on Hugging Face's free GPUs and each **visitor's own** free allowance pays for their designs, so the
site needs no GPU and no key of its own. Hugging Face currently gives about 2 minutes of GPU time a day to a
visitor without an account (enough for several designs at roughly 5 to 15 seconds each) and about 5 minutes
to one with a free account.

When the allowance runs out the studio says so in plain words and offers:

- **More free AI time** (left panel): paste a free Hugging Face token to use your own, larger allowance.
- **Try again** later, or **Show a demo rendering instead**, a colour-graded preview that is clearly labelled.

The model is FLUX.2 [klein] 4B by Black Forest Labs under the Apache 2.0 licence. The studio uses the
official public Space `black-forest-labs/FLUX.2-klein-4B`. If you would rather not depend on someone else's
Space, duplicate it into your own free Hugging Face account and set `VITE_AI_SPACES` to your copy first, for
example `VITE_AI_SPACES=your-name/FLUX.2-klein-4B,black-forest-labs/FLUX.2-klein-4B`.

**"Space metadata could not be loaded":** Hugging Face's API refuses browser requests whose `Referer` is a
`*.workers.dev` address. The site therefore sends no referrer to other sites (`Referrer-Policy: same-origin` in
`public/_headers` and a matching `<meta name="referrer">` in `index.html`). Keep both if you edit the security headers.

## 5. For hackathon judges

- Keep the site and the Supabase project running until judging ends.
- Put a ready-made test account (email and password) in the private field of the submission form, or set
  `VITE_ALLOW_GUESTS=true` so no account is needed to try the studio.
- Open the site now and then during judging so a free Supabase project is not paused for inactivity.
- A judge who runs out of free AI time sees the explanation above and can still look at a demo rendering.

## Limits worth knowing

| Thing | Limit |
|---|---|
| Cloudflare static files | Requests for the site's own files are free and unlimited; single files up to 25 MiB (the biggest file here is about 2 MB) |
| Cloudflare builds | 3,000 build minutes a month on the free plan, one build at a time |
| Cloudflare Worker (product search, video and audio) | 100,000 requests a day on the free plan. Over that, those paths answer 429 until the next day; results of product search are cached for a day |
| Supabase | 50,000 monthly active users on the free plan; storage and database sizes are small, see their pricing page |
| Photos | JPEG, PNG or WebP up to 10 MB, at least 512×512 pixels. The AI sees a copy at 1024 pixels on the long side |
| Hugging Face | Daily GPU allowance per visitor, as above; the queue can be busy at peak times |
