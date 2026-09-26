# AI usage

How I used AI to build WorkBud, where it got things wrong, and which parts
are mine.

**How I work with AI:** I write the code myself first. When something does
not work, or I want it done in a cleaner or more efficient way, I ask the AI
to help me fix or optimise it. For the Supabase backend, the AI gave me an
initial draft and the overall workflow of the system, and I built the
backend from there.

**Tools:** Claude (Anthropic) for most of the work. On a couple of earlier bug fixes I also used ChatGPT (OpenAI) and Gemini (Google) alongside Claude.

---

## 1. How I used AI

### 1.1 Screenshots guide for the documentation

- **Date and tool:** September 20, 2026, Claude (Claude Code); committed September 22
- **What I asked:** where to put the screenshots my documentation needed, so they would show up in the repo.
- **What it gave back:** a `docs/screenshots/` folder with a `README.md` listing the exact filename for each screen (`01-signin.png` to `06-installed-pwa.png`), what to capture in each, and how to take mobile-sized screenshots with the browser's device toolbar.
- **What I kept, what I changed, and why:** I kept the folder and the capture steps, because the device-toolbar tip gave me consistent phone-sized shots. I did not keep its plan of linking the images from the README; I pasted the screenshots straight into my Word documentation instead (see 2.2).
- **Commit:** [0e1baba](https://github.com/JustinNeri/WorkBud/commit/0e1baba)

### 1.2 Security checklist

- **Date and tool:** September 27, 2026, Claude (Claude Code)
- **What I asked:** to fill in the unit's security checklist for my project, with evidence for every row.
- **What it gave back:** a completed `SECURITY-CHECKLIST.md`. It did not just fill in the rows: it searched my whole git history for passwords, keys and connection strings, and it tested Row Level Security live while signed out (all five tables returned nothing, and an insert was refused). That test found a real problem: anyone signed out can list my `avatars` storage bucket and see every user's ID.
- **What I kept, what I changed, and why:** I kept the evidence it could prove from the repo. I checked the rows only I could confirm myself: row 6 (my Vercel environment settings), row 30 (the logo is my own) and row 31 (the repo is public on purpose). I kept two honest "No" answers instead of turning them into Yes: the database API is reachable from the internet by design, and my personal email is the author address on every commit.
- **Commit:** [20c5618](https://github.com/JustinNeri/WorkBud/commit/20c5618)

### 1.3 Milestones and hour badges

- **Date and tool:** September 15, 2026, Claude
- **What I asked:** help adding checkpoints to each job (orientation, midterm evaluation, narrative report) with optional due dates and hour goals, plus some kind of progress marker as the hours add up, and to include them in the export.
- **What it gave back:**
  - a `milestones` table with its own Row Level Security policies;
  - `MilestoneSheet.jsx` for creating and editing milestones;
  - `MilestonesCard.jsx`, which flags overdue and due-this-week items and shows automatic badges at 25, 50, 75 and 100 percent of the target, each with the date it was reached or a projected date at the current pace;
  - a reworked `src/lib/export.js`.
- **What I kept, what I changed, and why:** I kept the badges being worked out in the app instead of stored in the database. That way they can never disagree with the hours actually logged, because they are recalculated from the logs every time. I restyled the card a few days later to fit the new colour tokens.
- **Commits:** [7b9ca83](https://github.com/JustinNeri/WorkBud/commit/7b9ca83), restyled in [442fda8](https://github.com/JustinNeri/WorkBud/commit/442fda8)

### 1.4 "Remember me" on sign-in

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
- **Commit:** [285118d](https://github.com/JustinNeri/WorkBud/commit/285118d)

### 1.5 Profile pictures

- **Date and tool:** September 19, 2026, Claude (committed at the end of Week 1, after my Week 1 report was written, so it is reported in my Week 2 report)
- **What I asked:** how to let users upload a profile picture from settings.
- **What it gave back:**
  - `src/lib/avatar.js`, which rejects oversized files, respects the rotation tag phone cameras write, and centre-crops each photo to a square and shrinks it to a small JPEG before uploading;
  - `Avatar.jsx`, which shows the user's initial when there is no picture;
  - the upload flow in `SettingsSheet.jsx`;
  - an `avatars` storage bucket with per-user upload policies and an `avatar_path` column.
- **What I kept, what I changed, and why:** I kept the resize-before-upload step. A phone photo is 3 to 8 MB, and this app is used on mobile data, so shrinking it to usually under 60 KB before sending saves users real money for a picture shown at 44 pixels. One part was not right, and I only found it later: the bucket's read policy lets signed-out users list every file. My security checklist caught it on September 27 (see 1.2), and it is not fixed yet.
- **Commit:** [98c739f](https://github.com/JustinNeri/WorkBud/commit/98c739f)

### 1.6 React Router

- **Date and tool:** September 20, 2026, Claude (committed at the end of Week 1, after my Week 1 report was written, so it is reported in my Week 2 report)
- **What I asked:** how to move the app from one screen with sheets on top to real URLs, so the phone back button would stop closing the whole app. This was the first item on my Week 1 "What is left" list.
- **What it gave back:**
  - `react-router`, with `BrowserRouter` in `main.jsx`;
  - routes at `/login`, `/signup`, `/forgot-password` and `/dashboard` in `App.jsx`, guarded by `RequireSession` and `GuestOnly`;
  - a sign-in screen that switches between sign-in and sign-up by changing the URL.
- **What I kept, what I changed, and why:** I kept the guards, because they replaced the old "if signed in, show this, otherwise show that" logic with something clearer. I also kept the redirect that remembers where you were headed: if a signed-out user opens `/dashboard`, they go to `/login`, and after signing in they land back on the page they wanted instead of always the dashboard.
- **Commit:** [05176af](https://github.com/JustinNeri/WorkBud/commit/05176af)

---

## 2. Where the AI got it wrong

### 2.1 It described my delete-job bug wrongly

- **What it gave me:** while helping me write my Week 1 report and journal, Claude described the delete-job bug as foreign keys between `jobs`, `daily_logs` and `expenses` blocking the delete.
- **What was wrong with it:** it wrote that from the commit message "fix delete job" without reading the diff. The actual fix shows the foreign keys were fine: they cascade, so deleting a job removes its logs and expenses automatically. The real bugs were different. The delete button sat inside the form without `type="button"`, so confirming a delete also submitted a save of the job being deleted. You could not delete your last job. And after a delete, the dashboard showed "No job yet" even when other jobs were still listed.
- **What I did instead:** it was caught when Claude went back to read the real diff while preparing this file. My Week 1 report and journal were already submitted with the wrong description, so this entry is the correction: the commit is the record of what was actually wrong, and I now describe bugs from the code, not the commit message.
- **Commit:** [0651c60](https://github.com/JustinNeri/WorkBud/commit/0651c60)

### 2.2 The screenshots guide promised links that do not exist

- **What it gave me:** the guide in `docs/screenshots/README.md` says to use its exact filenames "so the links in the project README resolve without editing".
- **What was wrong with it:** there are no such links. The README was never updated to show those images, so the file tells a reader something that is not true.
- **What I did instead:** I put my screenshots directly into my Word documentation, which is where they are graded, rather than relying on links that were never written.
- **Commit:** [0e1baba](https://github.com/JustinNeri/WorkBud/commit/0e1baba)

### 2.3 Its first security checklist draft claimed things it could not back up

- **What it gave me:** a first draft of the checklist whose row 27 said my email was on "all 82 commits", and whose "Anything I found and fixed" section did not say whether the avatars problem had actually been fixed.
- **What was wrong with it:** 82 was only the number of commits on my computer; GitHub had more, so the number was wrong. And the checklist rules say any answer the repository contradicts scores nothing. Leaving the fix status unsaid also made it read as though the problem was handled when it was not.
- **What I did instead:** when I asked it to re-check the checklist, the count was replaced with "every commit", which cannot go out of date, and the section now says plainly that the avatars policy is not fixed yet and what the fix is.
- **Commit:** [20c5618](https://github.com/JustinNeri/WorkBud/commit/20c5618)

---

## 3. Who wrote what

### Parts I wrote myself

**Row Level Security policies** (`supabase/schema.sql`, from [510ccde](https://github.com/JustinNeri/WorkBud/commit/510ccde))
Every table has RLS switched on, with a separate policy for select, insert, update and delete, and each one checks `auth.uid() = user_id`. That means the database itself refuses to show or change anyone else's rows, whatever the browser sends. This matters because WorkBud has no server of its own: the browser talks to Supabase directly with a key that is public. So the rule cannot live in app code a user could bypass; it has to live in the database. `profiles` deliberately has no insert or delete policy, because those rows should only ever come from the signup trigger. I tested it signed out: every table returned nothing, and an insert was refused.

**The signup trigger** (`supabase/schema.sql`, `handle_new_user`, from [510ccde](https://github.com/JustinNeri/WorkBud/commit/510ccde))
When someone signs up, Supabase adds them to `auth.users`, and this trigger immediately creates their `profiles` row. It is done in the database rather than the app so there is never a moment where a user is signed in but has no profile. If the app created it instead, a dropped connection between the two steps would leave a broken account.

**The `jobs` table and multi-job design** (`supabase/schema.sql`, from [736c94f](https://github.com/JustinNeri/WorkBud/commit/736c94f))
Each placement is a row in `jobs` with its own target hours, budgets and deadline, and every daily log belongs to one job through `job_id ... on delete cascade`. The cascade means deleting a job cleanly removes its logs and their expenses, with no orphaned rows. Targets live on the job instead of the profile so one person can track two placements at once.

### The AI-written piece I understand best

**The "Remember me" storage adapter** (`src/lib/supabase.js`, [285118d](https://github.com/JustinNeri/WorkBud/commit/285118d))
supabase-js decides where to save the login session once, when the client is created, so a checkbox cannot just be passed to the sign-in call. The adapter works around that. It gives Supabase a custom storage object that, on every read and write, checks a `wb-remember` flag and uses `localStorage` (you stay signed in) or `sessionStorage` (the session ends when the browser closes). We kept it because of three details it gets right:
- the flag is saved *before* signing in, because the adapter reads it at write time;
- sign-out clears both stores, so no copy of the token is left behind;
- a missing flag counts as "remembered", so users whose sessions predate the feature were not all signed out on deploy.

Every storage call is also wrapped in `try`/`catch`, because some private-browsing modes throw instead of storing.
