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
  -- From before jobs existed, when an account had a single target. Each early
  -- account's first job was seeded from these once; targets live on jobs now.
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
-- 2. daily_logs: one row per logged shift (hours worked + money spent).
--    That is normally one row a day. A second row on the same date is allowed
--    on purpose, for a day worked in two blocks, so the date is not unique.
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
  -- Total of this row's expenses; save_log() below sets it in the same
  -- transaction that stores them, so the two cannot disagree.
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
-- Every policy filters on user_id, and deleting an account cascades by it.
create index if not exists expenses_user_idx on public.expenses (user_id);

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
--    Supabase hands anon and authenticated every privilege on a new table in
--    public by default, so a grant on its own narrows nothing. Revoking first
--    is what makes the list below the whole of what a signed-in user can do,
--    and leaves a signed-out visitor with no access to any table at all.
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.jobs, public.expenses, public.daily_logs
  from anon, authenticated;

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
create index if not exists milestones_user_idx on public.milestones (user_id);

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

-- Same rule as section 6: revoke the defaults, then grant only what is needed.
revoke all on public.milestones from anon, authenticated;
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

-- A public bucket: an avatar is shown on a screen the viewer is already
-- looking at, and a signed URL would expire part-way through a session.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = true,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Everything is confined to a folder named for the user's own id, so nobody
-- can list, overwrite or remove anyone else's picture.
--
-- The bucket being public is what serves the pictures: a public URL is read
-- without consulting any policy. A SELECT policy governs only what the Storage
-- API will list, and removing a file has to find it first, so each user needs
-- to see their own folder and nothing more. The first version of this policy
-- let anyone, signed in or not, list the whole bucket, which gave away every
-- user id as a folder name. It is dropped here so re-running the script
-- removes it from a database that still has it.
drop policy if exists "avatars_read_all" on storage.objects;

drop policy if exists "avatars_select_own" on storage.objects;
create policy "avatars_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

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

-- ---------------------------------------------------------------------------
-- 12. delete_own_account: lets a user close their own account.
--
--     auth.users can only be deleted with the service role, which must never
--     reach the browser. This function runs as its owner instead, and only
--     ever deletes the row for auth.uid(), so the caller can remove themselves
--     and nobody else. It takes no arguments on purpose: there is no id to
--     tamper with.
--
--     Every table above references auth.users with ON DELETE CASCADE, so this
--     one delete takes the profile, jobs, logs, expenses and milestones with it.
--     Avatar files are not rows in those tables; the app removes them through
--     the Storage API before calling this, since Supabase blocks deleting
--     storage objects with plain SQL.
-- ---------------------------------------------------------------------------
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in.';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant  execute on function public.delete_own_account() to authenticated;

-- ---------------------------------------------------------------------------
-- 13. save_log: save a day and its expenses in one transaction.
--
--     A logged day is a daily_logs row plus any number of expenses rows, and
--     amount_spent on the log is their total. Written from the API as separate
--     statements, a failure between them could leave a day whose total had no
--     items behind it, or an edit that had removed the old list without
--     storing the new one. A function body runs inside one transaction, so
--     here either all of it is saved or none of it is.
--
--     It runs as the caller (security invoker, the default), so Row Level
--     Security applies to every statement exactly as if the caller had run
--     them one by one. An id that is not the caller's matches no row, and the
--     function returns null.
--
--       p_log_id    null to create a log, or the id of the log to change
--       p_job_id    the job a new log belongs to; ignored when changing one
--       p_fields    the columns to set, as JSON; a key left out keeps its value
--       p_expenses  the day's whole expense list, or null to leave it alone
--
--     Only the seven columns named below can be set through p_fields. user_id
--     is always the caller, and amount_spent is always worked out here from
--     the rows actually stored, never taken from the request.
-- ---------------------------------------------------------------------------
create or replace function public.save_log(
  p_log_id   uuid,
  p_job_id   uuid,
  p_fields   jsonb,
  p_expenses jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := p_log_id;
begin
  if v_id is null then
    -- jsonb_populate_record() reads the JSON into a row of the table's own
    -- column types. A key that is absent comes back null, so the columns that
    -- cannot be null fall back to the same defaults the table declares.
    insert into public.daily_logs
      (user_id, job_id, entry_date, absent, hours_worked,
       time_in, time_out, break_minutes, description)
    select
      auth.uid(), p_job_id, coalesce(f.entry_date, current_date),
      coalesce(f.absent, false), coalesce(f.hours_worked, 0),
      f.time_in, f.time_out, coalesce(f.break_minutes, 0), f.description
    from jsonb_populate_record(null::public.daily_logs, p_fields) as f
    returning id into v_id;
  else
    -- Given the saved row as its base, the same function overlays only the
    -- keys the JSON actually has, which is what makes a partial update work.
    update public.daily_logs l
    set (entry_date, absent, hours_worked,
         time_in, time_out, break_minutes, description)
      = (select f.entry_date, f.absent, f.hours_worked,
                f.time_in, f.time_out, f.break_minutes, f.description
         from jsonb_populate_record(l, p_fields) as f)
    where l.id = v_id;

    if not found then
      return null;
    end if;
  end if;

  if p_expenses is not null then
    -- The list is small and edited as a whole, so it is replaced, not diffed.
    delete from public.expenses where log_id = v_id;

    insert into public.expenses (log_id, user_id, label, category, amount)
    select v_id, auth.uid(), e.label, coalesce(e.category, 'other'), coalesce(e.amount, 0)
    from jsonb_populate_recordset(null::public.expenses, p_expenses) as e;

    update public.daily_logs
    set amount_spent = (
      select coalesce(sum(e.amount), 0) from public.expenses e where e.log_id = v_id
    )
    where id = v_id;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.save_log(uuid, uuid, jsonb, jsonb) from public, anon;
grant  execute on function public.save_log(uuid, uuid, jsonb, jsonb) to authenticated;
