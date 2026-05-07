# KampongSelect

Weekend availability + tiered XI selection for Kampong Cricket Club.
Built on a fully free stack — €0/month for a club of ~100 players.

## What it does

- **Players** set Yes/No for Saturday and Sunday each week (15-second job on a phone).
- **Captains** pick their XI from the available pool. H1 picks first, then H2, H3, H4, H5 — the cascade automatically removes already-picked players from lower-tier pools.
- **Fixture Secretary (admin)** sees the whole weekend at a glance, sends reminders, exports team sheets, manages fixtures and players.

Three teams structures are supported:
- **H1–H5** — competitive teams with tiered cascade selection
- **Zami 1, Zami 2** — Saturday recreational (independent pool, no cascade)
- **Zomi** — Sunday recreational (independent pool, no cascade)

H-team match days vary week-to-week (Sat or Sun) — the `matches.match_date` controls which weekend day each fixture lands on.

## Tech stack

| Layer        | Tool                | Free tier                                       |
| ------------ | ------------------- | ----------------------------------------------- |
| Frontend     | Next.js 14 (App Router) | unlimited                                   |
| Hosting      | Vercel              | 100 GB bandwidth/mo, custom domain              |
| Database     | Supabase Postgres   | 500 MB, 2 GB egress/mo                          |
| Auth         | Supabase Auth       | Magic-link email, 50k MAUs                      |
| Realtime     | Supabase Realtime   | 200 concurrent connections                      |
| Email (opt.) | Resend              | 3000 emails/mo, 100/day                         |
| Sheet sync   | GitHub Actions      | 2000 min/mo                                     |

For a club this size you will use < 1% of any of these limits.

## Folder layout

```
kampong/
  app/                     # Next.js App Router pages
    layout.tsx             # Root layout, role switcher
    page.tsx               # Landing → redirect by role
    login/page.tsx         # Magic-link sign-in
    player/page.tsx        # Set my weekend availability
    captain/page.tsx       # Pick my XI from the pool
    admin/page.tsx         # Fixture Secretary dashboard
  components/
    AvailabilityToggle.tsx
    PlayerCard.tsx
    CascadeStatus.tsx
    RoleSwitcher.tsx
  lib/
    supabase.ts            # Browser client
    supabase-server.ts     # Server client (cookies)
    cascade.ts             # Tiered selection logic
    types.ts               # TypeScript types from DB schema
  supabase/
    schema.sql             # Tables, indexes, RLS policies
    seed.sql               # Initial squad + fixtures
  package.json
  next.config.js
  tailwind.config.ts
  tsconfig.json
  .env.local.example
```

## Local setup (10 minutes)

```bash
# 1. Clone and install
git clone https://github.com/<you>/kampong-select.git
cd kampong-select
npm install

# 2. Create a free Supabase project at https://supabase.com
#    Project name: kampong-select
#    Region: West EU (Amsterdam) — closest to NL

# 3. Run the schema in Supabase SQL editor
#    Copy contents of supabase/schema.sql, paste, run.
#    Then copy supabase/seed.sql and run that too.

# 4. Copy .env.local.example to .env.local and fill in:
#    - NEXT_PUBLIC_SUPABASE_URL    (from Supabase project settings)
#    - NEXT_PUBLIC_SUPABASE_ANON_KEY  (same place)

# 5. Start dev server
npm run dev
# → http://localhost:3000
```

## Deploy to Vercel (5 minutes)

```bash
# 1. Push to GitHub
git push origin main

# 2. Go to https://vercel.com/new → Import your repo
# 3. Add the same env vars from .env.local
# 4. Deploy → live at https://kampong-select.vercel.app
```

Optionally point a custom domain (e.g. `select.kampongcricket.nl`) at it — Vercel handles HTTPS for free.

## Roles + first login

There is no signup form. The Fixture Secretary creates player rows with their email
addresses (paste from the existing Google Sheet). Players sign in via magic link —
they enter their email, receive a one-tap link, and they're in. Their role
(player/captain/admin) is set on their `players` row.

To bootstrap the first admin: insert a row directly in Supabase with `role='admin'`,
then sign in with that email.

## Importing the existing sheet

Run once after setup:

```bash
npm run import-sheet -- --url "https://docs.google.com/..."
```

This script (in `scripts/import-sheet.ts`) reads the public sheet, maps KNCB IDs,
and inserts/updates the `players` table. Captains and tier assignments need to be
set manually after import (one-time job in admin view).

## License

MIT — fork it, run it, modify it for your own club.
