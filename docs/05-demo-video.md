# Demo video

Screen recorded, in my own voice, with the slides and the app on screen.

**Link:** [WorkBud video presentation](https://drive.google.com/drive/folders/1ws2guOP-WJ-NwuA1P8lmsicYdH91E59I?usp=sharing)

The link opens a Google Drive folder that anyone can view. It holds the video
(`WorkBud_Video_Presentation.mp4`), the slide deck
(`PRESENTATION SLIDE_WORKBUD.pdf`) and the square image
(`SquareImage_WorkBud.png`).

## Timeline

The video runs 5:23. The times below are estimated from the script's word
count spread across that runtime, so each one is within a few seconds, not
exact.

| Time | Slide | What is said |
|---|---|---|
| 0:00 | 1. Title | Who I am, and what WorkBud is. |
| 0:05 | 2. Problem | 300 to 600 hours tracked on paper, expenses not tracked at all, and the three questions that stay unanswered. |
| 0:27 | 3. Demo | The recorded walkthrough: log a day, add expenses, dashboard, milestones, budget, save to catch up, where it goes, export. |
| 1:25 | 4. Tech | React PWA, Express API server, Supabase with five tables. |
| 1:43 | 5. `requireAuth` code | The check every data route passes, and why the server holds no secret key. |
| 2:06 | 6. Row Level Security code | The database policies as a second layer behind the server. |
| 2:14 | 7. AI usage, top of the file | How I work with AI: ask for the structure, build it, test it, ask again. |
| 2:50 | 8. The Express API server entry | The biggest piece AI wrote, and how I tested it. |
| 3:11 | 9. `rememberAwareStorage` code | The AI-written piece I understand best. |
| 3:29 | 10. Where the AI got it wrong | The export total it did not round, and the 6-digit code box. I caught both. |
| 4:06 | 11. Signup trigger and RLS code | What Claude drafted and I checked, the parts I wrote myself, and my rule for using AI. |
| 4:34 | 12. Challenges | Overnight shifts, dates one day off, the public key, and checking AI against the real output. |
| 4:59 | 13. What comes next | Tests, error messages, an offline save queue. Ends at 5:23. |

By part:

| Part | Slides | Time | Length |
|---|---|---|---|
| What it is and who it is for | 1 to 2 | 0:00 to 0:27 | about 0:27 |
| The main flow | 3 | 0:27 to 1:25 | about 0:58 |
| How it is built, and the code | 4 to 6 | 1:25 to 2:14 | about 0:49 |
| How I used AI | 7 to 11 | 2:14 to 4:34 | about 2:20 |
| What was hard, and what comes next | 12 to 13 | 4:34 to 5:23 | about 0:49 |

## The structure

### 1. What it is and who it is for

WorkBud is an OJT hours and expense tracker. OJT students need 300 to 600 hours
and a DTR to hand in at the end. Most of us track that on paper with no running
total, and fare and meals are not tracked at all. That leaves three questions
unanswered:

- How many hours are left?
- Will I finish on time?
- What is it costing me?

WorkBud answers them with one entry a day, in under a minute.

### 2. The main flow, end to end

| Step | What the video shows |
|---|---|
| Log a day | Time in, time out, break and a note. The app works out the hours. |
| Add expenses | What I spent, each with a label, a category and an amount. |
| Dashboard | On save, the ring, the pace and the expected finish date update. |
| Milestones | My own checkpoints, like the midterm evaluation, plus hour badges at 25, 50, 75 and 100 percent. |
| Budget | The month's total: what I have spent and what is left. |
| Save to catch up | I went over my daily budget, so it tells me how much to save each day to be back on budget by the end of the month. |
| Where it goes | Spending ranked by category, with the share of each. |
| Export | A time log for my coordinator, printed or as a CSV. |

### 3. One thing I am proud of technically

How it is built: the front end is a React PWA, built with Vite and Tailwind. It
calls an Express API server, which checks the user's token and validates every
input. The server then talks to Supabase, where the data sits in five tables.

The decision I open the code for is the check every data route passes,
`requireAuth` in [server/auth.js](../server/auth.js). If there is no Bearer
token, the server answers 401. Otherwise it verifies the token, then queries the
database as that user, not with an admin key. I kept that design because no
secret key has to live on the server, and my own security rules still apply: the
Row Level Security policies in [server/db/schema.sql](../server/db/schema.sql)
check every query as a second layer behind the server.

### 4. How I used AI

I built WorkBud with help from AI, mostly Claude, and wrote all of it down in
[AI-USAGE.md](../AI-USAGE.md). The video walks through that file.

- **My way of working.** I ask the AI what the structure of a feature should
  be, with an example. I build the feature with that as my guide and test it.
  If something goes wrong, or I want a cleaner version, I ask again.
- **The biggest piece AI wrote.** The Express API server (the 2026-10-03
  entry). The project needed a server with endpoints, Claude proposed the design, and I
  agreed to it. I tested the signed-in flows myself, on localhost and on
  Vercel.
- **The AI-written piece I understand best.** The "Remember me" storage
  adapter in [client/src/lib/supabase.js](../client/src/lib/supabase.js). It
  checks a flag on every read and write. Ticked means `localStorage`, and you
  stay signed in. Unticked means `sessionStorage`, and you are signed out when
  the browser closes.
- **Where the AI got it wrong.** The AI wrote my export, and it added up each
  day's hours with a plain sum. Decimal hours cannot be stored exactly, so the
  total drifted: my time record showed 209.32999999999998 instead of 209.33,
  on the one document I hand to my coordinator. I noticed it in my own
  screenshot and fixed it by rounding the total to two decimals. A second
  case: the AI's code box was fixed at 6 digits, but my project sends 8, so no
  real code could pass. I caught it by testing a real signup, and the box now
  accepts 6 to 10 digits.
- **My part.** Claude drafted the Row Level Security policies and the signup
  trigger, and I checked them, changed them and ran them myself. The `jobs`
  table that lets one person track several placements, the routing and the
  activity feed I wrote myself, and I designed the logo. Who wrote each part
  is recorded in [AI-USAGE.md](../AI-USAGE.md), section 3.
- **My rule.** AI can suggest, but I decide what the app needs, and I test
  everything it gives me.

### 5. What was hard, and what I would do next

What was hard:

- Overnight shifts came out negative. The fix adds 24 hours, so 10 PM to 6 AM
  is now 8 hours.
- Dates showed one day off.
- The database key is public, so the protection has to live in the database
  rules.
- The AI's export total was off by a rounding error, so now I check what it
  gives me against the real output.

What comes next, as said in the video:

- unit tests for the time maths
- clear error messages when a save fails
- an offline save queue, so a day logged with no signal syncs later

## Before recording

- [x] Opened the site five minutes early so the API was awake
- [x] Recorded the deployed URL, not `localhost`
- [x] Closed other tabs, and checked for personal messages, other students'
      names, and any `.env` file open in an editor
- [x] Seeded realistic data
- [x] Did a full practice run

## The fallback

The demo part of the video is a recording of the working app that I talk over,
so the walkthrough does not depend on the site being awake at that moment. If
the live site is down when it is being marked, the same flow is in that
recording, and the six screens are in [assets/](assets/) and in the main
[README](../README.md).
