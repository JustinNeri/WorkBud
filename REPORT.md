# WorkBud Weekly Increment Reports

Weekly increment reports for WorkBud, one section per week.

- [Week 1: September 14 to 20, 2026](#week-1-september-14-to-20-2026)
- [Week 2: September 21 to 27, 2026](#week-2-september-21-to-27-2026)
- [Week 3: September 28 to October 4, 2026](#week-3-september-28-to-october-4-2026)

---

# Week 1: September 14 to 20, 2026

## What changed this week

**1. Project foundation and deployment pipeline**

Set up the React 19 + Vite 8 + Tailwind CSS 4 project, connected it to a Supabase backend (Postgres + Auth), and added `vercel.json` so every push deploys automatically. The app has been publicly reachable since day one rather than sitting only on my machine.

Commit: [510ccde](https://github.com/JustinNeri/WorkBud/commit/510ccde)

**2. Database schema with Row Level Security** (`supabase/schema.sql`)

Built five tables: `profiles`, `jobs`, `daily_logs`, `expenses`, `milestones`. Every table has RLS policies scoped to `auth.uid()`, plus a trigger that creates a profile row automatically when a user signs up. The script is idempotent so I can re-run it safely when I add columns.

Commit: [1f06ec8](https://github.com/JustinNeri/WorkBud/commit/1f06ec8)

**3. Full authentication flow**

Sign up, log in, email verification, and password reset. I deliberately used a 6-digit emailed **code** instead of a confirmation link, added a show/hide password toggle, a password strength meter, and a clear message when an email is already registered.

Commit: [bfbb2e0](https://github.com/JustinNeri/WorkBud/commit/bfbb2e0)

**4. Onboarding and multi-job support** (`Onboarding.jsx`, `JobSheet.jsx`, `JobTabs.jsx`)

First-run onboarding collects name, occupation, and currency (10 supported). Users can create multiple jobs/placements, each with its own target hours, deadline, and settings, switchable via tabs.

Commit: [70e53f8](https://github.com/JustinNeri/WorkBud/commit/70e53f8)

**5. Daily log entry with computed hours** (`LogSheet.jsx`)

One entry per day: date, time in, time out, unpaid break, and a note. Hours are computed automatically, overnight shifts (10pm → 6am) calculate correctly, an in-progress shift ticks upward live, and any past date can be backfilled with Today/Yesterday shortcuts.

Commit: [cfcc083](https://github.com/JustinNeri/WorkBud/commit/cfcc083)

**6. Dashboard, pace tracking, and activity feed** (`PaceCard.jsx`, `TodayNudge.jsx`, `ActivityFeed.jsx`)

A progress ring against target hours, hours this week, average per day, days worked, deadline countdown, and the hours-per-day needed to finish on time with a warning when that required pace exceeds the pace actually being kept.

Commit: [d95a8f4](https://github.com/JustinNeri/WorkBud/commit/d95a8f4)

**7. Expense tracking and budgets** (`BudgetCard.jsx`, `CatchUpCard.jsx`, `CategoryBreakdown.jsx`)

Itemised expenses per day (label, category, amount) instead of one lump sum, an optional daily budget per job checked live while typing, a monthly budget meter, a spend-by-category breakdown, and a "catch-up" figure that spreads any overspend across the remaining days of the month.

Commit: [d2515d1](https://github.com/JustinNeri/WorkBud/commit/d2515d1)

**8. Export (DTR + CSV)** (`src/lib/export.js`)

Any date range exports as printable or CSV, in two versions: a **time log** (date, time in/out, hours, note) clean enough to hand a coordinator, and a **full record** including break and expenses.

Commit: [d2515d1](https://github.com/JustinNeri/WorkBud/commit/d2515d1)

**9. Milestones** (`MilestoneSheet.jsx`, `MilestonesCard.jsx`)

User-defined checkpoints per job (orientation, midterm evaluation, narrative report) with optional due dates and hour goals, flagged when overdue or due this week, plus automatic badges at 25/50/75/100% of target hours showing the date each was reached or a projected date at the current pace.

Commit: [d2515d1](https://github.com/JustinNeri/WorkBud/commit/d2515d1)

**10. Mobile-first UI rebuild and PWA**

Rebuilt the layout for phone screens (bottom sheets instead of modals, safe-area handling, larger tap targets), added the logo/icon set, and configured `vite-plugin-pwa` so the app installs to a home screen with an offline shell.

**11. Documentation**

Wrote a full README covering features, setup, schema, data model, project structure, and deployment.

## Why

The goal of Week 1 was to get a *usable* end-to-end product rather than scaffolding. An OJT student needs three things at once: hours that satisfy the school's DTR, an honest picture of what the placement costs out of pocket, and proof of progress toward the required total. So auth, logging, money, and export all had to exist together before any of it was worth testing. I prioritized deployment and RLS early because a tracker holding personal financial data is not something to bolt security onto later, and mobile-first because this gets opened on a phone at the end of a shift, not on a laptop.

## What broke or what I got stuck on

- **Supabase email confirmation was the biggest time sink.** The default confirmation *link* kicked users out of the app into a browser tab and often failed to return them to a logged-in session. I switched to an emailed OTP code, which then broke again because I had hard-coded a 6-digit length while Supabase was issuing a different length. Fixed. This also required editing the Supabase email template to emit `{{ .Token }}`, which is not obvious from the dashboard.
- **Password reset took four separate commits to get right.** The recovery session was not being picked up correctly, so the new password either failed to save or dropped the user back to the login screen. Two full days went into this.
- **Time maths was wrong twice.** An overnight shift (10 p.m. to 6 a.m.) initially computed as −16 hours instead of 8 because I subtracted the clock times without accounting for midnight. Related: dates displayed one day off because of timezone conversion on the stored date.
- **Deleting a job failed** because of the foreign-key relationships between `jobs`, `daily_logs`, and `expenses`: child rows blocked the delete.
- **The mobile UI needed six passes.** See the `FIXED MOBILE VIEW` / `FIXED UI LOGIN` commits. I built the first version desktop-first out of habit, then had to rework layout, the login screen, and the edit-entry sheet once I actually opened it on a phone. That was avoidable and cost me most of a day.

## What is left

### Needed before the final

- **Routing.** The app is currently one authenticated screen with sheets layered over it and no router, so there are no shareable URLs and the phone back button closes the app instead of the sheet. Adding React Router is the next thing I'm doing.
- **Session persistence ("remember me").** Users are logged out too aggressively right now.
- **Profile pictures / avatar upload.** The profile row exists but has no image field yet.
- **Automated tests.** There are none. At minimum I want unit tests on `src/lib/format.js` (shift maths, overnight shifts, timezone handling) since that's where two of this week's bugs lived.
- **Real offline support.** The PWA caches the app shell but writes still require a connection. Logging a day with no signal at the placement site will currently fail.
- **Editing and deleting expense rows.** Only adding is fully solid.
- **Export polish.** Verify the DTR output against the actual form my coordinator requires, and confirm printing works from a phone.
- **Error handling pass.** Several Supabase calls still fail silently instead of telling the user what went wrong.

### Nice to have if time allows

- Reminder notification to log the day's hours
- Tidier git workflow (feature branches, descriptive commit messages; "additional feature" is not useful to anyone)
- Empty states and loading skeletons

---

# Week 2: September 21 to 27, 2026

## What changed this week

**1. Routing** (`main.jsx`, `App.jsx`)

The app was one authenticated screen with sheets layered over it and no URLs. It now uses React Router with real routes at `/login`, `/signup`, `/forgot-password` and `/dashboard`, guarded by `RequireSession` and `GuestOnly`. Opening a protected page while signed out sends you to `/login` and remembers where you were headed, so signing in takes you back there instead of always to the dashboard. This closes the first item on my Week 1 "What is left" list.

Commit: [05176af](https://github.com/JustinNeri/WorkBud/commit/05176af)

**2. Session persistence, "Remember me"** (`src/lib/supabase.js`, `AuthScreen.jsx`)

There is now a checkbox on the sign-in screen that controls how long a session lasts. When it is ticked, the token goes to `localStorage` and you stay signed in. When it is unticked, the token goes to `sessionStorage` and the session ends when the browser closes. This closes the second item on the Week 1 list.

Commit: [285118d](https://github.com/JustinNeri/WorkBud/commit/285118d)

**3. Profile pictures** (`Avatar.jsx`, `src/lib/avatar.js`, `SettingsSheet.jsx`)

Users can now upload a profile picture from settings.

- Added an `avatar_path` column on `profiles`, and a public `avatars` storage bucket in `schema.sql`. The bucket has a 2 MB limit, accepts JPEG, PNG and WebP only, and has per-user policies so nobody can overwrite anyone else's picture.
- Each upload writes a new timestamped filename, so a cache can never keep serving an old picture.

This closes the third item on the Week 1 list.

Commit: [98c739f](https://github.com/JustinNeri/WorkBud/commit/98c739f)

**4. Planned pace, start dates and days off** (`JobSheet.jsx`, `LogSheet.jsx`, `schema.sql`)

- Added three columns: `jobs.daily_hours`, `jobs.start_date` and `daily_logs.absent`.
- The first two drive an expected finish date. That answers "when do I actually finish at the pace I keep," which is a different question from "how many hours a day do I need."
- Days you did not go in are now recorded with an "I didn't work this day" tick instead of being left blank.

Commit: [619e72e](https://github.com/JustinNeri/WorkBud/commit/619e72e)

**5. Visual overhaul and colour tokens** (`AuthShell.jsx`, `Dashboard.jsx`, `index.css`)

I rebuilt the sign-in shell, restructured the dashboard, and reworked the header, job tabs and shared `ui.jsx` primitives. Colours now come from tokens in `index.css` instead of hex values repeated in each component. That was three commits, about 660 lines across 13 files.

Commits: [21f6810](https://github.com/JustinNeri/WorkBud/commit/21f6810), [6cab803](https://github.com/JustinNeri/WorkBud/commit/6cab803), [442fda8](https://github.com/JustinNeri/WorkBud/commit/442fda8)

**6. Activity feed filtering** (`ActivityFeed.jsx`)

The feed now shows a five-entry preview with a "show all" option. It also has month chips, built only from months that actually have entries.

Commit: [a2ae5e1](https://github.com/JustinNeri/WorkBud/commit/a2ae5e1)

**7. Sheet overflow indicator** (`Sheet.jsx`)

A chevron now appears when a form continues below the fold. Before this, there was no sign there was more to fill in.

Commit: [41f8010](https://github.com/JustinNeri/WorkBud/commit/41f8010)

**8. Documentation, security checklist and AI usage record** (`README.md`, `SECURITY-CHECKLIST.md`, `AI-USAGE.md`, `docs/screenshots/`)

- Rewrote the README to match the code: routes, the new features, screenshots, known issues, and an AI credit badge. It also removes the old claim that the app had no router.
- Filled in the 31-row security checklist with evidence. I searched the whole git history for secrets and found none, then tested Row Level Security live while signed out: every table returned nothing, and an insert was refused. That test found a real problem, below.
- Wrote `AI-USAGE.md`: six uses of AI with their commits, three times it got something wrong, and which parts are mine.

Commits: [20c5618](https://github.com/JustinNeri/WorkBud/commit/20c5618), [5071949](https://github.com/JustinNeri/WorkBud/commit/5071949), [334b5a7](https://github.com/JustinNeri/WorkBud/commit/334b5a7), [b1836b0](https://github.com/JustinNeri/WorkBud/commit/b1836b0)

## Why

Routing, remember me and profile pictures were the three things I committed to in Week 1, and I wanted that list closed before starting anything new.

Routing mattered most. With no routes, the phone back button closed the whole app instead of the open sheet. Users don't report that; they just leave.

Planned pace and days off fix a gap I only saw once real days were logged. A progress ring tells you how far you've come, but not whether you'll finish. A blank day was also ambiguous: it could mean you were absent, or that you forgot to log it.

The colour tokens were debt repayment. Hardcoded colours in thirteen components were getting more expensive to change every week.

## What broke or what I got stuck on

- **"Remember me" was the hardest part of the week, and it is a checkbox.**
  - supabase-js decides where to store the session once, when the client is created, so the checkbox cannot simply be passed to the sign-in call. I had to write a custom storage adapter that picks `localStorage` or `sessionStorage` based on a flag.
  - The flag has to be set *before* signing in. Otherwise the new token gets written to the storage you just switched away from.
  - A missing flag has to count as "remembered." Every existing session predates the feature, so reading a missing flag as false would have signed every user out the moment I deployed.
- **The activity feed month filter kept breaking.** If you filtered to a month on one job and then switched to a job with no entries that month, you got an empty list and no obvious way back. The same happened after deleting the last entry of the filtered month. I touched `ActivityFeed.jsx` three times in one night before settling on the fix: fall back to "all" whenever the selected month doesn't exist for the current job.
- **The UI overhaul took three passes.** The commits read `UI`, then `UI AGAIN`, then `colors`, and together they deleted 473 lines. I rewrote components before deciding on the colour tokens, then went back through all thirteen files to swap the hex values out.
- **My schema pattern tripped me up.** I added the three new columns inside the `create table if not exists` block. When I ran the script, nothing happened, because that block skips a table that already exists. New columns need their own `alter table ... add column if not exists` line.
- **I'm behind on tests.** Between September 21 and 27 my commits were documentation, security and the AI usage record, not code. In Week 1 I said tests on `src/lib/format.js` would come right after the router. The router is done, but the tests haven't been started. That's the main thing I'm stuck on: not a hard bug, just work I keep putting off.
- **My commit messages are still bad.** `UI AGAIN`, `updated version`, and `Update ActivityFeed.jsx` three times. I named this problem in Week 1 and didn't fix it.

## What is left

### Needed before the final

- **Automated tests.** There are still none. `src/lib/format.js` comes first: shift maths, overnight shifts and timezone handling, where Week 1's worst bugs were.
- **Real offline support.** The app shell loads offline, but writes still need a connection, so logging a day with no signal fails.
- **Editing and deleting expense rows.** Only adding is solid.
- **Export polish.** The DTR output still hasn't been compared with the form my coordinator requires, and printing from a phone is untested.
- **Error handling pass.** Several Supabase calls still fail silently, so a failed save can look like a successful one.
- **Export totals.** The exported time log can show 209.32999999999998 hours instead of 209.33, because the total isn't rounded.
- **Avatars bucket.** Anyone signed out can list the `avatars` bucket and see user IDs. Found by the security checklist; the fix is to limit that policy to each user's own folder.

### Nice to have if time allows

- A reminder notification to log the day's hours. The in-app "Nothing logged today" nudge already exists; this would reach you when the app is closed.
- A tidier git workflow: feature branches, and commit messages that say what changed.
- Empty states and loading skeletons.

---

# Week 3: September 28 to October 4, 2026

## What changed this week

**1. Express API server** (`server/`, `api/index.js`, `src/lib/api.js`)

Until this week the React app talked to Supabase directly and the project had no server of its own. It now has one. Jobs, daily logs, expenses, milestones and the profile are read and written through a REST API built with Express 5.

- Routes: `/api/profile`, `/api/jobs`, `/api/logs`, `/api/milestones` and `/api/account`, plus a public `/api/health` that checks the database connection. Creates return 201, deletes return 204, bad input returns 400, a missing or invalid token returns 401, and a row that does not exist or is not yours returns 404.
- Every request body is validated on the server (`server/validate.js`) before it reaches the database, and the error names the field that failed.
- Sign-in still goes through Supabase Auth. The browser sends its access token to the API, and the server queries the database as that user, so the Row Level Security policies from Week 1 still apply behind every route.
- `useWorkbud.js`, `Onboarding.jsx` and `DeleteAccountSheet.jsx` now call the API instead of Supabase. `npm run dev` starts the server and Vite together.
- Nothing in the database changed: same tables, same policies, same data.

This was written by Claude (Claude Code). It is recorded in `AI-USAGE.md`, entry 1.7.

Commit: [750a87c](https://github.com/JustinNeri/WorkBud/commit/750a87c)

**2. Past months on the budget card** (`BudgetCard.jsx`, `useWorkbud.js`)

The budget card can now page back through earlier months, from the first month logged up to last month. A month with nothing logged shows as nothing spent instead of being skipped.

Commit: [6195d5c](https://github.com/JustinNeri/WorkBud/commit/6195d5c)

**3. Delete account** (`DeleteAccountSheet.jsx`, `schema.sql`)

A user can now close their own account from settings. It asks for the current password first, removes the profile pictures, then deletes the account, and the database cascades through the jobs, logs, expenses and milestones.

Commit: [5382e29](https://github.com/JustinNeri/WorkBud/commit/5382e29)

**4. Documentation** (`README.md`, `SECURITY-CHECKLIST.md`, `AI-USAGE.md`)

The README now describes the server: how the pieces fit, how to run it, every API route, and the error format. It also removes the old line that said there was no server to run. Eleven rows of the security checklist were checked again against the server, and the CORS row changed from N/A to Yes.

Commit: [750a87c](https://github.com/JustinNeri/WorkBud/commit/750a87c)

## Why

The final project rubric grades a server that starts, connects to its database and answers on its endpoints, with sensible routes and correct status codes. WorkBud had none of that to show, because Supabase was doing the job of the server. I could not get an answer in time on whether that would be accepted, so I added a server instead of risking those rows.

Keeping Supabase Auth and Row Level Security in place, and putting the server in front of them, was the smallest change that gave the project a real API without rewriting sign-in in the last week.

## What broke or what I got stuck on

- **I found the gap late.** My proposal and both earlier reports describe an app with no server, and I only checked that against the final rubric in the last week. The server was added on October 3.
- **The server is AI-written and I have to catch up on it.** I did not write this code. I need to read it well enough to explain it in the presentation.
- **It could not be fully tested when it was written.** Claude had no account to sign in with, so only the signed-out paths, the bad-input paths and the health check were tested. The signed-in flows and the Vercel deployment still needed checking by me.
- **Saving a day is two writes, not one transaction.** The server saves the log, then its expenses. A failure between the two on an edit could leave a day without its expense list.

## What is left

- **Test every signed-in flow through the API:** add, edit and delete a log with expenses, a job and a milestone, change the profile, and finish onboarding on a new account.
- **Check the Vercel deployment,** starting with `/api/health`.
- **Automated tests.** Still none, and that now includes the API routes.
- **One transaction for a log and its expenses,** as a database function.
- **Rate limiting on the API.**
- **Avatars bucket.** The listing problem found in Week 2 is still not fixed.
- **Export totals.** Still not rounded.
