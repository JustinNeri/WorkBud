[![Made with AI](https://img.shields.io/badge/Made_with-AI_assistance-blue)](AI-USAGE.md)

# WorkBud

OJT hours and expense tracker.

**Live:** [workbud-ph.vercel.app](https://workbud-ph.vercel.app/)

> Built with help from Claude (Anthropic), with ChatGPT and Gemini used on a couple of earlier bug fixes. I write the code first, then use AI to review, fix and optimise it; Claude also gave me the first draft of the Supabase backend and helped write the documentation. Full details in [AI-USAGE.md](AI-USAGE.md).

---

## 1. Overview

WorkBud is a mobile-first web app (an installable PWA) for tracking on-the-job-training hours and the money a placement costs you. You log one entry per day (time in, time out, unpaid break, and what you spent getting there), and the app keeps three things for you:

- the running hour total your school asks for;
- an itemised picture of your spending;
- an export you can hand to a coordinator.

It solves a problem OJT students actually have. Hours are usually tracked on paper or in a notes app, and the out-of-pocket cost of commuting and meals isn't tracked at all until the money is gone. It's built for students on placement, but it works for anyone logging hours against a target: freelancers and hourly workers get a month-to-date view instead of a deadline countdown.

### Tech stack

| Layer | Used |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| Routing | react-router 8 |
| Backend | Supabase (Postgres, Auth, Storage, Row Level Security) |
| Icons | lucide-react |
| PWA | vite-plugin-pwa (Workbox) |
| Lint | oxlint |
| Hosting | Vercel |

There is no separate server to run. The React app talks to Supabase directly, and Row Level Security is what keeps one user's rows out of another user's hands.

---

## 2. Setup and installation

### 2.1 What to install first

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 20.19+ or 22.12+ | Vite 8 refuses to start on older versions. Check with `node -v`. |
| npm | 10 or newer | Ships with Node. |
| Git | any recent version | Used to clone the repository. |
| Supabase account | free tier is enough | [supabase.com](https://supabase.com). This is the database, auth and file storage. Nothing is installed locally for it. |

### 2.2 Get the code

```bash
git clone https://github.com/JustinNeri/WorkBud.git
cd WorkBud
```

### 2.3 Install dependencies

```bash
npm install
```

### 2.4 Environment and configuration

First, create a Supabase project: go to supabase.com and choose **New project**. Then copy the example environment file:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Both values come from your Supabase dashboard under **Settings → API**. Fill them into `.env.local`:

| Variable | Required | Example value | Where it comes from |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Yes | `https://abcdefghijklmnop.supabase.co` | Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | `sb_publishable_xxxxxxxxxxxxxxxxxx` | Settings → API → anon / publishable key |

The anon key is designed to be public. It is Row Level Security, not secrecy, that protects the data. Even so, `.env.local` is listed in `.gitignore` and must never be committed. The values above are placeholders, not real credentials.

If these are missing or still hold the placeholder text, the app deliberately shows a "Supabase isn't configured" card instead of a blank screen, so a misconfigured setup is obvious rather than silent.

### 2.5 Set up the database

Open your Supabase project, go to the **SQL Editor**, paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.

That one script creates everything the app needs:

- the five tables: `profiles`, `jobs`, `daily_logs`, `expenses`, `milestones`;
- Row Level Security policies on every table, all scoped to `auth.uid()`;
- a trigger that creates a `profiles` row automatically whenever a user signs up;
- `updated_at` triggers on every table that has that column;
- an `email_registered()` function, so signup can tell the user an email is already registered;
- a public `avatars` storage bucket for profile pictures (2 MB limit, JPEG, PNG and WebP only), with per-user upload policies.

The script is idempotent, so re-running it is safe. Re-running it is also how an existing database picks up columns added in a later week.

### 2.6 Configure the signup email template

WorkBud verifies signups with a 6-digit emailed code, not a confirmation link. In Supabase, go to **Authentication → Email Templates → Confirm signup** and make sure the template body contains:

```
{{ .Token }}
```

If it only contains `{{ .ConfirmationURL }}`, the email arrives with no code in it and signup can't be completed. Do the same for the **Reset password** template.

### 2.7 Seed data (optional)

There is no seed script, on purpose. Every row belongs to a user and is locked behind Row Level Security, so there is no shared data to seed. A new account starts empty, and onboarding walks you through creating your first job.

If you want sample data to look at, sign up first. Then run this in the SQL Editor, replacing the email with the one you signed up with:

```sql
with me as (
  select id from auth.users where email = 'you@example.com'
),
new_job as (
  insert into public.jobs (user_id, name, target_hours, monthly_budget,
                           daily_budget, hourly_rate, deadline)
  select id, 'Sample OJT', 480, 3000, 250, 0, current_date + 60 from me
  returning id, user_id
),
new_log as (
  insert into public.daily_logs (user_id, job_id, entry_date, time_in, time_out,
                                 break_minutes, hours_worked, amount_spent, description)
  select user_id, id, current_date - 1, '08:00', '17:00', 60, 8, 180,
         'Sample logged day'
  from new_job
  returning id, user_id
)
insert into public.expenses (log_id, user_id, label, category, amount)
select id, user_id, 'Jeepney fare', 'transport', 180 from new_log;
```

---

## 3. How to run it

```bash
npm run dev
```

Vite prints the local address. Open:

```
http://localhost:5173
```

### What you should see when it works

- **If `.env.local` is filled in correctly:** the sign-in screen at `http://localhost:5173/login`. It has the WorkBud logo, email and password fields, a "Remember me" checkbox, and links to create an account or reset a password.
- **After signing up and entering the emailed 6-digit code:** the onboarding flow (name, age, occupation, currency, first job).
- **After onboarding, or on any later sign-in:** the dashboard at `/dashboard`, showing the hours progress ring.
- **If `.env.local` is missing or unfilled:** a card reading "Supabase isn't configured". That is the expected screen for a bad setup, not a crash.

### All available scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the Vite dev server at localhost:5173 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves the built output locally |
| `npm run lint` | Runs oxlint |

### If it does not start

Run `node -v` first; anything below 20.19 is the most common cause. If the page loads but signing in fails, check that the two variables in `.env.local` have no quotes or trailing spaces, then restart the dev server. Vite only reads environment files at startup.

### Deploying

Vercel reads [`vercel.json`](vercel.json) as it is:

- every path is rewritten to `index.html`, so the app's routes work on refresh;
- hashed assets are cached for a year;
- the service worker is set to revalidate every time, so a cached worker can never pin a user to a stale build.

Add the same two environment variables in the Vercel project settings, then deploy.

---

## 4. Features and usage

### The primary flow

1. **Sign up** with an email and password. A strength meter enforces more than Supabase's six-character minimum. A 6-digit code arrives by email and you enter it in the app, so you never leave for a browser tab.
2. **Onboard.** Enter your name, age, occupation and currency (10 supported, defaults to PHP). Then create your first job: its name, target hours, deadline and monthly budget, plus an optional hourly rate and daily budget.
3. **Log a day.** Tap the add button on the dashboard and enter:
   - the date (Today and Yesterday shortcuts, or a picker for any past day);
   - time in, time out and unpaid break minutes;
   - a note about the work done;
   - any expenses, as separate items with a label, category and amount.

   If you didn't go in that day, tick "I didn't work this day" instead of leaving the day blank.
4. **Watch the dashboard update.** The progress ring, hours this week, average per day, days worked, deadline countdown, required daily pace, budget meters and activity feed all recalculate immediately.
5. **Export** when your coordinator asks for it. Pick a date range, choose Time log or Full record, then print it or download the CSV.

### Main features

**Hours.** One entry per day. Hours are worked out from your times, and you can still edit them for days that don't fit a normal shift. A shift in progress counts up live: a 7am to 5pm day reads "2h so far" at 9am and settles at 9h once 5pm passes. Overnight shifts work too, so 10pm to 6am is 8 hours, not minus 16. You can fill in any past date, because most people find an app like this partway through a placement.

**Deadline and pace.** Set a deadline on a job and the dashboard shows the date, the countdown, and the hours per day you need to finish. It warns you when that number rises above the pace you've actually been keeping. Jobs with no end date (employed, freelance, self-employed) get a month-to-date view instead: hours logged, days logged, where the month is heading, and earnings if an hourly rate is set.

**Planned pace, start dates and days off.** Each job also has an hours-per-day figure (what you expect to work on a normal day) and an optional start date. These drive the expected finish date, which answers a different question from the required pace. Not "how many hours a day would I need?", but "when will I actually finish at the pace I'm keeping?"

Days you didn't go in are recorded with an "I didn't work this day" tick rather than left blank. The day stays on record with zero hours, shows in your DTR where a coordinator expects it accounted for, and pushes the expected finish back by exactly the day that was lost. A blank day is ambiguous, because it could just as easily be a day nobody got round to filling in.

**Activity feed.** Your recent logged days. It shows the five most recent by default, with a "show all" option, plus month chips built only from months that actually have entries. Days that went over the daily budget are flagged here.

**Money.** Each day holds a list of what you bought, each with a label, a category (transport, food, supplies, fees, other) and an amount, rather than one lump sum. An optional daily budget per job is checked live while you type an expense, and days that went over are flagged in the activity feed.

When you do go over, a catch-up figure spreads the overspend across the days left in the month. So "410 pesos over" becomes "spend 483 a day instead of 500 for the 24 days left and you finish level". There is also a monthly budget meter, a spend-by-category breakdown, and a headline figure for what the placement has cost you out of pocket, or your net if the job pays.

**Several jobs at once.** Tabs across the top switch between placements. Each job has its own target hours, deadline, monthly budget, daily budget, hourly rate and logs.

**Milestones.** Your own checkpoints per job (orientation, midterm evaluation, narrative report), each with an optional due date and hours goal. Tick them off as you go; overdue and due-this-week ones are flagged. On top of those, automatic hour badges at 25, 50, 75 and 100 percent of your target show the day each was reached, or a projected date at your current pace.

**Export.** Any date range, printable or as a CSV, in two versions:

- **Time log:** date, time in, time out, hours and the day's note, with no break or expense columns. This is the one to hand your coordinator.
- **Full record:** everything, including break minutes and the day's expenses.

**Accounts.** Email and password. Signup and password reset both use emailed codes rather than links. A "Remember me" checkbox decides where your login is stored:

- **ticked:** saved to `localStorage`, so you stay signed in;
- **unticked:** saved to `sessionStorage`, so you're signed out when the browser closes.

Profile pictures upload to the Supabase `avatars` bucket. Each upload is saved as a new timestamped file, so a changed picture is never served from an old cached copy.

**PWA.** You can install it to a phone home screen, where it opens like a native app, and its app shell loads offline. Supabase requests deliberately bypass the service worker (network-only), so nobody is ever served stale login or stale data.

### Routes

WorkBud has no HTTP API of its own. The app talks to Supabase directly through `@supabase/supabase-js`, and access control lives in the database's Row Level Security policies rather than in route handlers. The app's own routes are:

| Route | Guard | What it shows |
|---|---|---|
| `/login` | signed out only | Sign-in screen |
| `/signup` | signed out only | Account creation and the emailed-code step |
| `/forgot-password` | signed out only | Password reset by emailed code |
| `/dashboard` | signed in only | The main app: hours, money, milestones, export |
| `/` and any unknown path | none | Redirects to `/dashboard` |

If you open a protected route while signed out, you're redirected to `/login`, and the app remembers where you were going. After signing in, you land back there instead of always on the dashboard.

### What the app reads and writes

| Table | Holds |
|---|---|
| `profiles` | One row per user: name, age, occupation, currency, onboarding state, avatar path. Created automatically by a signup trigger. |
| `jobs` | A placement: name, target hours, hours per day, start date, deadline, monthly budget, daily budget, hourly rate. A user can have several. |
| `daily_logs` | One logged day: date, time in and out, break minutes, hours worked, day total spent, note, and an absent flag for days not worked. Belongs to a job. |
| `expenses` | The individual things bought on a day: label, category, amount. Belongs to a log. |
| `milestones` | A checkpoint on a job: title, optional due date and hours goal, and when it was done. Belongs to a job. |

One design note worth knowing:

- `daily_logs.hours_worked` stores the day's planned total, and the figure the dashboard counts is worked out when the page draws. That's how a shift can tick upward without anything being written back to the database.
- A day's `expenses` rows are the real record of spending, and `amount_spent` on the log is their total, written by the app.

---

## 5. Project structure

```
WorkBud/
|-- index.html                 Vite entry HTML
|-- vite.config.js             Vite, Tailwind and PWA / Workbox config
|-- vercel.json                SPA rewrite and cache headers for deployment
|-- .env.example               Template for .env.local (placeholders only)
|-- public/                    Favicons and PWA icons
|-- docs/screenshots/          Screenshots used in this README
|-- supabase/
|   \-- schema.sql             Tables, RLS policies, triggers, storage bucket
\-- src/
    |-- main.jsx               Mounts React inside BrowserRouter
    |-- App.jsx                Routes and the signed-in / signed-out guards
    |-- index.css              Tailwind layer and design tokens
    |-- components/            Screens, cards and the bottom-sheet forms
    |   |-- AuthScreen.jsx         Sign in and sign up
    |   |-- SignupSteps.jsx        Multi-step account creation
    |   |-- OtpStep.jsx            6-digit emailed code entry
    |   |-- ForgotPassword.jsx     Password reset by code
    |   |-- Onboarding.jsx         First-run profile and first job
    |   |-- Dashboard.jsx          The main signed-in screen
    |   |-- HeroHours.jsx          Progress ring and headline figures
    |   |-- PaceCard.jsx           Deadline countdown and required pace
    |   |-- BudgetCard.jsx         Daily and monthly budget meters
    |   |-- CatchUpCard.jsx        Overspend spread across remaining days
    |   |-- CategoryBreakdown.jsx  Spend by category
    |   |-- MilestonesCard.jsx     Checkpoints and automatic hour badges
    |   |-- MilestoneSheet.jsx     Create or edit a milestone
    |   |-- ActivityFeed.jsx       Recent logged days
    |   |-- LogSheet.jsx           Add or edit a day of hours and expenses
    |   |-- JobSheet.jsx           Create or edit a job
    |   |-- JobTabs.jsx            Switch between jobs
    |   |-- ExportSheet.jsx        Date range, time log or full record
    |   |-- SettingsSheet.jsx      Profile, avatar, currency, sign out
    |   |-- Avatar.jsx             Profile picture, or your initial when unset
    |   \-- Sheet.jsx, ui.jsx      Bottom-sheet shell and shared primitives
    |-- hooks/
    |   |-- useSession.js          The persisted Supabase session
    |   \-- useWorkbud.js          Profile, jobs, logs and everything derived
    \-- lib/
        |-- supabase.js            Client, "remember me" storage, error text
        |-- format.js              Money, hours, dates, shift maths, currencies
        |-- export.js              Time log and CSV builders
        |-- password.js            Strength rules shared by every password screen
        \-- avatar.js              Profile picture upload and public URLs
```

`useWorkbud` keeps all of a user's logs in memory and filters them per job. That's a small amount of data for a personal tracker, and it makes switching job tabs instant.

---

## 6. Screenshots

| Sign-in | Onboarding | Dashboard |
|---|---|---|
| ![Sign-in screen](docs/screenshots/01-signin.png) | ![Onboarding](docs/screenshots/02-onboarding.png) | ![Dashboard](docs/screenshots/03-dashboard.png) |

| Log sheet | Export sheet | Settings |
|---|---|---|
| ![Log sheet](docs/screenshots/04-log-sheet.png) | ![Export sheet](docs/screenshots/05-export.png) | ![Settings](docs/screenshots/06-settings.png) |

---

## 7. Known issues and next steps

### Known issues

- **No automated tests.** There is still not a single test in the repository. The two bugs that cost the most time in Week 1 both lived in `src/lib/format.js`: overnight shifts coming out as negative hours, and dates showing one day off because of a timezone conversion. That's exactly the file that should have had unit tests first.
- **Export totals show floating-point noise.** The "Hours completed" figure and the total row on the exported time log can read `209.32999999999998` instead of `209.33`. The total in `src/lib/export.js` adds up `hours_worked` without rounding, so decimal hours like 15.83 leave a long tail. It shows on any export that mixes fractional hours.
- **The avatars bucket can be listed while signed out.** The `avatars_read_all` storage policy gives signed-out users SELECT on the bucket, so anyone can list it and see each user's folder name, which is their user ID. The app never needs this, because pictures load through public URLs. I found it while filling in [SECURITY-CHECKLIST.md](SECURITY-CHECKLIST.md).
- **Offline is read-only.** The app shell opens without a connection, but every save still needs the network. Logging a day at a placement site with no signal fails rather than waiting to sync.
- **Several Supabase calls fail silently.** Some error paths show nothing at all, so a failed save can look like one that worked. A full error-handling pass is needed.
- **Expense rows can be added but not fully managed.** Editing and deleting individual expense lines isn't finished. The reliable workaround today is deleting the day's log and entering it again.
- **`hours_worked` is an unproven design.** It stores the planned total while the dashboard works out the live figure when it draws. It works, but I'm not confident it holds up once entries are edited after the fact, and it hasn't been stress-tested.
- **The export hasn't been checked against a real form.** The time log looks right, but it hasn't been compared with the DTR my coordinator actually requires, and printing from a phone is untested.
- **The git history is messy.** A `git pull` that turned into a merge (`66abb9e`) duplicated a large run of commits in the log. Many commit messages don't say what changed, and every commit has my personal email as its author address. I'd rather leave the history honest than rewrite it.

### Next steps

1. Unit tests on `src/lib/format.js` covering shift maths, overnight shifts and timezone handling, before any new feature.
2. Round the export totals to two decimal places.
3. Limit the avatars bucket's SELECT policy to each user's own folder, so the bucket can no longer be listed.
4. An error-handling pass, so every failed Supabase call shows the user a message.
5. Finish editing and deleting individual expense rows.
6. A save queue, so a day logged offline syncs when the connection returns.
7. Compare the exported time log with the real coordinator form, and test printing from a phone.
8. Empty states and loading skeletons. A new account currently looks broken rather than empty.
9. An optional push notification reminding you to log the day's hours. The in-app "Nothing logged today" nudge already exists; this would reach you with the app closed.
10. A tidier git workflow: feature branches, commit messages that say what changed, and GitHub's no-reply address as the commit email.

---

## Security and AI usage

**Security.** The completed security checklist is in [SECURITY-CHECKLIST.md](SECURITY-CHECKLIST.md). It covers secrets, the database, access control, input and output, and repository privacy, with evidence for every row.

**AI usage.** This project was built with help from Claude (Anthropic), with ChatGPT (OpenAI) and Gemini (Google) used alongside it on a couple of earlier bug fixes. [AI-USAGE.md](AI-USAGE.md) records what each was used for, where it got things wrong, and which parts I wrote myself.
