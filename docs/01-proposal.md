# 1. App Proposal

## App name

**WorkBud**

## What the app is for, in one sentence

*What does this app help someone do, find, or decide? Be specific about a real purpose, not a category.*

WorkBud lets a student on an OJT placement log each day's time in, time out, break, and out-of-pocket expenses from their phone, so they always know how many of their required hours are left, whether they will finish before the deadline, and what the placement is costing them.

## Who is it for

*Who, specifically, uses this app? (Not "everyone" - name a person or small group, even if it is you.)*

A third- or fourth-year college student in the Philippines doing required on-the-job training (OJT), usually 300 to 600 hours, who has to hand their OJT coordinator a daily time record (DTR) at the end. The first users are me and my classmates in the same OJT cycle.

**What are they trying to get done in the moment they open it?**

Most of the time, they open it right after clocking out, often on the ride home, to record today's time in, time out, and what they spent on fare and lunch in under a minute. Then they check how many hours are left and whether they are still on pace to finish before the deadline. Near the end of the placement, they open it to export their time log for their coordinator.

## Sections or routes this app needs

*List every top-level screen. A single-page app (like the portfolio) has sections on one route; a multi-screen app uses routes (React Router). Aim for 3 to 5 either way. For each, write one sentence on what it is for. If you go over 5, cut one.*

WorkBud is a multi-screen app that uses React Router: five screens on four URLs. `/login`, `/signup` and `/forgot-password` are for signed-out users only, and `/dashboard` is for signed-in users only. A route guard sends anyone signed out to `/login` and remembers where they were going, so signing in takes them back there; a signed-in user who opens a login page is sent to `/dashboard`. Any other address, including `/`, redirects to `/dashboard`. A new account sees Onboarding at `/dashboard` until the first-run setup is finished. "Log a day" and "Export" open as sheets over `/dashboard` instead of having their own URLs - bottom sheets on a phone, which feels quicker, and centered pop-ups on a larger screen.

| # | Section / route | What it is for |
|---|---|---|
| 1 | Home (Dashboard) - `/dashboard` | Shows hours done against the target, pace toward the deadline, this month's spending, and a feed of every logged day. |
| 2 | Auth - `/login`, `/signup`, `/forgot-password` | Lets the student create an account, sign in, or reset a forgotten password, so their hours are saved and survive a lost or changed phone. |
| 3 | Onboarding - shown at `/dashboard` until setup is done | A short first-run setup that asks for the student's name, currency, placement name, and required hours, so Home has a target to measure against from day one. |
| 4 | Log a day - sheet over `/dashboard` | The form for adding or editing one day: date, time in, time out, break, a note on the work done, and a list of expenses - or marking the day as not worked. |
| 5 | Export - sheet over `/dashboard` | Turns a date range of logs into a printable or CSV time log laid out like the DTR a coordinator asks for. |

*Test each one: if you removed it, could the user still do the main thing above? If yes, it may not be core - park it for later.*

- **Home:** No. It is the main thing.
- **Auth:** No. Without an account, the data lives in one browser only, and a student who clears it or switches phones mid-placement loses weeks of hours.
- **Onboarding:** No. Without a target number of hours, there is no "hours left" or pace, which is half of the purpose sentence.
- **Log a day:** No. Without it, there is no data at all.
- **Export:** No. The student's actual deliverable is the DTR they hand their OJT coordinator (see *Who is it for*); tracking hours is only the means to it. Without Export, the app cannot produce that record, and they would retype every logged day by hand at the end.
- **Kept out of the five on purpose:** Settings (name, currency, profile picture), a job editor, custom milestones like "midterm evaluation," and earnings for paid jobs. Each is edited in a secondary sheet opened from Home instead of being a top-level screen, because each one passes the test above the other way: remove any of them and the student can still log hours and hand in a DTR.

## State: what data does the app hold?

*React apps are mostly about state. For your most important screen, name the pieces of data it manages and where they live. You do not need final shapes yet - just name them.*

Most important screen: **Home (Dashboard)**

| Data | Shape (rough) | Who owns it (which component) | Changes when... |
|---|---|---|---|
| profile | `{ id, firstName, lastName, currency }` | Dashboard | user finishes onboarding or edits their details |
| jobs | `[{ id, name, targetHours, deadline, monthlyBudget, dailyBudget }]` | Dashboard | user adds a placement or edits its target, deadline, or budget |
| activeJobId | string | Dashboard | user taps a different job tab |
| logs | `[{ id, jobId, date, timeIn, timeOut, breakMinutes, note }]` | Dashboard | user saves, edits, or deletes a day |
| expenses | `[{ id, logId, label, category, amount }]` | Dashboard | user saves a day with items bought on it |
| now | a timestamp, ticks every minute | Dashboard | a minute passes, so a shift in progress counts up ("2h so far") |
| logSheet | `null` or `{ log }` (the day being edited) | Dashboard | user taps "+" or a day in the feed, or closes the sheet |
| exportOpen | boolean | Dashboard | user opens or closes Export |
| form fields (date, times, break, note, expense items) | strings + `[{ label, category, amount }]` | LogSheet | user types; only sent up to Dashboard when they press Save |

*This is your first pass at state ownership: state lives in the lowest component that needs it, and is passed down as props.*

