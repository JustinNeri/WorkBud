-- ============================================================================
-- WorkBud — OJT Hours Tracker + Daily Expense Manager
-- Supabase schema: tables, RLS policies, auto-profile trigger
-- Safe to re-run (idempotent).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. profiles — one row per auth user, holds their targets
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  email          text,
  full_name      text,
  first_name     text,
  last_name      text,
  middle_initial text           check (middle_initial is null or length(middle_initial) <= 4),
  age            integer        check (age is null or (age between 10 and 120)),
  occupation     text,
  currency       text           not null default 'PHP',
  onboarded_at   timestamptz,
  -- Kept as the seed for a user's first job; live targets live on jobs.
  target_hours   numeric(8, 2)  not null default 480 check (target_hours   >= 0),
  monthly_budget numeric(12, 2) not null default 300 check (monthly_budget >= 0),
  created_at     timestamptz    not null default now(),
  updated_at     timestamptz    not null default now()
);

comment on table  public.profiles              is 'Per-user identity and account-wide preferences.';
comment on column public.profiles.currency     is 'ISO code; one currency for the whole account.';
comment on column public.profiles.onboarded_at is 'Null until the user completes onboarding.';

-- ---------------------------------------------------------------------------
-- 1b. jobs — a user can track several placements at once, each with its own
--     hour target and monthly budget. Every daily_log belongs to one.
-- ---------------------------------------------------------------------------
create table if not exists public.jobs (
  id             uuid           primary key default gen_random_uuid(),
  user_id        uuid           not null references auth.users (id) on delete cascade,
  name           text           not null check (length(trim(name)) between 1 and 60),
  target_hours   numeric(8, 2)  not null default 480 check (target_hours   >= 0),
  monthly_budget numeric(12, 2) not null default 300 check (monthly_budget >= 0),
  -- 0 means no cap, the same way hourly_rate 0 means unpaid.
  daily_budget   numeric(12, 2) not null default 0   check (daily_budget   >= 0),
  deadline       date,
  hourly_rate    numeric(10, 2) not null default 0   check (hourly_rate    >= 0),
  sort_order     integer        not null default 0,
  created_at     timestamptz    not null default now(),
  updated_at     timestamptz    not null default now()
);

-- Added after the table shipped; `create table if not exists` above skips an
-- existing table entirely, so these have to be spelled out separately.
alter table public.jobs
  add column if not exists daily_budget numeric(12, 2) not null default 0
    check (daily_budget >= 0),
  add column if not exists deadline date,
  add column if not exists hourly_rate numeric(10, 2) not null default 0
    check (hourly_rate >= 0);

create index if not exists jobs_user_idx on public.jobs (user_id, sort_order, created_at);

-- ---------------------------------------------------------------------------
-- 2. daily_logs — one row per logged day (hours worked + money spent)
-- ---------------------------------------------------------------------------
create table if not exists public.daily_logs (
  id           uuid           primary key default gen_random_uuid(),
  user_id      uuid           not null references auth.users (id) on delete cascade,
  job_id       uuid           not null references public.jobs (id) on delete cascade,
  entry_date   date           not null default current_date,
  time_in      time,
  time_out     time,
  break_minutes integer       not null default 0 check (break_minutes >= 0 and break_minutes < 1440),
  hours_worked numeric(6, 2)  not null default 0 check (hours_worked >= 0 and hours_worked <= 24),
  -- Total of this day's expenses rows; written by the app alongside them.
  amount_spent numeric(12, 2) not null default 0 check (amount_spent >= 0),
  description  text,
  created_at   timestamptz    not null default now(),
  updated_at   timestamptz    not null default now()
);

-- Feed query is "my logs, newest first" — index it.
create index if not exists daily_logs_user_date_idx
  on public.daily_logs (user_id, entry_date desc, created_at desc);
create index if not exists daily_logs_job_date_idx
  on public.daily_logs (job_id, entry_date desc, created_at desc);

-- ---------------------------------------------------------------------------
-- 2b. expenses — the individual things bought on a given day.
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id         uuid           primary key default gen_random_uuid(),
  log_id     uuid           not null references public.daily_logs (id) on delete cascade,
  user_id    uuid           not null references auth.users (id) on delete cascade,
  label      text           check (label is null or length(label) <= 120),
  category   text           not null default 'other'
    check (category in ('transport', 'food', 'supplies', 'fees', 'other')),
  amount     numeric(12, 2) not null default 0 check (amount >= 0),
  created_at timestamptz    not null default now()
);

