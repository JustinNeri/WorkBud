# AI usage

How I used AI to build WorkBud, where it got things wrong, and which parts
are mine.

**How I work with AI:** I ask the AI first what the structure of a feature
should be, and to give me an example of how it should be done. Then I build
the feature with that structure and example as my guide, and I test it. When
something does not work, or I want it done in a cleaner or more efficient
way, I ask the AI again and we resolve the issue. For the Supabase backend,
the AI gave me an initial draft and the overall workflow of the system, and I
built the backend from there.

**Tools:** Claude (Anthropic) for most of the work. On a couple of earlier bug fixes I also used ChatGPT (OpenAI) and Gemini (Google) alongside Claude.

---

## 1. How I used AI

### 1.1 Project foundation and the first backend draft

- **Date and tool:** September 3 to 4, 2026, Claude (reported in my Week 1 report)
- **What I asked:** a starting structure for the project, and a workflow for the backend: which tables I needed, how sign-up, sign-in and sign-out should work with Supabase, and how to keep each user's data private.
- **What it gave back:**
  - the React, Vite and Tailwind project setup, with the PWA config;
  - a first draft of the database layout (the `profiles` and `daily_logs` tables with their columns) and of the flow: sign up, get a profile row, log days against it;
  - the first screens: `AuthScreen.jsx` for sign-in and sign-up, a dashboard, a log sheet, and a settings sheet with the sign-out button, plus the `useSession.js` and `useWorkbud.js` hooks.
