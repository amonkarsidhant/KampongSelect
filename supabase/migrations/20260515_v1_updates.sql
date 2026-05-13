
-- Add is_excused to availability
alter table availability add column if not exists is_excused boolean not null default false;

-- Add reliability and payment tracking to players
alter table players add column if not exists membership_paid boolean not null default false;
alter table players add column if not exists reliability_score integer default 100;
alter table players add column if not exists stats_meta jsonb default '{}'::jsonb;

-- Comment for the PM
comment on column players.membership_paid is 'Manual flag set by treasurer';
comment on column players.reliability_score is 'System calculated 0-100 based on dropouts and response speed';
