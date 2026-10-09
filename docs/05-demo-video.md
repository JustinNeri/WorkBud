# Demo video

Screen recorded, in my own voice, with the slides and the app on screen.

**Link:** [WorkBud video presentation](https://drive.google.com/drive/folders/1ws2guOP-WJ-NwuA1P8lmsicYdH91E59I?usp=sharing)

The link opens a Google Drive folder that anyone can view. It holds the video
(`WorkBud_Video_Presentation.mp4`), the slide deck
(`PRESENTATION SLIDE_WORKBUD.pdf`) and the square image
(`SquareImage_WorkBud.png`).

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
- **The biggest piece AI wrote.** The Express API server (entry 1.16). The
  project needed a server with endpoints, Claude proposed the design, and I
  agreed to it. I tested the signed-in flows myself, on localhost and on
  Vercel.
- **The AI-written piece I understand best.** The "Remember me" storage
  adapter in [client/src/lib/supabase.js](../client/src/lib/supabase.js). It
  checks a flag on every read and write. Ticked means `localStorage`, and you
  stay signed in. Unticked means `sessionStorage`, and you are signed out when
  the browser closes.
- **Where the AI got it wrong.** It described my delete-job bug from the commit
  message without reading the code, and the description was wrong. The real bug
  was a delete button missing `type="button"`, so it also submitted the form. A
  second case I caught myself: the AI's code box was fixed at 6 digits, but my
  project sends 8, so no real code could pass. I caught it by testing a real
  signup, and the box now accepts 6 to 10 digits.
- **My part.** The `jobs` table that lets one person track several placements,
  and the logo, are mine. The Row Level Security policies, the signup trigger,
  the validation rules and the table permissions are the database rules I went
  through, changed and ran myself. Who drafted each one is recorded in
  [AI-USAGE.md](../AI-USAGE.md), section 3.
- **My rule.** AI can suggest, but I decide what the app needs, and I test
  everything it gives me.

### 5. What was hard, and what I would do next

What was hard:

- Overnight shifts came out negative. The fix adds 24 hours, so 10 PM to 6 AM
  is now 8 hours.
- Dates showed one day off.
- The database key is public, so the protection has to live in the database
  rules.
- AI got one of my bugs wrong, so now I check everything against the code.

What comes next, as said in the video:

- unit tests for the time maths
- clear error messages when a save fails
- locking down the avatars bucket
- an offline save queue, so a day logged with no signal syncs later

## Before recording

- [ ] Opened the site five minutes early so the API was awake
- [ ] Recorded the deployed URL, not `localhost`
- [ ] Closed other tabs, and checked for personal messages, other students'
      names, and any `.env` file open in an editor
- [ ] Seeded realistic data
- [ ] Did a full practice run

## The fallback

The demo part of the video is a recording of the working app that I talk over,
so the walkthrough does not depend on the site being awake at that moment. If
the live site is down when it is being marked, the same flow is in that
recording, and the six screens are in [assets/](assets/) and in the main
[README](../README.md).