alter table public.expenses
  add column if not exists category text not null default 'other'
    check (category in ('transport', 'food', 'supplies', 'fees', 'other'));

create index if not exists expenses_log_idx on public.expenses (log_id, created_at);

-- ---------------------------------------------------------------------------
-- 3. updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

drop trigger if exists daily_logs_set_updated_at on public.daily_logs;
create trigger daily_logs_set_updated_at
  before update on public.daily_logs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Auto-create a profiles row on signup
--    security definer so it can write past RLS; empty search_path per
--    Supabase hardening guidance (all names fully qualified below).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill any users that registered before this trigger existed.
insert into public.profiles (id, email)
select u.id, u.email from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Row Level Security — a user touches only their own rows
-- ---------------------------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.jobs       enable row level security;
alter table public.expenses   enable row level security;
alter table public.daily_logs enable row level security;

-- profiles: no INSERT policy on purpose — rows come only from the trigger.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- jobs: full CRUD, scoped to the owner.
drop policy if exists "jobs_select_own" on public.jobs;
create policy "jobs_select_own" on public.jobs
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "jobs_insert_own" on public.jobs;
create policy "jobs_insert_own" on public.jobs
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "jobs_update_own" on public.jobs;
create policy "jobs_update_own" on public.jobs
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "jobs_delete_own" on public.jobs;
create policy "jobs_delete_own" on public.jobs
  for delete to authenticated using ((select auth.uid()) = user_id);

-- expenses: full CRUD, scoped to the owner.
drop policy if exists "expenses_select_own" on public.expenses;
create policy "expenses_select_own" on public.expenses
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "expenses_insert_own" on public.expenses;
create policy "expenses_insert_own" on public.expenses
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "expenses_update_own" on public.expenses;
create policy "expenses_update_own" on public.expenses
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "expenses_delete_own" on public.expenses;
create policy "expenses_delete_own" on public.expenses
  for delete to authenticated using ((select auth.uid()) = user_id);

-- daily_logs: full CRUD, scoped to the owner.
drop policy if exists "daily_logs_select_own" on public.daily_logs;
create policy "daily_logs_select_own" on public.daily_logs
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "daily_logs_insert_own" on public.daily_logs;
create policy "daily_logs_insert_own" on public.daily_logs
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "daily_logs_update_own" on public.daily_logs;
create policy "daily_logs_update_own" on public.daily_logs
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "daily_logs_delete_own" on public.daily_logs;
create policy "daily_logs_delete_own" on public.daily_logs
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- 6. Grants (RLS still gates every row)
-- ---------------------------------------------------------------------------
grant select, update                 on public.profiles   to authenticated;
grant select, insert, update, delete on public.jobs       to authenticated;
grant select, insert, update, delete on public.expenses   to authenticated;
grant select, insert, update, delete on public.daily_logs to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Lock down the trigger functions
--    Postgres grants EXECUTE to PUBLIC by default, which puts both of these on
--    PostgREST as /rest/v1/rpc/... endpoints. Triggers fire as the table owner
--    and don't consult these grants, so revoking costs nothing and takes the
--    SECURITY DEFINER handle_new_user() off the public API.
-- ---------------------------------------------------------------------------
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at()  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. email_registered — does an account exist for this address?
--    auth.users is not reachable through PostgREST, so the reset screen has no
--    way to tell a typo'd address from a real one: resetPasswordForEmail()
--    reports success either way (Supabase hides that on purpose, so nobody can
--    enumerate accounts) and the user is left waiting on a code that was never
--    sent. This trades that protection away for a straight answer, which is
--    the right call for an app this size.
--
--    Returns a bare boolean and nothing else — no id, no name — so a scraper
--    learns only what a signup form would already tell them.
-- ---------------------------------------------------------------------------
create or replace function public.email_registered(p_email text)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    where lower(u.email) = lower(trim(p_email))
      and u.deleted_at is null
      -- An abandoned signup leaves a row here the moment "Create account" is
      -- pressed, long before the code is entered. That is not an account: no
      -- one can sign in with it, and Supabase won't mail a recovery code to an
      -- unconfirmed address. Counting it as registered sent people to a code
      -- step to wait for mail that was never going to arrive.
      and u.email_confirmed_at is not null
  );
