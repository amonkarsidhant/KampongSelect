# Deployment Guide

This checklist ensures KampongSelect is ready for production use by the club.

## Production Checklist

### 1. Supabase Preparation
- Run `supabase/schema.sql`.
- Apply any migrations in `supabase/migrations/`.
- Verify RLS policies are active and that no service role key is exposed in the browser.

### 2. Vercel Configuration
Add the following Environment Variables in your Vercel Project Settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Server-only for admin scripts and logging)
- `RESEND_API_KEY` (Required for automated email nudges)
- `RESEND_FROM_EMAIL` (E.g. "Kampong Cricket <no-reply@yourdomain.com>")
- `NEXT_PUBLIC_APP_URL` (E.g. "https://select.kampongcricket.nl")
- `NEXT_PUBLIC_ENABLE_GITHUB_LOGIN` (Set to `false` for production if you only want Magic Link)

### 3. Supabase Auth URL Config
1. Go to your Supabase Dashboard -> Authentication -> URL Configuration.
2. Set the **Site URL** to your production Vercel domain.
3. Add the exact callback URL `https://your-domain.vercel.app/auth/callback` to the **Redirect URLs**.

### 4. Admin Bootstrap
To set up the first Fixture Secretary account, run this locally using your production Supabase credentials:
```bash
NEXT_PUBLIC_SUPABASE_URL="prod_url" SUPABASE_SERVICE_ROLE_KEY="prod_service_key" npx tsx scripts/bootstrap-admin.ts secretaris@kampongcricket.nl
```

### 5. Custom Domain (Optional)
- Add your custom domain (e.g. `select.kampongcricket.nl`) in Vercel settings.
- Vercel automatically manages the SSL certificate.

### 6. Backup & Export Plan
- Supabase automatically performs daily backups on their Pro plan.
- Admins can manually export CSV team sheets from the Command Centre each Thursday night as a fallback.

### 7. Release Check
Before any new deployment, run the CI command locally or in GitHub Actions:
```bash
npm run release:check
```
This ensures formatting, linting, typechecking, and Next.js builds all pass without errors.
