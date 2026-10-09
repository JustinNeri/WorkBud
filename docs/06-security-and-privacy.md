# Security and privacy checklist

Worked through before the repository went public, and again before submitting.
A ticked box has its evidence beside it. A box left empty is one I could not
honestly tick, with the reason.

The longer, row-by-row version with 31 rows of evidence is
[SECURITY-CHECKLIST.md](../SECURITY-CHECKLIST.md) at the repository root.

## Before the first push

- [x] `.gitignore` includes `.env`, and `git check-ignore -v .env` confirms it.
      It answers `.gitignore:2:.env` for `.env`, `client/.env` and
      `server/.env`.
- [x] `git ls-files | grep -iE '\.env$|\.pem$|id_rsa'` prints nothing.
- [x] `.env.example` is committed, with **placeholder** values only.
      `client/.env.example` and `server/.env.example` both hold
      `https://YOUR-PROJECT-REF.supabase.co` and `your-publishable-or-anon-key`.
- [x] No connection string, key or password anywhere in the repository,
      including in a screenshot. I searched `client/`, `server/`, `api/` and
      `vercel.json` for `sb_secret`, `service_role`, `postgres://`, `eyJhbGci`
      and my project ref and found none. The six screenshots show only the app's
      own screens.
- [x] No `student.json`, and no name, student number or email of yours or
      anyone else's. There is no `student.json` and no student number. The only
      email addresses in the repository are `you@example.com` placeholders. My
      full name is in one place, `LICENSE`, where the template asks for it. The
      Settings and Export screenshots had my name and age on them, and those
      are now blurred; the dashboard screenshot shows a first name only.

## The application

- [x] Every SQL query is parameterised. The server never builds SQL from
      strings. Every query goes through the Supabase client's query builder or
      a database function called with named arguments, and `schema.sql` has no
      dynamic `execute`.
- [x] Input is validated **on the server**, not only in React, with length
      limits on every text field. `server/validate.js` checks each body before
      it reaches the database: job name 1 to 60, milestone title 1 to 80, the
      day's note up to 2000, an expense label up to 120, names 1 to 60. A body
      over 100 KB is refused with 413.
- [x] CORS names its origins. The server sends no CORS headers at all, so a
      browser only allows requests from the app's own origin. There is no
      `cors()` call, which is stricter than a list: the client reaches the API
      on the same origin, through the Vite proxy locally and a Vercel rewrite
      when deployed.
- [x] `NODE_ENV=production` on the host, and no stack trace in any response
      body. Vercel sets it for the deployed function. The error handler in
      `server/errors.js` logs the error on the server and sends only
      `{"error": "Something went wrong on our side."}`.
- [x] `helmet` installed. `api.use(helmet())` in `server/app.js` puts its
      headers on every API answer: `X-Content-Type-Options: nosniff`,
      `X-Frame-Options`, `Strict-Transport-Security` and a content security
      policy. It is mounted on the `/api` router, not the whole app, because
      the same app serves the built pages when run locally and the default
      policy would stop them reaching Supabase.
- [x] Anything that costs money or accepts a password is rate limited. Nothing
      in the app costs money. Passwords never reach my API: sign-in, signup
      codes and password resets go to Supabase Auth, which rate limits them
      itself. My own API allows 300 requests per address per 15 minutes
      (`express-rate-limit` in `server/app.js`) and answers 429 with a
      `Retry-After` header after that. I tested it: request 301 came back 429.
- [x] Passwords are hashed with bcrypt and never logged. WorkBud never stores
      or sees a stored password: Supabase Auth holds them, hashed with bcrypt.
      No `console` call in the client or the server mentions a password.
- [x] Every route that touches somebody's data has the ownership check **in
      the query**. It lives one level lower than `AND user_id = $2`: all five
      tables have Row Level Security on, with policies scoped to `auth.uid()`,
      and the server queries as the signed-in user, not with an admin key. A
      route that forgot the check would still get no rows back.
- [x] `npm audit` run once, and the easy fixes taken. Run on October 9, 2026.
      The server had 0 findings. The client had 4 (1 low, 1 moderate, 2 high),
      all in build tooling and none in what ships to the browser. `npm audit
      fix` cleared all four without changing `package.json`, and both now
      report 0.

## Privacy

- [x] **No real classmates' names, numbers, emails or photos**, anywhere. The
      seed example in the README uses `you@example.com` and a job called
      "Sample OJT". The onboarding screenshot uses the placeholder name "Juan
      Dela Cruz". The only real person in any screenshot is me, by first name
      on the dashboard.
- [x] Seed data is invented. There is no seed script. The optional SQL in the
      README inserts one made-up job, one day and one jeepney fare.
- [ ] If real people tested your app, their data is deleted before you submit.
      Not done yet. The database holds 16 accounts, and 3 of them have logged
      days. The ones that are not mine need to be removed before submitting.
- [ ] If your app collects anything about anyone, the app says what it
      collects. Only partly. The signup screen says what mail WorkBud sends
      ("That code and password resets are the only mail WorkBud sends"), but
      there is no line saying what is stored: name, age, occupation, hours,
      expenses and an optional photo.
- [x] Any face in a screenshot is stock, generated, or yours. No screenshot has
      a face in it. The only photo is the profile picture on my own account, in
      the Settings and Export screenshots, and it is a landscape.

WorkBud handles personal information about real people, so it is inside the
Philippine Data Privacy Act. It collects the minimum it needs to track hours
and spending, each user can only read their own rows, and a user can delete
their account and everything in it from Settings.

## The tradeoff I accepted

The riskiest thing about WorkBud is that the Supabase key in the browser is
public by design, so anyone can read it from the built JavaScript. What I did
about it is put the protection in the database instead of in secrecy: Row Level
Security is on for every table, the server queries as the signed-in user and
holds no admin key, and I tested it signed out, where every table returned
nothing and an insert was refused. What I knowingly accepted is a rate limit
that is counted in memory. On Vercel that count lives inside one function
instance, so it resets when the instance is recycled and is not shared between
instances. It stops a simple loop, not a determined one, and I accepted that
because each user can only reach their own rows. A shared store for the count
is the first thing I would add.
