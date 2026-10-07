# Security checklist

WorkBud. Checked on September 27, 2026, against the `main` branch of
https://github.com/JustinNeri/WorkBud and the live Supabase project.

Rows 3, 6, 13, 15, 17, 21, 22, 23, 25, 26 and 29 were checked again on
October 3, 2026, after the Express API server in `server/` was added.

## Secrets and credentials

| # | Check | Yes / No / N/A | Evidence |
|---|---|---|---|
| 1 | .env is gitignored and is not in the repository | Yes | `.gitignore` lines 6 and 7 list `.env` and `.env.local`, and `git ls-files` shows only `.env.example`. |
| 2 | A .env.example with placeholder values only is committed | Yes | `.env.example` holds `https://YOUR-PROJECT-REF.supabase.co` and `your-publishable-or-anon-key`, nothing real. |
| 3 | No connection string, key, token or password is hardcoded in source, comments or commented-out code | Yes | I searched `src/`, `server/`, `api/`, `public/`, `supabase/`, `index.html`, `vite.config.js` and `vercel.json` for `sb_secret`, `service_role`, `postgres://`, `eyJhbGci` and my project ref, and found none. `src/lib/supabase.js` reads both values from `import.meta.env`, and `server/config.js` reads them from `process.env`. |
| 4 | Git history is clean: I searched git log -p for password, secret, api key and postgres:// | Yes | I searched `git log -p` on `main` for each term. The only matches for `secret`, `api key`, `api_key` and `postgres://` are in documentation, where those words appear in prose: this checklist, the README, `AI-USAGE.md` and `REPORT.md`. `password` otherwise matches only UI text such as "Reset your password". My real project ref and anon key appear in no commit. |
| 5 | Any credential that was ever committed has been rotated | N/A | No credential has ever been committed (row 4), so there is nothing to rotate. |
| 6 | Production credentials live only in my hosting provider's environment settings | Yes | `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in the Vercel project settings. `vercel.json` holds only rewrites and cache headers. The API server reads the same two public values and nothing else: it uses no service-role key, so no server-side secret exists anywhere in the app. |

## GitHub Actions

The project has no workflows: there is no `.github/` folder and `git ls-files` lists nothing under it. Every row in this section is N/A for that reason.

| # | Check | Yes / No / N/A | Evidence |
|---|---|---|---|
| 7 | No secret value is written literally in any workflow YAML file | N/A | No workflows exist. |
| 8 | Secrets are stored in repository Actions secrets and read with `${{ secrets.NAME }}` | N/A | No workflows exist. |
| 9 | No workflow step echoes, dumps or debug-prints a secret, and I opened a recent run's log to confirm | N/A | No workflows exist, so there are no runs. |
| 10 | Uploaded build artifacts contain no .env, key file or generated config | N/A | No workflows exist, so nothing is uploaded. Vercel builds from source. |
| 11 | Third-party actions are pinned to a commit SHA, not a moveable tag | N/A | No workflows exist, so no actions are used. |
| 12 | Secret scanning and push protection are enabled on the repository | N/A | Marked N/A with the rest of this section, as the template directs for projects with no workflows. |

## Database

| # | Check | Yes / No / N/A | Evidence |
|---|---|---|---|
| 13 | Every query taking user input uses parameters, never string concatenation | Yes | Neither the client nor the server builds SQL. Every query in `server/routes/` goes through the supabase-js query builder (`.eq`, `.insert`, `.update`), which sends values as parameters, and ids from the URL are checked against a UUID pattern first (`checkId` in `server/validate.js`). The two function calls that take input pass named parameters: `rpc('email_registered', { p_email })` and `rpc('save_log', { p_log_id, p_job_id, p_fields, p_expenses })`. `save_log` itself (`schema.sql` section 13) is fixed SQL: it never builds a statement from its arguments. |
| 14 | The database is not open to the whole internet, or is reachable only by the app | Yes | The database itself is not open to the internet: on October 3 I turned on Supabase network restrictions, so the direct Postgres port refuses every outside IP. The only way in is Supabase's HTTPS API, which is the path the app and my API server use. That API is public by design and its anon key ships in the app bundle, but it returns nothing without a signed-in user's token, and Row Level Security limits each user to their own rows (row 19, tested signed out). |
| 15 | The database user the app connects as has only the permissions it needs | Yes | The browser and the API server both connect only as Supabase's `anon` and `authenticated` roles. The server forwards the signed-in user's token (`clientFor` in `server/db.js`) instead of using a service-role key. `schema.sql` section 6 grants `authenticated` just what each table needs: `profiles` gets select and update only, with no insert or delete. RLS scopes every row to `auth.uid()`. |
| 16 | Seed and sample data is invented, not real people's data | Yes | The only sample data is the optional seed snippet in my documentation (section 2.7), using `you@example.com`, "Sample OJT" and "Jeepney fare". The repo contains no seed file or data dump. |
| 17 | Debug, seed and reset routes are removed before going public | Yes | `App.jsx` defines only `/login`, `/signup`, `/forgot-password` and `/dashboard`. The API in `server/app.js` mounts only `/api/health`, `/api/profile`, `/api/jobs`, `/api/logs`, `/api/milestones` and `/api/account`. There is no debug, seed or reset route, and "forgot password" is a user feature that goes through Supabase Auth. |

## Access control

