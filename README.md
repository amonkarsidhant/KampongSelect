# KampongSelect v1.0.0

KampongSelect is a premium Club OS built for Kampong Cricket Club. It handles weekend availability collection, tiered cascade XI selection, squad reliability tracking, and real-time WhatsApp briefings.

## Roles

- **Players:** Set Saturday/Sunday availability via a fast mobile-friendly Season Planner.
- **Captains:** Pick their XI from the live pool using a scorecard-style interface with real-time balance metrics. H1 picks first; taken players are marked for H2, etc. (The Cascade Engine).
- **Admin (Fixture Secretary):** Command Centre with War Room timeline to monitor cascade progress, manually override availability, resolve double-bookings, and nudge non-responders via automated emails.

## Technical Foundation

Built on a high-performance stack:

- **Frontend:** Next.js 14 (App Router), Tailwind CSS, Framer Motion
- **Backend:** Supabase (PostgreSQL, Auth, Realtime subscriptions)
- **Email:** Resend
- **Hosting:** Vercel

## Setup Instructions

### 1. Database Setup

1. Create a [Supabase](https://supabase.com) project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Run migrations in `supabase/migrations/` sequentially.
4. Run `supabase/seed.sql` to populate initial teams.

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and add:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Notifications (Optional)
RESEND_API_KEY=your-resend-key
RESEND_FROM_EMAIL=KampongSelect <onboarding@resend.dev>
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Social Login (Optional)
NEXT_PUBLIC_ENABLE_GITHUB_LOGIN=true
```

### 3. Admin Bootstrap

To grant the Fixture Secretary access:

```bash
npx tsx scripts/bootstrap-admin.ts <admin-email>
```

### 4. Run Locally

```bash
npm install
npm run dev
```

## Documentation

- `OPERATIONS.md`: Weekly flow and admin guide.
- `DEPLOY.md`: Production deployment checklist.
- `RELEASE_NOTES.md`: v1.0.0 features and backlog.
