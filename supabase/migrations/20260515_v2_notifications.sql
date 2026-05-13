create table notification_log (
  id             uuid primary key default gen_random_uuid(),
  player_id      uuid references players(id) on delete set null,
  email          text not null,
  type           text not null,
  status         text not null check (status in ('success', 'failed', 'mocked')),
  error_message  text,
  created_at     timestamptz not null default now()
);

-- Admins can read all notification logs
alter table notification_log enable row level security;

create policy nlog_admin_read on notification_log for select
  using ((select user_role from players where auth_user_id = auth.uid() limit 1) = 'admin');

create policy nlog_service_role_write on notification_log for all
  using (true)
  with check (true);