| # | Check | Yes / No / N/A | Evidence |
|---|---|---|---|
| 18 | The app has an access layer: Cloudflare Zero Trust, an app-level password, or a real login | Yes | It has a real login: Supabase Auth email and password, with signup confirmed by an emailed code. `/dashboard` sits behind the `RequireSession` guard in `App.jsx`. |
| 19 | If Supabase or Firebase: Row Level Security or security rules are on, and I tested it signed out | Yes | RLS is enabled on all five tables (`schema.sql` lines 178 to 181 and 345). I tested signed out with only the anon key: all five tables returned `[]`, and an insert into `jobs` was refused with "new row violates row-level security policy". |
| 20 | If Zero Trust: tjakoen.s@gmail.com is on the access policy. If an app password: the credentials are in my private workspace project/README.md | N/A | I use neither Zero Trust nor an app password. WorkBud has a real login with open signup, so a reviewer can create their own account at https://workbud-ph.vercel.app/signup. |
| 21 | The gate covers every route, including the ones that only change data | Yes | Every API route except `/api/health` sits behind `requireAuth` (`server/app.js`), which checks the access token with Supabase before any handler runs. I tested it signed out: `GET /api/jobs` and `OPTIONS /api/jobs` both return 401. Behind that, every table has separate RLS policies for select, insert, update and delete, each checking `auth.uid() = user_id`. Storage writes (insert, update, delete) are limited to the user's own `<user id>/` folder. |
| 22 | The credentials for the gate are environment variables, not in source | Yes | Supabase Auth is the gate, and the app reaches it through `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the environment (`src/lib/supabase.js` in the browser, `server/config.js` on the server). No password or key is in source. |

## Input and output

| # | Check | Yes / No / N/A | Evidence |
|---|---|---|---|
| 23 | Input from the user is validated on the server, not only in the browser | Yes | The API server validates every request body in `server/validate.js` before it reaches the database, and answers 400 naming the field that failed. It only accepts the fields each route lists, so a request cannot set `user_id` or `id`. I tested it: a job with a blank name, text for `target_hours`, a negative `hourly_rate` and the date `2025-02-30` came back 400 with all four fields named. Behind that, Postgres check constraints in `schema.sql` enforce the rules whatever is sent: job name 1 to 60 characters, hours 0 to 24, amounts 0 or more, expense category from a fixed list, label up to 120 characters, age 10 to 120. RLS also rejects rows for another user. |
| 24 | User-supplied text is escaped when rendered, so it cannot inject markup or script | Yes | React escapes everything rendered in JSX, and there is no `dangerouslySetInnerHTML`. The one raw HTML path, the printable export (`document.write` in `ExportSheet.jsx`), runs every user field through `esc()` in `src/lib/export.js`: job name, notes, expense labels and occupation. |
| 25 | Error responses do not expose stack traces, file paths or connection details | Yes | The error handler in `server/errors.js` sends only a status code and a short message. Database errors are logged on the server and replaced with a generic message (`unwrap`), so table names, constraint names and stack traces never reach the browser. I tested malformed JSON, a bad id and an unknown route: each returned one line of JSON and nothing else. The `X-Powered-By` header is turned off. A review on October 8 found one gap, now closed: when `npm start` serves the built app, a page URL with a broken escape (`/%E0%A4%A`) reached Express's default error page, which printed a stack trace with file paths. `server/index.js` now registers the same error handler after the page routes. Tested after the fix: that URL returns status 400 and one line of JSON, and a body in an unknown charset returns 415 the same way. |
| 26 | CORS is not a wildcard on routes that change data | Yes | The API server sends no CORS headers at all, so browsers only allow requests from the app's own origin. The web app reaches it on the same origin (the Vite proxy locally, a Vercel rewrite when deployed). I tested a request with `Origin: https://evil.example`: the response carried no `Access-Control-Allow-Origin` header. |

## Repository and privacy

| # | Check | Yes / No / N/A | Evidence |
|---|---|---|---|
| 27 | No student number, personal email, phone number or home address in the repository or in commit messages | Yes | No tracked file and no commit message contains any of these. This row was a No at first: my personal Gmail was the author address on every commit, and a settings screenshot showing it had been committed. On October 3 I rewrote the history of both branches, so every commit now uses my GitHub no-reply address and only the blurred screenshot exists in any commit. `git log --all --format=%ae` on a fresh clone lists no Gmail address. |
| 28 | No classmate's personal data in the repository | Yes | The repo holds only code, the schema and docs. No names, screenshots or records of anyone else. |
| 29 | Dependencies come from official registries, and node_modules is gitignored | Yes | All 524 `resolved` entries in `package-lock.json` point to `https://registry.npmjs.org`, and `node_modules` is line 1 of `.gitignore`. |
| 30 | Images, fonts and other assets are mine, licensed, or credited | Yes | The logo and icons in `design/logo/` and `public/` are my own. UI icons come from `lucide-react` (ISC licence). The font is the device's system font stack in `src/index.css`, so no font files are bundled. |
| 31 | Repository visibility is deliberate, and I checked it after my last push | Yes | The repo is public on purpose so it can be reviewed. The GitHub API reported `"visibility": "public"` when I checked on September 27. |

## Anything I found and fixed

The checklist caught something I did not know about. The `avatars` storage bucket can be listed by anyone who is not signed in, and because each user's folder is named after their user ID, that listing exposes every account's ID. The cause is the `avatars_read_all` policy in `schema.sql`, which gives signed-out users SELECT on the bucket. The app never needs that, because profile pictures load through public URLs, which work without any policy. I have not fixed it yet: the fix is to limit that policy to each user's own folder. It also caught that my personal email was the author address on every commit. I first planned to only switch to GitHub's no-reply address going forward, but on October 3 I rewrote the history instead, so the old commits no longer carry it either. The code in every commit is unchanged; only the author address, the commit IDs and one old screenshot changed.
