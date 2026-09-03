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
  target_hours   numeric(8, 2)  not null default 480 check (target_hours   >= 0),
  monthly_budget numeric(12, 2) not null default 300 check (monthly_budget >= 0),
  created_at     timestamptz    not null default now(),
  updated_at     timestamptz    not null default now()
);

comment on table  public.profiles                is 'Per-user OJT + budget targets.';
comment on column public.profiles.target_hours   is 'Total OJT hours the user must complete.';
comment on column public.profiles.monthly_budget is 'Spending allowance for the current calendar month.';

-- ---------------------------------------------------------------------------
-- 2. daily_logs — one row per logged day (hours worked + money spent)
-- ---------------------------------------------------------------------------
create table if not exists public.daily_logs (
  id           uuid           primary key default gen_random_uuid(),
  user_id      uuid           not null references auth.users (id) on delete cascade,
  entry_date   date           not null default current_date,
  hours_worked numeric(6, 2)  not null default 0 check (hours_worked >= 0 and hours_worked <= 24),
  amount_spent numeric(12, 2) not null default 0 check (amount_spent >= 0),
  description  text,
  created_at   timestamptz    not null default now(),
  updated_at   timestamptz    not null default now()
);

-- Feed query is "my logs, newest first" — index it.
create index if not exists daily_logs_user_date_idx
  on public.daily_logs (user_id, entry_date desc, created_at desc);

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
