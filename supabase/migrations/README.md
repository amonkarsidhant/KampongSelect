# Supabase Database Migrations

This folder contains database migrations that should be applied to existing Supabase projects as the application evolves.

## For Fresh Installs

If you are deploying a completely new instance of KampongSelect, you only need to run:

1. `supabase/schema.sql` (Creates all tables, views, and RLS policies)
2. `supabase/seed.sql` (Inserts initial teams and admin user)

## For Existing Projects

If you are upgrading an existing KampongSelect deployment to the v1.0.0 schema, you must run the migrations in this folder in order:

1. Copy the contents of the `.sql` migration files.
2. Go to your [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql/new).
3. Paste and run the migration scripts to update your existing tables without losing data.

_Note: The `is_excused` field and reliability fields (`membership_paid`, `reliability_score`, `stats_meta`) are now part of the base `schema.sql` for all new installs._
