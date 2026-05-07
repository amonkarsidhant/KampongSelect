# Deployment guide — KampongSelect

A 30-minute checklist to get a working demo in front of the club chairman, all
on free tiers.

## What you need

- A laptop with Node.js 20+ installed (`brew install node` or [nodejs.org](https://nodejs.org))
- A GitHub account (free)
- A Vercel account (free — sign up with GitHub)
- A Supabase account (free — sign up with GitHub)

## Step 1 — Set up Supabase (10 min)

1. Go to <https://supabase.com> and click **New Project**.
2. Project name: `kampong-select`. Region: **West EU (Amsterdam)** — it's the closest.
3. Set a database password and save it. Wait ~2 min for provisioning.
4. Open the **SQL Editor** (left sidebar) → **New query**.
5. Copy the entire contents of `supabase/schema.sql` from this repo, paste into the editor, **Run**.
6. New query → paste `supabase/seed.sql` → **Run**. You should now have 8 teams, 8 sample matches and ~22 players.
7. Open **Project Settings → API**. Copy the **Project URL** and the **anon public key**. You'll need them in step 3.

### Configure email auth

8. **Authentication → Providers → Email**. Make sure "Email" is enabled, "Confirm email" is **off** (we use magic links, no passwords).
9. **Authentication → URL Configuration**. Set:
   - Site URL: `http://localhost:3000` for now (we'll change this after deploying)
   - Additional redirect URLs: leave default.

### Bootstrap your admin user

10. **Authentication → Users → Add user → Create new user**. Email: your own (the one you'll use for the demo). Tick "Auto-confirm".
11. **Table editor → players**. Find the row with `email = secretaris@kampongcricket.nl` (or any admin row). Edit it: change `email` to your real email, save.
12. The `auth_user_id` will get linked automatically the first time you sign in.

## Step 2 — Run locally (5 min)

```bash
git clone <your-fork-url> kampong-select
cd kampong-select
cp .env.local.example .env.local
# Edit .env.local — paste in the Project URL and anon key from step 1.7
npm install
npm run dev
```

Open <http://localhost:3000>. Sign in with your email, click the magic link in your inbox (check spam folder — Supabase emails sometimes land there). You should land on the admin dashboard.

## Step 3 — Deploy to Vercel (10 min)

1. Push your repo to GitHub (`git push origin main`).
2. Go to <https://vercel.com/new>, import the repo, accept all defaults.
3. **Environment Variables** section — add the same two vars from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**. ~90 seconds later you'll have a URL like `https://kampong-select-xyz.vercel.app`.
5. Go back to Supabase → **Authentication → URL Configuration** and update:
   - Site URL: your Vercel URL
   - Additional redirect URLs: add `https://kampong-select-xyz.vercel.app/auth/callback`

That's it — the demo is live.

## Step 4 — Demo script for the chairman

Walk through these three flows in order. Total time: ~3 minutes.

**Player view (30s)**
- Sign in as a regular player.
- "Players see only this. They tap Yes for Saturday or Sunday — that's their entire job, takes 5 seconds."
- Tap Yes for both days.

**Captain view (60s)**
- Sign out, sign in as the H1 captain.
- "Captains see only the players who said Yes. H1 picks first."
- Tick 11 boxes. "Notice the running count and the 11-cap."
- "Click confirm — now the H2 captain's pool drops by 11 automatically."

**Admin view (90s)**
- Sign in as the Fixture Secretary.
- "This is your view. Every team's selection progress at a glance."
- "Conflicts panel flags double-bookings — say someone got picked for Zami 1 on Saturday and H4 also plays Saturday."
- "Nudge button reminds non-responders. Export gives you a printable team sheet."
- "And it cost the club zero euros per month."

## Step 5 — When you're ready for real use

- **Custom domain**: in Vercel project settings → Domains, add `select.kampongcricket.nl` (or whatever the club has). Vercel issues an HTTPS cert automatically.
- **Real player roster**: run `npm run import-sheet -- --sheet-id <ID> --gid <GID>` against the existing Google Sheet, or paste players into the `players` table directly.
- **Email reminders**: sign up at <https://resend.com> (free 3000/mo), add the API key to Vercel env, wire up a server action that loops over non-responders. About 30 lines of code.
- **WhatsApp share**: instead of email, the admin could share a `wa.me/?text=...` link to the club's WhatsApp group with the team sheet pre-filled.

## What's free, forever

| Service        | Free quota                       | What you'll actually use |
| -------------- | -------------------------------- | ------------------------ |
| Vercel         | 100 GB bandwidth / month         | < 1 GB                   |
| Supabase       | 500 MB DB, 50k MAUs, 2 GB egress | < 5 MB                   |
| Resend (opt.)  | 3000 emails / month              | ~400 (one weekly nudge × 100 players) |
| GitHub Actions | 2000 min / month                 | ~2 (one sheet sync per week) |

For a single club at this scale, you will not pay anything. Ever.
