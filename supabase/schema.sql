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
  sort_order     integer        not null default 0,
  created_at     timestamptz    not null default now(),
  updated_at     timestamptz    not null default now()
);

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
  amount     numeric(12, 2) not null default 0 check (amount >= 0),
  created_at timestamptz    not null default now()
);

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
