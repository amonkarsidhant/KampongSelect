-- ============================================================================
-- KampongSelect — database schema
-- Run this in the Supabase SQL editor after creating your project.
-- ============================================================================

-- ─── ENUMS ──────────────────────────────────────────────────────────────────
create type user_role     as enum ('player', 'captain', 'admin');
create type player_role   as enum ('Batter', 'Bowler', 'All-rounder', 'Wicketkeeper');
create type team_kind     as enum ('competitive', 'recreational');
create type weekend_day   as enum ('saturday', 'sunday');
create type avail_status  as enum ('yes', 'no');

-- ─── TABLES ─────────────────────────────────────────────────────────────────

-- Teams: H1, H2, H3, H4, H5, Zami 1, Zami 2, Zomi (declared first so players FK works)
create table teams (
  code           text primary key,                          -- "H1", "Zami 1", etc.
  name           text not null,
  kind           team_kind not null,
  default_day    weekend_day,                                -- Zami=sat, Zomi=sun, H teams=null (varies)
  tier_order     integer,                                   -- 1..5 for H teams; null for rec
  active         boolean not null default true
);

-- Players: one row per club member. Linked to auth.users via email match on first sign-in.
create table players (
  id              uuid primary key default gen_random_uuid(),
  auth_user_id    uuid references auth.users(id) on delete set null,
  email           text unique not null,
  full_name       text not null,
  kncb_id         integer unique,
  role            player_role not null default 'Batter',
  tier            integer check (tier between 1 and 5),     -- preferred team tier (null = rec only)
  user_role       user_role not null default 'player',
  captains_team   text references teams(code),              -- if user_role = 'captain'
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);
create index players_auth_idx on players(auth_user_id);
create index players_email_idx on players(email);

-- Matches: one row per fixture
create table matches (
  id             uuid primary key default gen_random_uuid(),
  team_code      text not null references teams(code),
  match_date     date not null,
  weekend_day    weekend_day not null,                      -- denormalised from match_date for filter speed
  start_time     time,
  opposition     text not null,
  venue          text,
  is_home        boolean not null default false,
  notes          text,
  created_at     timestamptz not null default now()
);
create index matches_date_idx on matches(match_date);
create index matches_team_idx on matches(team_code);
create unique index matches_team_date_idx on matches(team_code, match_date);

-- Availability: one row per (player, weekend day). NOT per match — players say
-- "yes I can play that whole day" and captains pick from those who said yes.
create table availability (
  id             uuid primary key default gen_random_uuid(),
  player_id      uuid not null references players(id) on delete cascade,
  match_date     date not null,                             -- the Sat or Sun in question
  status         avail_status not null,
  note           text,
  updated_at     timestamptz not null default now(),
  unique (player_id, match_date)
);
create index avail_date_idx on availability(match_date);
create index avail_player_idx on availability(player_id);

-- Selections: a captain picks 11 players for a specific match
create table selections (
  id             uuid primary key default gen_random_uuid(),
  match_id       uuid not null references matches(id) on delete cascade,
  player_id      uuid not null references players(id) on delete cascade,
  selected_by    uuid references players(id),
  selected_at    timestamptz not null default now(),
  is_captain     boolean not null default false,
  is_keeper      boolean not null default false,
  unique (match_id, player_id)
);
create index sel_match_idx on selections(match_id);
create index sel_player_idx on selections(player_id);

-- Match status: tracks where each match is in the cascade
create table match_status (
  match_id       uuid primary key references matches(id) on delete cascade,
  state          text not null default 'open' check (state in ('open', 'selecting', 'confirmed')),
  confirmed_at   timestamptz,
  confirmed_by   uuid references players(id)
);

-- ─── HELPER VIEWS ───────────────────────────────────────────────────────────

-- Available pool for a given match, EXCLUDING players already picked by
-- a higher-tier H team on the same date. This is the cascade in one query.
create or replace view v_match_pool as
select
  m.id                      as match_id,
  m.team_code,
  m.match_date,
  m.weekend_day,
  p.id                      as player_id,
  p.full_name,
  p.kncb_id,
  p.role                    as player_role,
  p.tier,
  exists (
    select 1
    from selections s
    join matches m2 on m2.id = s.match_id
    join teams t2  on t2.code = m2.team_code
    join teams tcurrent on tcurrent.code = m.team_code
    where s.player_id = p.id
      and m2.match_date = m.match_date
      and t2.tier_order is not null
      and tcurrent.tier_order is not null
      and t2.tier_order < tcurrent.tier_order
  ) as taken_by_higher_tier
from matches m
join availability a on a.match_date = m.match_date and a.status = 'yes'
join players p on p.id = a.player_id and p.active;

-- ─── RLS POLICIES ───────────────────────────────────────────────────────────
-- Every table is locked down by default; we open specific actions per role.

alter table players       enable row level security;
alter table teams         enable row level security;
alter table matches       enable row level security;
alter table availability  enable row level security;
alter table selections    enable row level security;
alter table match_status  enable row level security;

-- Helper: get current player's row
create or replace function current_player()
returns players
language sql stable
as $$
  select * from players where auth_user_id = auth.uid() limit 1;
$$;

-- PLAYERS table: anyone signed in can see active players (for picking team-mates).
-- Only admins can insert/update/delete.
create policy players_select on players for select
  using (auth.role() = 'authenticated');
create policy players_admin_write on players for all
  using ((select user_role from current_player()) = 'admin')
  with check ((select user_role from current_player()) = 'admin');

-- Players can update their OWN row but cannot change their role/tier
create policy players_self_update on players for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- TEAMS / MATCHES / MATCH_STATUS: all signed-in users read; admins write.
create policy teams_read    on teams        for select using (auth.role() = 'authenticated');
create policy teams_write   on teams        for all
  using ((select user_role from current_player()) = 'admin');
create policy matches_read  on matches      for select using (auth.role() = 'authenticated');
create policy matches_write on matches      for all
  using ((select user_role from current_player()) = 'admin');
create policy ms_read       on match_status for select using (auth.role() = 'authenticated');
create policy ms_write      on match_status for all
  using ((select user_role from current_player()) in ('admin', 'captain'));

-- AVAILABILITY: a player can read all (so captains can see the pool) but only
-- write rows for themselves. Admins can write anyone's row.
create policy avail_read on availability for select using (auth.role() = 'authenticated');
create policy avail_self_write on availability for all
  using (player_id = (select id from current_player()))
  with check (player_id = (select id from current_player()));
create policy avail_admin_write on availability for all
  using ((select user_role from current_player()) = 'admin');

-- SELECTIONS: anyone signed-in can read. Captains can write for their own team
-- (enforced at the app layer too — RLS is the safety net). Admins can always write.
create policy sel_read on selections for select using (auth.role() = 'authenticated');
create policy sel_captain_write on selections for all
  using (
    exists (
      select 1 from matches m
      join players p on p.captains_team = m.team_code
      where m.id = selections.match_id
        and p.auth_user_id = auth.uid()
    )
  );
create policy sel_admin_write on selections for all
  using ((select user_role from current_player()) = 'admin');

-- ─── REALTIME ───────────────────────────────────────────────────────────────
-- Push availability + selection changes to all connected clients.
alter publication supabase_realtime add table availability;
alter publication supabase_realtime add table selections;
alter publication supabase_realtime add table match_status;
