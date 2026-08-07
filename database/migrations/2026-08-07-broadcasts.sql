-- Newsletter sending: per-recipient delivery records, a public subscribe path,
-- and the columns the dispatcher needs. Run after database/members.sql.
-- Re-running is safe.

begin;

-- One row per recipient per broadcast. This is what makes sending resumable:
-- a run sends to subscribers that have no row yet, inserts theirs, and stops
-- when it runs out of time. The next cron tick picks up where it left off, and
-- a retry can never double-send because the unique constraint rejects it.
create table if not exists public.broadcast_deliveries (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.broadcasts(id) on delete cascade,
  subscriber_id uuid not null references public.subscribers(id) on delete cascade,
  email text not null,
  status text not null default 'sent' check (status in ('sent','failed')),
  resend_id text,
  error text,
  created_at timestamptz not null default now(),
  unique (broadcast_id, subscriber_id)
);

create index if not exists broadcast_deliveries_broadcast_idx
  on public.broadcast_deliveries (broadcast_id, status);

alter table public.broadcasts add column if not exists last_error text;
alter table public.broadcasts add column if not exists failed_count integer not null default 0;

-- 'sending' already exists in the status check; a broadcast that runs out of
-- function time stays there between cron ticks.
create index if not exists broadcasts_due_idx
  on public.broadcasts (status, scheduled_for)
  where status in ('scheduled', 'sending');

alter table public.subscribers add column if not exists confirmed_at timestamptz;
alter table public.subscribers add column if not exists unsubscribed_at timestamptz;

create index if not exists subscribers_active_idx
  on public.subscribers (unsubscribed, confirmed);
create index if not exists subscribers_unsub_token_idx
  on public.subscribers (unsub_token);

alter table public.broadcast_deliveries enable row level security;

do $$
declare r record;
begin
  for r in select policyname from pg_policies
    where schemaname = 'public' and tablename = 'broadcast_deliveries'
  loop
    execute format('drop policy if exists %I on public.broadcast_deliveries', r.policyname);
  end loop;
end $$;

create policy "admins read deliveries" on public.broadcast_deliveries
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

grant all on public.broadcast_deliveries to authenticated;

commit;
