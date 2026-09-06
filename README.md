# WorkBud

An OJT hours and expense tracker for the phone in your pocket. Log the day you
just worked — time in, time out, break, what you spent getting there — and
WorkBud keeps the running total your school actually asks for, plus an honest
picture of what the placement is costing you.

**Live:** [workbud-nine.vercel.app](https://workbud-nine.vercel.app)

Built as a mobile-first PWA: install it to the home screen and it opens like a
native app, offline shell included.

---

## What it does

**Hours**

- One entry per day: date, time in, time out, unpaid break. Hours are computed
  for you and stay editable for days that don't fit a shift.
- A shift counts up while you're in it — a 7am–5pm day reads `2h so far` at
  9am and settles at 9h once 5pm passes.
- Overnight shifts work: a 10pm → 6am entry is 8h, not −16.
- **Backfill any past day.** Most people find an app like this partway through
  a placement, so the date is a real field with Today/Yesterday shortcuts and a
  picker behind them. Nothing is locked to today.
- A progress ring against your target hours, plus this week, average per day,
  and days worked.

**Deadline and pace**

- Set a deadline on a job and the dashboard shows the date, the countdown, and
  the hours a day you need to finish — and warns you when that figure has
  drifted above the pace you've actually been keeping.
- Roles with no end date (employed, freelance, self-employed) get the month so
  far instead: hours logged, days logged, where the month is heading, and
  earnings if an hourly rate is set.

**Money**

- Each day holds a list of what you bought — label, category (transport, food,
  supplies, fees, other) and amount — not a single lump figure.
- A monthly budget meter, a spend-by-category breakdown, and the number the
  hero card is really about: what the placement has cost you out of pocket, or
  your net if the job pays.

**Several jobs at once**

Tabs across the top switch between placements. Each carries its own target
hours, deadline, monthly budget and hourly rate, and its own logs.

**Export**

Any date range as a printable DTR (daily time record) or a CSV file.

**Accounts**

Email and password, with signup verified by an emailed code rather than a
confirmation link — no leaving the app and coming back. Password reset works
the same way, and a strength meter enforces more than the server's six-character
floor. Ten currencies; pick yours at onboarding.

---

## Tech

| | |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| Backend | Supabase (Postgres, Auth, Row Level Security) |
| Icons | lucide-react |
| PWA | vite-plugin-pwa (Workbox) |
| Lint | oxlint |
| Hosting | Vercel |

No state library and no router: the app is one authenticated screen with
sheets over it, so React state and a session hook cover it.

---

## Getting started

**Requires** Node 20.19+ (or 22.12+) and a free Supabase project.

```bash
git clone https://github.com/JustinNeri/WorkBud.git
cd WorkBud
npm install
```

**1. Environment**

```bash
cp .env.example .env.local
```

Fill in both values from your Supabase dashboard under **Settings → API**:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon key>
```

The anon key is meant to be public — Row Level Security is what protects the
data. Without these the app shows a setup card instead of a blank screen.

**2. Database**

Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor. It
creates the four tables, their RLS policies, and the trigger that gives every
new auth user a profile row. It's idempotent, so re-running it is safe.

> **Note:** the file is currently behind the live database by three columns the
> app uses. Until it's updated, run this after it:
>
> ```sql
> alter table public.jobs
>   add column if not exists deadline date,
>   add column if not exists hourly_rate numeric(10,2) not null default 0
>     check (hourly_rate >= 0);
>
> alter table public.expenses
>   add column if not exists category text not null default 'other'
>     check (category in ('transport','food','supplies','fees','other'));
> ```

**3. Auth email templates**

Signup verification reads a code, not a link. In **Authentication → Email
Templates → Confirm signup**, make sure the template emits `{{ .Token }}`.

**4. Run it**

```bash
npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the built output locally |
| `npm run lint` | oxlint |

---

## Data model

Four tables, all with RLS on, all scoped to `auth.uid()` — a user can only ever
read or write their own rows.

| Table | Holds |
|---|---|
| `profiles` | One row per auth user: name, age, occupation, currency, onboarding state. Created automatically by a trigger on signup. |
| `jobs` | A placement or job: name, target hours, deadline, monthly budget, hourly rate. A user can have several. |
| `daily_logs` | One logged day: date, time in/out, break, hours worked, day total spent, note. Belongs to a job. |
| `expenses` | The individual things bought on a day: label, category, amount. Belongs to a log. |

`daily_logs.hours_worked` stores the day's *planned* total; what the dashboard
counts is derived at render time, which is how a shift can tick upward without
anything being written back. A day's expense rows are the source of truth for
spending, and `amount_spent` on the log is their sum, written by the app.

---

## Project structure

```
src/
  App.jsx              session gate: config notice → auth → dashboard
  components/          screens, cards, and the bottom-sheet forms
  hooks/
    useSession.js      the persisted Supabase session
    useWorkbud.js      profile + jobs + logs + everything derived per job
  lib/
    supabase.js        client, or null when unconfigured
    format.js          money, hours, dates, shift maths
    export.js          DTR and CSV builders
    password.js        strength rules shared by every set-password screen
supabase/schema.sql    tables, policies, triggers
```

`useWorkbud` holds all of a user's logs in memory and filters per job — the
volume is small for a personal tracker, and it makes switching tabs instant.

---

## Deploying

Vercel picks up [`vercel.json`](vercel.json) as-is: SPA rewrite to
`index.html`, content-hashed assets cached for a year, and the service worker,
its registration script and the manifest set to revalidate every time — a
cached service worker must never be able to pin someone to a stale build.

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the project's
environment variables, then deploy. Supabase requests bypass the service worker
entirely (network-only), so no one is ever served stale auth or stale data.