$$;

revoke execute on function public.email_registered(text) from public;
grant  execute on function public.email_registered(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9. milestones — user-defined checkpoints on a job (orientation, midterm
--    evaluation, final report). Hour badges are derived in the app, not stored.
-- ---------------------------------------------------------------------------
create table if not exists public.milestones (
  id           uuid          primary key default gen_random_uuid(),
  user_id      uuid          not null references auth.users (id) on delete cascade,
  job_id       uuid          not null references public.jobs (id) on delete cascade,
  title        text          not null check (length(trim(title)) between 1 and 80),
  due_date     date,
  target_hours numeric(8, 2) check (target_hours is null or target_hours > 0),
  done_at      timestamptz,
  created_at   timestamptz   not null default now(),
  updated_at   timestamptz   not null default now()
);

comment on table  public.milestones              is 'User-defined checkpoints for a job, e.g. midterm evaluation.';
comment on column public.milestones.target_hours is 'Optional hours goal; null means a plain dated checkpoint.';
comment on column public.milestones.done_at      is 'Null until the user marks it done.';

create index if not exists milestones_job_idx
  on public.milestones (job_id, due_date nulls last, created_at);

drop trigger if exists milestones_set_updated_at on public.milestones;
create trigger milestones_set_updated_at
  before update on public.milestones
  for each row execute function public.set_updated_at();

alter table public.milestones enable row level security;

drop policy if exists "milestones_select_own" on public.milestones;
create policy "milestones_select_own" on public.milestones
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "milestones_insert_own" on public.milestones;
create policy "milestones_insert_own" on public.milestones
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "milestones_update_own" on public.milestones;
create policy "milestones_update_own" on public.milestones
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "milestones_delete_own" on public.milestones;
create policy "milestones_delete_own" on public.milestones
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.milestones to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Planned pace, start date, and days off
--
--     Added after launch. `create table if not exists` above skips an existing
--     table outright, so new columns have to be spelled out separately — the
--     same pattern used for daily_budget and hourly_rate.
--
--     daily_hours is the shift the user expects to work on a normal day. It is
--     what the "expected finish" projection divides the remaining hours by, so
--     it answers a question the deadline alone cannot: not "how many hours a
--     day would I need", but "when do I actually land at the pace I keep".
--
--     absent marks a day the user did not go in. It is a logged day with zero
--     hours rather than a missing row, because a gap in the record is
--     ambiguous — it could equally be a day nobody got round to filling in.
--     Recording it makes the absence deliberate, keeps it in the DTR where a
--     coordinator expects to see it accounted for, and pushes the projected
--     finish out by exactly the day that was lost.
-- ---------------------------------------------------------------------------
alter table public.jobs
  add column if not exists daily_hours numeric(5, 2) not null default 8
    check (daily_hours >= 0 and daily_hours <= 24),
  add column if not exists start_date date;

comment on column public.jobs.daily_hours is
  'Hours the user plans to work on a normal day; drives the expected finish date.';
comment on column public.jobs.start_date is
  'First day of the placement. Optional; informational alongside the deadline.';

alter table public.daily_logs
  add column if not exists absent boolean not null default false;

comment on column public.daily_logs.absent is
  'True for a day the user did not work. Hours stay 0; the note carries the reason.';

-- ---------------------------------------------------------------------------
-- 11. Profile pictures
--
--     The profile row stores the object's PATH, not a URL. A URL bakes in the
--     project host and would rot the day the project moves; the app derives
--     the public URL from the path at render time.
--
--     Each upload writes a new timestamped filename rather than overwriting a
--     stable one, so a changed picture can never be served stale from a cache
--     that already holds the old bytes under that name.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists avatar_path text;

comment on column public.profiles.avatar_path is
  'Object path inside the avatars bucket, e.g. <user id>/1695100000.jpg. Null when unset.';

-- Public read: an avatar is shown on a screen the viewer is already looking
-- at, and a signed URL would expire part-way through a session.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = true,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Writes are confined to a folder named for the user's own id, so nobody can
-- overwrite anyone else's picture. The bucket being public governs reads only
-- — these three policies are what stop it being a free-for-all to write to.
drop policy if exists "avatars_read_all" on storage.objects;
create policy "avatars_read_all" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