- **What I kept, what I changed, and why:** The draft was the two tables, `profiles` and `daily_logs`, with their columns. I typed the rest of that first `schema.sql` myself before committing it: the Row Level Security policies, the signup trigger, the check constraints and the grants (section 3). They sit in the same commit as the draft because I committed the file once, after I had finished it. The next day I replaced the one-target-per-user model with a `jobs` table, so a student can track more than one placement. Most of these first screens were reworked within days (see 1.4 and 1.9).
- **Commits:** [32e697a](https://github.com/JustinNeri/WorkBud/commit/32e697a), [fa45b49](https://github.com/JustinNeri/WorkBud/commit/fa45b49)

### 1.2 Emailed signup code instead of a confirmation link

- **Date and tool:** September 4, 2026, Claude (Claude Code) and Gemini (reported in my Week 1 report)
- **What I asked:** how to keep email verification inside the app. The default confirmation link opened a browser tab and often did not bring people back signed in.
- **What it gave back:** a new `OtpStep.jsx`:
  - after signup, the user types the emailed code, checked with `supabase.auth.verifyOtp`;
  - a resend button with a 60-second cooldown;
  - a sign-in that fails because the email is unconfirmed sends a fresh code instead of leaving the user stuck.

  It also pointed out that the Supabase "Confirm signup" email template must contain `{{ .Token }}`, or the email arrives with no code in it.
- **What I kept, what I changed, and why:** I kept the in-app code step. The code box had to change the same day. It was fixed at exactly 6 digits and submitted automatically on the sixth, but my project sends 8-digit codes, so verification could never succeed. I found that when testing a real signup, and it was fixed with Claude: the box now accepts 6 to 10 digits and waits for the user to press the button.
- **Commits:** [adc5631](https://github.com/JustinNeri/WorkBud/commit/adc5631), fixed in [0194caa](https://github.com/JustinNeri/WorkBud/commit/0194caa)

### 1.3 Telling people their email is already registered

- **Date and tool:** September 4, 2026, Claude (Claude Code) (reported in my Week 1 report)
- **What I asked:** why signing up with an email that already had an account still moved on to the code screen, to wait for a code that never arrived.
- **What it gave back:** the reason and a fix. Supabase answers "success" with a decoy user when the address already exists, so the app could not tell the difference. A real new signup comes back with one identity and a decoy comes back with none, so `AuthScreen.jsx` now checks for that and says the email is already registered.
- **What I kept, what I changed, and why:** I kept it, then built on it. The next day a database function, `email_registered()`, was added so the forgot-password screen could give the same straight answer (see 1.7). On September 6 the check moved earlier: it now runs as soon as you leave the email field, before you have picked a password (see 1.8).
- **Commit:** [2aba89c](https://github.com/JustinNeri/WorkBud/commit/2aba89c)

### 1.4 Dashboard cards, onboarding and the screens for several jobs

- **Date and tool:** September 4, 2026, Claude (reported in my Week 1 report)
- **What I asked:** help turning the plain first dashboard into separate cards, and building onboarding and the screens to add and switch jobs, on top of the `jobs` table I had designed.
- **What it gave back:**
  - dashboard pieces: `HeroHours.jsx` (the progress ring), `StatTiles.jsx`, `BudgetCard.jsx` and a reusable `Meter.jsx`;
  - `Onboarding.jsx`, a two-step first run: about you, then your first job;
  - `JobSheet.jsx` to create or edit a job, and `JobTabs.jsx` to switch between them.
- **What I kept, what I changed, and why:** I kept the split into small cards, because each one can change without touching the others. Their look was redone twice afterwards: on September 6 for phones (1.9), and on September 19 when the colours moved to shared tokens.
- **Commits:** [e7201a4](https://github.com/JustinNeri/WorkBud/commit/e7201a4), [409f1da](https://github.com/JustinNeri/WorkBud/commit/409f1da)

### 1.5 Time in and time out, itemised expenses, and hours that count up

- **Date and tool:** September 4, 2026, ChatGPT and Claude (reported in my Week 1 report)
- **What I asked:** how to log a day as time in, time out and break instead of typing a number of hours, how to record each expense separately, and how to make a shift that is still running show the hours worked so far.
- **What it gave back:**
  - `time_in`, `time_out` and `break_minutes` columns, and an `expenses` table with one row per item bought;
  - `computeHours()` in `src/lib/format.js`, which treats a time out earlier than the time in as a shift that crossed midnight;
  - `effectiveHours()` and `isInProgress()`, which show "so far" for a running shift, capped at the planned total, with the screen recalculating once a minute.
- **What I kept, what I changed, and why:** I kept all of it. Keeping the stored `hours_worked` as the planned total, and working out the live figure only for display, means nothing has to be written back to the database as the day goes on.
- **Commits:** [ee96f6b](https://github.com/JustinNeri/WorkBud/commit/ee96f6b), [4181ba3](https://github.com/JustinNeri/WorkBud/commit/4181ba3)

### 1.6 Pace card, spending by category, the "nothing logged today" nudge, and export

- **Date and tool:** September 4, 2026, Claude (reported in my Week 1 report)
- **What I asked:** help adding the parts that make the numbers useful: whether I am on pace for my deadline, where the money goes, a reminder inside the app when today is not logged, and a time record I can hand to my coordinator.
- **What it gave back:**
  - `PaceCard.jsx`, `CategoryBreakdown.jsx` and `TodayNudge.jsx`;
  - `ExportSheet.jsx` and `src/lib/export.js`, which build a printable time log and a CSV for any date range, and escape everything the user typed before it goes into the printed page.
- **What I kept, what I changed, and why:** I kept them. The export was reworked on September 15 to carry milestones (1.11). One thing in it was wrong, and I found it in my own screenshot: the total hours were added up without rounding, so an export could read 209.32999999999998. I fixed that on September 27 by rounding the total to two decimals.
- **Commits:** [f3b7ebe](https://github.com/JustinNeri/WorkBud/commit/f3b7ebe), total fixed in [6341689](https://github.com/JustinNeri/WorkBud/commit/6341689)

### 1.7 Forgot password and change password

- **Date and tool:** September 4 to 5, 2026, Claude (reported in my Week 1 report)
- **What I asked:** a way to reset a forgotten password without leaving the app, and a way to change the password from settings. The next day: why a mistyped email on the reset screen still moved on to the code step.
- **What it gave back:**
  - `ForgotPassword.jsx`, which resets by emailed code. The code and the new password are entered on the same step, so a reset link never opens outside the installed app;
  - `PasswordSheet.jsx` in settings, which asks for the current password first, because Supabase on its own would change a password on the strength of the open session;
  - the next-day fix: Supabase reports success even for an address it has never seen, so the screen now asks the database through `email_registered()` before sending a code.
- **What I kept, what I changed, and why:** I kept it, knowingly giving up Supabase's "never reveal which emails exist" behaviour for a straight answer, which suits an app this size. The same lookup then went onto sign-in, so "wrong password" and "no account with that email" show different messages, and it ignores signups that were never confirmed.
- **Commits:** [7e19ae6](https://github.com/JustinNeri/WorkBud/commit/7e19ae6), [682eeda](https://github.com/JustinNeri/WorkBud/commit/682eeda), fixes in [788b0c4](https://github.com/JustinNeri/WorkBud/commit/788b0c4) and [55e23e4](https://github.com/JustinNeri/WorkBud/commit/55e23e4)

### 1.8 Signup steps, password strength and the show-password button

- **Date and tool:** September 4 and 6, 2026, Claude (reported in my Week 1 report)
- **What I asked:** how to cut down failed sign-ins and signups on a phone, where passwords are typed blind and errors only showed after the form was submitted.
- **What it gave back:**
  - a password field with a show and hide button (`ui.jsx`), marked `type="button"` so pressing it does not submit the form;
  - `SignupSteps.jsx`, which shows where you are in account, verify and set-up;
  - `src/lib/password.js`, one set of strength rules shared by signup, reset and change password;
  - the already-registered check moved to the moment you leave the email field.
- **What I kept, what I changed, and why:** I kept them. Checking the password rules in the app before sending matters here, because every failed signup attempt costs a real email.
- **Commits:** [7e7d8e4](https://github.com/JustinNeri/WorkBud/commit/7e7d8e4), [66ddc96](https://github.com/JustinNeri/WorkBud/commit/66ddc96)

### 1.9 One look for the sign-in screens, and forms that work on a phone

- **Date and tool:** September 6, 2026, Claude (reported in my Week 1 report)
- **What I asked:** sign-in, signup, the code step, password reset and onboarding had each ended up with a different layout, and the long forms were hard to use on a phone. I asked how to fix both.
- **What it gave back:**
  - `AuthShell.jsx`, one shared frame for every screen before the dashboard;
  - a bottom sheet whose main button stays pinned at the bottom while the form scrolls;
  - long forms grouped under small headings instead of eight identical fields in a row.
- **What I kept, what I changed, and why:** I kept the shared shell and the pinned button. This was the work my Week 1 report calls the mobile passes: I had built the first screens at desktop width, and they needed redoing once I opened them on a phone.
- **Commits:** [b81cf4b](https://github.com/JustinNeri/WorkBud/commit/b81cf4b), [67f7cf8](https://github.com/JustinNeri/WorkBud/commit/67f7cf8), [56e447c](https://github.com/JustinNeri/WorkBud/commit/56e447c)

### 1.10 Delete job fix, the deadline date, and the daily budget

- **Date and tool:** September 7, 2026, Claude (reported in my Week 1 report)
- **What I asked:** why deleting a job misbehaved, how to show my deadline where I would see it at a glance, and how to add a spending limit per day.
- **What it gave back:**
  - the delete fix. The delete button sat inside the form without `type="button"`, so confirming a delete also saved the job being deleted. It also now lets you delete your last job, and moves you to another job afterwards instead of showing "No job yet";
  - the deadline date under the hours ring;
  - a `daily_budget` column on `jobs`, checked while an expense is being typed, with over-budget days flagged in the activity feed;
  - `CatchUpCard.jsx` and the catch-up figures in `useWorkbud.js`. The catch-up budget was my idea (section 3): when a day goes over the daily budget, show what to spend per day for the rest of the month to get back to level. Claude wrote the code.
- **What I kept, what I changed, and why:** I kept all three. Later, the AI's summary of this fix for my report described the delete bug wrongly, which is entry 2.1. The same day I also asked how to let a day be logged for a past date. For that one I took the explanation and wrote the change myself (section 3). On September 19 I had Claude change the catch-up rule, because the first version counted only the days that went over and ignored the days that came in under.
- **Commits:** [0aa55ea](https://github.com/JustinNeri/WorkBud/commit/0aa55ea), [7467bc4](https://github.com/JustinNeri/WorkBud/commit/7467bc4), [1334e5e](https://github.com/JustinNeri/WorkBud/commit/1334e5e), past dates in [e89aafa](https://github.com/JustinNeri/WorkBud/commit/e89aafa), catch-up budget in [d5df02a](https://github.com/JustinNeri/WorkBud/commit/d5df02a), its rule changed in [c66207f](https://github.com/JustinNeri/WorkBud/commit/c66207f)

### 1.11 Milestones and hour badges

- **Date and tool:** September 15, 2026, Claude
- **What I asked:** help adding checkpoints to each job (orientation, midterm evaluation, narrative report) with optional due dates and hour goals, plus some kind of progress marker as the hours add up, and to include them in the export.
- **What it gave back:**
  - a `milestones` table with its own Row Level Security policies;
  - `MilestoneSheet.jsx` for creating and editing milestones;
  - `MilestonesCard.jsx`, which flags overdue and due-this-week items and shows automatic badges at 25, 50, 75 and 100 percent of the target, each with the date it was reached or a projected date at the current pace;
  - a reworked `src/lib/export.js`.
- **What I kept, what I changed, and why:** I kept the badges being worked out in the app instead of stored in the database. That way they can never disagree with the hours actually logged, because they are recalculated from the logs every time. I restyled the card a few days later to fit the new colour tokens.
- **Commits:** [552a712](https://github.com/JustinNeri/WorkBud/commit/552a712), restyled in [4820302](https://github.com/JustinNeri/WorkBud/commit/4820302)

### 1.12 "Remember me" on sign-in

- **Date and tool:** September 19, 2026, Claude (committed at the end of Week 1, after my Week 1 report was written, so it is reported in my Week 2 report)
- **What I asked:** how to add a "Remember me" checkbox that actually controls whether a user stays signed in after closing the browser.
- **What it gave back:**
  - an explanation that supabase-js decides where to store the session once, when the client is created, so the checkbox cannot just be passed to the sign-in call;
  - a custom storage adapter in `src/lib/supabase.js` that uses `localStorage` or `sessionStorage` depending on a `wb-remember` flag;
  - the checkbox on the sign-in screen, with a reusable `Checkbox` component in `ui.jsx`.
- **What I kept, what I changed, and why:** I kept it, because of three details that are easy to get wrong:
  - the flag is saved before signing in;
  - signing out clears both stores;
  - a missing flag counts as "remembered", so existing users were not all signed out when it went live.

  This is also the AI-written piece I explain in section 3.
- **Commit:** [dfa3599](https://github.com/JustinNeri/WorkBud/commit/dfa3599)

### 1.13 Profile pictures

- **Date and tool:** September 19, 2026, Claude (committed at the end of Week 1, after my Week 1 report was written, so it is reported in my Week 2 report)
- **What I asked:** how to let users upload a profile picture from settings.
- **What it gave back:**
  - `src/lib/avatar.js`, which rejects oversized files, respects the rotation tag phone cameras write, and centre-crops each photo to a square and shrinks it to a small JPEG before uploading;
  - `Avatar.jsx`, which shows the user's initial when there is no picture;
  - the upload flow in `SettingsSheet.jsx`;
  - an `avatars` storage bucket with per-user upload policies and an `avatar_path` column.
- **What I kept, what I changed, and why:** I kept the resize-before-upload step. A phone photo is 3 to 8 MB, and this app is used on mobile data, so shrinking it to usually under 60 KB before sending saves users real money for a picture shown at 44 pixels. One part was not right, and I only found it later: the bucket's read policy lets signed-out users list every file. My security checklist caught it on September 27 (see 1.15). It stayed open until October 8, when the policy was replaced with one limited to each user's own folder
- **Commits:** [5779d1d](https://github.com/JustinNeri/WorkBud/commit/5779d1d), fixed in [9e2eca7](https://github.com/JustinNeri/WorkBud/commit/9e2eca7)

### 1.14 React Router

- **Date and tool:** September 20, 2026, Claude (committed at the end of Week 1, after my Week 1 report was written, so it is reported in my Week 2 report)
- **What I asked:** how to move the app from one screen with sheets on top to real URLs, so the phone back button would stop closing the whole app. This was the first item on my Week 1 "What is left" list.
- **What it gave back:** an explanation and an example, not the finished code:
  - that `react-router` needs `BrowserRouter` around the app in `main.jsx`;
  - how to lay out routes in `App.jsx`, and the idea of a guard: a wrapper route that checks the session and either shows the page or redirects;
  - that the sign-in screen could read sign-in or sign-up from the URL instead of from state.
- **What I kept, what I changed, and why:** I wrote the routing myself from that explanation (section 3): the routes at `/login`, `/signup`, `/forgot-password` and `/dashboard`, and the two guards, `RequireSession` and `GuestOnly`. I kept the guard idea, because the guards replaced the old "if signed in, show this, otherwise show that" logic with something clearer. I also kept the redirect that remembers where you were headed: if a signed-out user opens `/dashboard`, they go to `/login`, and after signing in they land back on the page they wanted instead of always the dashboard.
- **Commit:** [6b44022](https://github.com/JustinNeri/WorkBud/commit/6b44022)

### 1.15 Security checklist

- **Date and tool:** September 27, 2026, Claude (Claude Code)
- **What I asked:** to fill in the unit's security checklist for my project, with evidence for every row.
- **What it gave back:** a completed `SECURITY-CHECKLIST.md`. It did not just fill in the rows: it searched my whole git history for passwords, keys and connection strings, and it tested Row Level Security live while signed out (all five tables returned nothing, and an insert was refused). That test found a real problem: anyone signed out can list my `avatars` storage bucket and see every user's ID.
- **What I kept, what I changed, and why:** I kept the evidence it could prove from the repo. I checked the rows only I could confirm myself: row 6 (my Vercel environment settings), row 30 (the logo is my own) and row 31 (the repo is public on purpose). I kept two honest "No" answers instead of turning them into Yes: the database API is reachable from the internet by design, and my personal email is the author address on every commit. (I fixed both later, on October 3. I turned on Supabase network restrictions so the direct database port is closed and only the HTTPS API the app uses is reachable, which made row 14 a Yes. I also rewrote the history so commits use my GitHub no-reply address, which made row 27 a Yes.)
- **Commit:** [7ce34bb](https://github.com/JustinNeri/WorkBud/commit/7ce34bb)

### 1.16 The Express API server

- **Date and tool:** October 3, 2026, Claude (Claude Code)
- **What I asked:** the finals rubric grades a server with endpoints, and WorkBud had none, because the browser talked to Supabase directly. I asked Claude whether the project needed a server, and then to implement one.
- **What it gave back:**
  - an Express 5 server in `server/`, with REST routes for the profile, jobs, daily logs (with their expenses nested inside), milestones and account deletion, plus a public `/api/health` check;
  - `server/auth.js`, which checks the Supabase access token on every data route and then queries the database as that user, so Row Level Security still applies;
  - `server/validate.js`, which checks every request body and answers 400 naming the field that failed;
  - `server/errors.js`, which turns database errors into status codes without leaking their details;
  - `src/lib/api.js`, and `useWorkbud.js`, `Onboarding.jsx` and `DeleteAccountSheet.jsx` changed to call the API instead of Supabase;
  - `api/index.js` and a `vercel.json` rewrite so the same server runs on Vercel, and updates to the README and security checklist.
- **What I kept, what I changed, and why:** Claude proposed the design and consulted me on it, and I agreed to it before keeping the code. This is the largest piece of AI-written code in the project. The design choices I agreed to, and why:
  - the server forwards the signed-in user's token instead of using a service-role key, so the Row Level Security policies I wrote still check every query and there is no new secret to protect;
  - sign-in stays with Supabase Auth, so the signup codes, password reset and "Remember me" that already worked were not rewritten in the last week;
  - a day's `amount_spent` is never taken from the browser, so the total can never disagree with the items. In this first version the server added up the expense list it was sent. Since October 8 the database function `save_log()` works it out from the rows it stored 

  Claude could not sign in, so it only tested the signed-out and bad-input paths. I tested the signed-in flows myself in the browser, on localhost and on the Vercel preview: adding, editing and deleting a log with expenses, a job and a milestone, changing the profile, and onboarding and deleting a test account.
- **Commit:** [fb4eb62](https://github.com/JustinNeri/WorkBud/commit/fb4eb62)



---

## 2. Where the AI got it wrong

### 2.1 It described my delete-job bug wrongly

- **What it gave me:** I used Claude to help with my Week 1 report and journal by giving me key points and a summarised form of my work to write from. In that summary, Claude described the delete-job bug as foreign keys between `jobs`, `daily_logs` and `expenses` blocking the delete.
- **What was wrong with it:** it summarised that from the commit message "fix delete job" without reading the diff. The actual fix shows the foreign keys were fine: they cascade, so deleting a job removes its logs and expenses automatically. The real bugs were different. The delete button sat inside the form without `type="button"`, so confirming a delete also submitted a save of the job being deleted. You could not delete your last job. And after a delete, the dashboard showed "No job yet" even when other jobs were still listed.
- **What I did instead:** it was caught when Claude went back to read the real diff while preparing this file. My Week 1 report and journal were already submitted with the wrong description, so this entry is the correction: the commit is the record of what was actually wrong, and I now describe bugs from the code, not the commit message.
- **Commit:** [0aa55ea](https://github.com/JustinNeri/WorkBud/commit/0aa55ea)

### 2.2 The signup code box only accepted 6 digits

- **What it gave me:** the first `OtpStep.jsx` had the code length fixed at 6 (`CODE_LENGTH = 6`). The box cut off anything longer and submitted by itself on the sixth digit.
- **What was wrong with it:** Supabase lets each project choose a code length from 6 to 10 digits, and mine sends 8. So every real code was cut short, and verification could never succeed. The AI had assumed the usual case instead of checking the project's setting.
- **What I did instead:** I caught it by testing a real signup, not by reading the code. It was fixed the same day: the box now accepts 6 to 10 digits, and it waits for the button instead of submitting by itself, because with a variable length there is no reliable moment to know the code is complete.
- **Commits:** [adc5631](https://github.com/JustinNeri/WorkBud/commit/adc5631), fixed in [0194caa](https://github.com/JustinNeri/WorkBud/commit/0194caa)

### 2.3 The export added up hours without rounding

- **What it gave me:** in `src/lib/export.js`, the total on the exported time record was a plain sum of each day's hours.
- **What was wrong with it:** decimal hours like 15.83 cannot be stored exactly as floating-point numbers, so the sum drifts. My exported record showed "Hours completed: 209.32999999999998" instead of 209.33, on the one document that is meant to be handed to a coordinator.
- **What I did instead:** I noticed it in my own screenshot while preparing the documentation, listed it as a known issue, and then fixed it by rounding the total to two decimals.
- **Commits:** [f3b7ebe](https://github.com/JustinNeri/WorkBud/commit/f3b7ebe), fixed in [6341689](https://github.com/JustinNeri/WorkBud/commit/6341689)

### 2.4 The API server answered 500 for mistakes that were the caller's

- **What it gave me:** the error handler in the Express server Claude wrote (`server/errors.js`, see 1.16). It recognised its own `HttpError`, a body that was not valid JSON, and a body that was too large. Everything else became a 500 with "Something went wrong on our side."
- **What was wrong with it:** Express and its body parser also raise errors for other bad requests, and those already carry a 4xx status. The handler ignored that status. A body sent with an unknown charset came back 500 instead of 415, and a URL with a broken escape such as `/api/jobs/%E0%A4%A` came back 500 instead of 400. A 500 tells the caller the server is broken when the request was. The same gap had a second effect: when `npm start` serves the built app, a broken page URL never reached the handler at all and got Express's default error page, which printed a stack trace with file paths.
- **What I did instead:** by sending the server those requests, not by reading the code. The handler now passes a 4xx status through with its own short message, and `server/index.js` registers the handler again after the page routes. Both cases now return one line of JSON with the right status.
- **Commits:** [fb4eb62](https://github.com/JustinNeri/WorkBud/commit/fb4eb62), fixed in [9e2eca7](https://github.com/JustinNeri/WorkBud/commit/9e2eca7)

### 2.5 The avatars policy let anyone list every user's folder

- **What it gave me:** with the profile picture feature (1.13), a storage policy named `avatars_read_all` that gave both signed-in and signed-out users SELECT on the whole `avatars` bucket.
- **What was wrong with it:** the policy was not needed for what it seemed to be for. The bucket is public, so pictures load through public URLs without any policy. What the policy actually allowed was listing the bucket, and each user's folder is named after their user ID, so anyone could read every account's ID without signing in.
- **What I did instead:** my security checklist caught it on September 27, and I listed it as a known issue but left it open. On October 8 it was replaced with `avatars_select_own`, which lets a signed-in user see only their own folder (the app needs that to remove old pictures) and gives signed-out visitors nothing.
- **Commits:** [5779d1d](https://github.com/JustinNeri/WorkBud/commit/5779d1d), fixed in [9e2eca7](https://github.com/JustinNeri/WorkBud/commit/9e2eca7)

---

## 3. Who wrote what

### Parts I wrote myself

In the first commit, [32e697a](https://github.com/JustinNeri/WorkBud/commit/32e697a), Claude's draft was the two tables and their columns (entry 1.1). The first four items below are what I typed in that file myself.

A note on all of these: "wrote myself" means I typed the code and made the decisions. It does not mean I never asked for help. When I got stuck, I asked the AI to explain something or to help me find a bug, and each item below says where that happened.

**Row Level Security policies** (`supabase/schema.sql`, from [32e697a](https://github.com/JustinNeri/WorkBud/commit/32e697a))
Every table has a policy for select, insert, update and delete, each checking `auth.uid() = user_id`, so the database itself refuses to show or change anyone else's rows. `profiles` has no insert or delete policy, because those rows only come from the signup trigger. The `milestones` policies came later and were generated by Claude to the same pattern (1.11).

**The signup trigger** (`supabase/schema.sql`, `handle_new_user`, from [32e697a](https://github.com/JustinNeri/WorkBud/commit/32e697a))
When a user is added to `auth.users`, this trigger creates their `profiles` row. It lives in the database so a user can never be signed in without a profile.

**Database validation rules** (`supabase/schema.sql`, the `check` constraints, from [32e697a](https://github.com/JustinNeri/WorkBud/commit/32e697a) and [99f39b3](https://github.com/JustinNeri/WorkBud/commit/99f39b3))
Hours must be between 0 and 24, money and targets cannot be negative, a job name is 1 to 60 characters, and age is 10 to 120. They live in the database because anyone can skip a form and send a request directly. The break and expense-label rules are not mine: the AI wrote them with the columns in entry 1.5.

**Table permissions and the `updated_at` trigger** (`supabase/schema.sql`, the `grant` lines and `set_updated_at`, from [32e697a](https://github.com/JustinNeri/WorkBud/commit/32e697a) and [fa45b49](https://github.com/JustinNeri/WorkBud/commit/fa45b49))
The grants give a signed-in user only the actions each table needs: `profiles` allows select and update only. As I first wrote them they narrowed nothing, because Supabase grants everything by default. The `revoke all` lines that fixed this are Claude's, added in [9e2eca7](https://github.com/JustinNeri/WorkBud/commit/9e2eca7). `set_updated_at` stamps the time on every update, so no part of the app can forget to.

**The `jobs` table and multi-job design** (`supabase/schema.sql`, from [99f39b3](https://github.com/JustinNeri/WorkBud/commit/99f39b3))
Each placement is a row in `jobs` with its own target hours, budgets and deadline, so one person can track two placements at once. Every log belongs to a job with `on delete cascade`, so deleting a job removes its logs and expenses.

**The logo and app icons** (`design/logo/`, `public/`, drawn in `src/components/Logo.jsx`, from [88676b3](https://github.com/JustinNeri/WorkBud/commit/88676b3))
My own design: one zigzag line that reads as the W in WorkBud and as a line on a chart, drawn as an hours stroke handing off to a money stroke. It is exported as a mark, an icon, a lockup and a maskable version for Android.

**What the app tracks: categories, occupations and currencies** (`src/lib/format.js`, from [99f39b3](https://github.com/JustinNeri/WorkBud/commit/99f39b3) and [f3b7ebe](https://github.com/JustinNeri/WorkBud/commit/f3b7ebe))
Three lists that are my decisions: five expense categories an OJT student actually pays for, nine occupations (a placement gets a deadline countdown, ongoing work gets a month-to-date view), and ten currencies with PHP as the default.

**Logging past dates** (`src/components/LogSheet.jsx`, from [e89aafa](https://github.com/JustinNeri/WorkBud/commit/e89aafa))
Most students find the app partway through a placement and need earlier weeks to count. I asked Claude how it should be done (entry 1.10) and implemented it myself: the date field has today as its maximum, so future dates stay blocked.

**The visual design and the colour tokens** (`src/index.css` and the components, from [7465711](https://github.com/JustinNeri/WorkBud/commit/7465711), [9656071](https://github.com/JustinNeri/WorkBud/commit/9656071) and [4820302](https://github.com/JustinNeri/WorkBud/commit/4820302))
The look of the app is my design, and I typed the styling myself. Colours used to be hex values repeated in each component. They are now named tokens in `src/index.css` (`brand`, `money`, `warn`, `over`), so a colour is changed in one place.

**Deployment on Vercel** (`vercel.json`, from [464ff06](https://github.com/JustinNeri/WorkBud/commit/464ff06))
I created the Vercel project, connected the repository so every push deploys, and set the Supabase values as environment variables. The `vercel.json` file itself was written with Claude.

**Routing and the route guards** (`src/App.jsx`, `src/main.jsx`, [6b44022](https://github.com/JustinNeri/WorkBud/commit/6b44022))
I asked Claude how routing should be set up (entry 1.14) and wrote it myself. `RequireSession` sends a signed-out visitor to `/login` and remembers where they were going. `GuestOnly` sends a signed-in user on to that page or to `/dashboard`. The rule for who can see a page lives in the guards, not on every screen.

**The activity feed preview and month filter** (`src/components/ActivityFeed.jsx`, from [2990956](https://github.com/JustinNeri/WorkBud/commit/2990956), [9300ef0](https://github.com/JustinNeri/WorkBud/commit/9300ef0) and [42d73f6](https://github.com/JustinNeri/WorkBud/commit/42d73f6))
I wrote this myself. When I got stuck on one bug, the list going empty after switching jobs with a month selected, I asked Claude why. The feed shows the five newest days with a "show all" button, so a long placement does not turn the dashboard into one long list. The month chips are built from the months that actually have entries, so there is never a chip that leads to nothing, and they only appear once there is more than one month. Picking a month also shows that month's hours and days worked. If the chosen month does not exist for the current job, the feed falls back to "all" instead of showing an empty list.

**Setting up the Supabase project** (Supabase dashboard; the app code that depends on it is in [adc5631](https://github.com/JustinNeri/WorkBud/commit/adc5631) and [0194caa](https://github.com/JustinNeri/WorkBud/commit/0194caa), and the steps are written down in README section 2.6)
I created the Supabase project and configured it myself in the dashboard. Dashboard settings are not files, so they have no commit of their own. The commits above are the code that only works because of them. That code was written with Claude's help (entries 1.2 and 2.2); the configuration in Supabase is the part I did myself. I turned on email sign-in, set signups to be confirmed by an emailed code, and edited the "Confirm signup" and "Reset password" email templates to send `{{ .Token }}`, because the default template sends a link and no code. My project sends 8-digit codes, which is why the code box had to be changed to accept 6 to 10 digits (entry 2.2). On October 3 I turned on network restrictions so the direct database port is closed (checklist row 14), and on October 8 I ran the schema update in the SQL Editor myself.

### My idea, written by AI

**The catch-up budget** (`src/components/CatchUpCard.jsx`, `src/hooks/useWorkbud.js`, from [d5df02a](https://github.com/JustinNeri/WorkBud/commit/d5df02a), rule changed in [c66207f](https://github.com/JustinNeri/WorkBud/commit/c66207f))
This feature was my idea, and Claude wrote the code for it (entry 1.10). Telling someone they are 410 pesos over budget does not tell them what to do, so the card spreads the overspend across the days left in the month and shows the daily amount that gets them back to level. The first version added up only the days that went over and ignored the days that came in under, so a cheap day never reduced what was owed. I had it changed to a net position: what the daily budget has allowed so far against what was actually spent, counted from the first day logged that month, so someone who starts mid-month does not get credit for days they were not tracking.

### The AI-written piece I understand best

**The "Remember me" storage adapter** (`src/lib/supabase.js`, [dfa3599](https://github.com/JustinNeri/WorkBud/commit/dfa3599))
supabase-js decides where to save the login session once, when the client is created, so a checkbox cannot just be passed to the sign-in call. The adapter works around that. It gives Supabase a custom storage object that, on every read and write, checks a `wb-remember` flag and uses `localStorage` (you stay signed in) or `sessionStorage` (the session ends when the browser closes). We kept it because of three details it gets right:
- the flag is saved *before* signing in, because the adapter reads it at write time;
- sign-out clears both stores, so no copy of the token is left behind;
- a missing flag counts as "remembered", so users whose sessions predate the feature were not all signed out on deploy.

Every storage call is also wrapped in `try`/`catch`, because some private-browsing modes throw instead of storing.