The form fields live in LogSheet because nothing else needs them until Save is pressed. Everything the Home cards read lives in Dashboard and is passed down as props. Totals like hours done, hours left, average per day, hours per day needed, and spending by category are calculated from `logs` and `expenses` on each render and are not stored, so there is only ever one copy of each number. The data itself is saved in a Supabase database (profiles, jobs, daily logs, expenses, and milestones, with profile photos in Supabase file storage), and each student can only read their own rows.

### State for the other four screens

Home owns the data the app is about. The other four screens mostly own short-lived form state that is thrown away once it has been sent. One piece of state sits above all five: the signed-in **session** lives in `App` (through a `useSession` hook), because the route guards read it to decide which URLs the user may open. The **URL itself is state** too: whether Auth shows Sign in or Create account comes from the address (`/login` or `/signup`), not from a `useState`.

| Screen | Data it owns | Shape (rough) | Changes when... |
|---|---|---|---|
| Auth | mode | `'signin'` or `'signup'`, read from the URL | user switches between the Sign in and Create account tabs, which navigates between `/login` and `/signup` |
| Auth | email, password, confirm | strings | user types |
| Auth | awaitingCode | `null`, or the email a code was sent to | signup succeeds; swaps the form for the enter-your-code step |
| Auth | remember | boolean | user ticks or clears "Remember me" |
| Onboarding | step | `1` (about you) or `2` (first job) | user presses Continue or Back |
| Onboarding | name, occupation, currency, jobName, targetHours, monthlyBudget | strings | user types; nothing is saved until the last step, when it is written to profiles and jobs together |
| Log a day | date, timeIn, timeOut, breakMinutes, note, items | as in the Home table above | user types; sent up to Dashboard only on Save |
| Log a day | absent | boolean | user marks the day as not worked, which clears the shift and records a day off |
| Export | mode | `'timelog'` or `'full'` | user picks the plain time log for their coordinator, or the full record with breaks and expenses |
| Export | from, to | dates | user sets the range to export |

## What each screen contains

*For your most important screen, list the blocks of content it needs. These become the components you break it into on the next worksheet.*

**Screen: Home (Dashboard)**

- **Block 1:** Header - the student's photo or initial, a greeting with their first name, and two buttons: Export and Settings (edit details, change password, sign out).
- **Block 2:** Job tabs - one tab per placement, plus a "+" to add another.
- **Block 3:** Today nudge - a prompt that appears when today hasn't been logged yet, with a button that opens Log a day.
- **Block 4:** Hours hero - a progress ring showing hours done out of the target (e.g., 212 / 480 h) and hours left, with the deadline and an expected finish date underneath.
- **Block 5:** Pace card - the deadline, days remaining, and hours per day needed, with a warning when that is higher than the pace actually being kept, and a count of days logged as not worked.
- **Block 6:** Stat tiles - this week's hours, average hours per day, and days worked.
- **Block 7:** Milestones - the student's own checkpoints, like orientation or midterm evaluation, and automatic badges at 25, 50, 75 and 100% of the target.
- **Block 8:** Money section - a monthly budget meter, today's spend against the daily cap, a breakdown by category (transport, food, supplies, fees, other), and, after going over the cap, how much to save per day to catch up.
- **Block 9:** Activity feed - logged days, newest first, showing date, hours, amount spent, and note, with days off marked "Did not work". It shows the latest five with a "Show all" button, and month chips filter it to one month with that month's total hours. Tapping a day opens it for editing.
- **Block 10:** Floating "+" button - opens Log a day for a new entry, within easy reach of the thumb.

## Content you need to gather

*What real text, data, and images do you need before you can build? List them now so you are not stuck hunting for them mid-build.*

- A real DTR sample from my OJT coordinator, so the export has exactly the columns they accept.
- About three weeks of realistic sample logs from my own or a classmate's placement, including a half day, a day off, and an overnight shift.
- Real expense amounts near my placement (jeepney/bus fare, lunch, printing) to set the categories and a sensible default budget.
- Common required-hour totals (e.g., 486 h, 480 h, 300 h) for the onboarding default.
- A logo and app icon that still reads at phone-icon size, in the sizes needed for installing to the home screen.
- Written copy: onboarding questions, empty-state messages ("No entries yet"), error messages, and the signup-code email text.
- A Supabase project (database, sign-in, and file storage for profile photos) and a Vercel account for hosting.
- A short currency list, with PHP as the default.

## One risk

*What is the one part of this app you are least sure how to build? Naming it now means you can ask for help on it early, instead of the night before it is due.*

I am least sure how to calculate a day's hours correctly. For a 7:00 a.m.–5:00 p.m. shift, checking at 9:00 a.m. should show "2h so far," not 10 hours or 0. That means the Dashboard needs a `now` value that updates by itself every minute, and I have never used `setInterval` inside a React effect with proper cleanup. On top of that, an overnight shift (10:00 p.m. to 6:00 a.m.) has to come out as 8 hours instead of −16, and subtracting the break must never make the total negative. If this calculation is wrong, every number in the app is wrong, including the exported DTR. My plan is to write it as one plain function first, test it by hand against a list of tricky shifts, and ask for help early if the live update misbehaves.
