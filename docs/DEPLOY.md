# Deploying Hoomefy for free

Hoomefy runs on three free services. You need an account on each, and no credit card for the main path.

| Part | Service | What it does |
|---|---|---|
| The website | **Cloudflare Pages** | Hosts the site and one small function for product search |
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
   - **Easiest (recommended for a demo or a hackathon):** switch **Confirm email** off. People can sign up and
     use the studio straight away, and judges can make an account in seconds.
   - **With email confirmation:** leave it on, then open **Authentication → Email Templates** and add the code
     `{{ .Token }}` to the *Confirm signup* and *Reset password* templates, because the site asks people to type
     the code. Supabase's built-in mailer only sends a few emails an hour, so connect your own SMTP service for
     real use.
4. Open **Authentication → URL Configuration** and set **Site URL** to your Cloudflare address once you have it
   (step 2 below), for example `https://hoomefy.pages.dev`.
5. Open **Project Settings → API** and copy two values:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon public** key

   The anon key is meant to be public. Never copy the **service_role** key anywhere in this project.

Supabase's free plan includes 50,000 monthly sign-ins, and small amounts of database and file storage (check
the current numbers on Supabase's pricing page). Each person can keep up to 50 designs, enforced in the database,
which keeps storage use small. Free Supabase projects may be paused after a period without activity; if that
happens press **Restore** in the dashboard.

## 2. Cloudflare Pages (the website) — about 10 minutes

1. Put this project on GitHub (public, with the `LICENSE` file and the `.kiro` folder).
2. In the Cloudflare dashboard open **Workers & Pages → Create → Pages → Connect to Git** and pick the repository.
3. Use these build settings:
   - **Root directory:** `frontend`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node version:** set the environment variable `NODE_VERSION` to `20`
4. Under **Environment variables** add:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | the Project URL from Supabase |
   | `VITE_SUPABASE_ANON_KEY` | the anon public key from Supabase |
   | `VITE_ALLOW_GUESTS` | `true` if visitors should use the studio without an account (optional) |

   `VITE_AI_PROVIDER` is not needed: production builds use the real AI model by default.
5. Press **Save and Deploy**. When it finishes, copy the `*.pages.dev` address into Supabase's **Site URL** (step 1.4).

### Option B: no GitHub at all (deploy from your own computer)

GitHub is only one way to feed Cloudflare Pages. You can also build the site on your computer and upload it
("Direct Upload"). Do this part after step 1, because the build needs the two Supabase values.

1. Create `frontend/.env.production.local` (it is ignored by git, so it never gets published) with:

   ```
   VITE_SUPABASE_URL=https://abcd1234.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   VITE_ALLOW_GUESTS=true
   ```

   `VITE_ALLOW_GUESTS` is optional. These values are baked into the site when it is built, so they must exist
   *before* you build. Setting them in the Cloudflare dashboard has no effect on a site you build yourself.
2. In a terminal: `cd frontend`, then `npx wrangler login` (a browser window opens; approve it).
3. Run `npm run deploy`. The first time it asks for a project name (use `hoomefy`) and a production branch
   (press Enter for `main`). It builds the site and uploads it, and prints your `https://hoomefy.pages.dev` address.
4. Run `npm run deploy` again after every change.

Use `wrangler` rather than the dashboard's drag-and-drop box: drag-and-drop does not upload the `functions`
folder, so the optional product-search function would be missing. The one environment variable the function
needs, `SERPER_API_KEY`, is always set in the Cloudflare dashboard under **Settings → Environment variables**,
whichever way you deploy.

Hackathons such as Kiroween still ask for a public GitHub repository to judge the code. That is separate from
hosting: you can host with Direct Upload and publish the code on GitHub, or connect the two later.

### How Cloudflare and Supabase fit together

They are not linked inside either dashboard. The site simply holds Supabase's public address and anon key (the
two `VITE_SUPABASE_*` values) and talks to Supabase directly from the browser. So the order is: set up Supabase
first (step 1), then build and deploy with its values, then paste the finished `pages.dev` address back into
Supabase's **Site URL** (step 1.4).

### Optional: live product prices

The furniture panel always shows search links for IKEA, Wayfair, Target, Amazon, Etsy and Google Shopping.
To also show live products with prices:

1. Create a free key at <https://serper.dev>.
2. In Cloudflare Pages open **Settings → Environment variables** and add `SERPER_API_KEY` (mark it **Encrypted**).
3. Redeploy. The key stays on Cloudflare's servers; the browser never sees it.

Without the key nothing breaks: the panel says live prices are not available and the shop links still work.

## 3. Check that everything works

1. Open your `*.pages.dev` address and press **Design My Room**, then create an account.
2. Upload a room photo, pick a room type and a theme, and press **Generate Design**. You should see the consent
   message, then a redesigned room in 10 to 30 seconds.
3. Press **Save design**, tick the box, then open **My Designs**. In Supabase, **Table Editor → designs** and
   **Storage → designs** should now show the row and the two images.
4. In the furniture tab press **Find furniture in my design** (it downloads a small model the first time).

From your computer, `cd frontend && npm run smoke:live -- path/to/room.jpg` checks the AI service on its own.

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

## 5. For hackathon judges

- Keep the site and the Supabase project running until judging ends.
- Put a ready-made test account (email and password) in the private field of the submission form, or set
  `VITE_ALLOW_GUESTS=true` so no account is needed to try the studio.
- Open the site now and then during judging so a free Supabase project is not paused for inactivity.
- A judge who runs out of free AI time sees the explanation above and can still look at a demo rendering.

## Limits worth knowing

| Thing | Limit |
|---|---|
| Cloudflare Pages | Free forever; 500 builds a month; single files up to 25 MiB (the biggest file here is about 2 MB) |
| Cloudflare Functions (product search) | 100,000 requests a day on the free plan; results are cached for a day |
| Supabase | 50,000 monthly active users on the free plan; storage and database sizes are small, see their pricing page |
| Photos | JPEG, PNG or WebP up to 10 MB, at least 512×512 pixels. The AI sees a copy at 1024 pixels on the long side |
| Hugging Face | Daily GPU allowance per visitor, as above; the queue can be busy at peak times |
