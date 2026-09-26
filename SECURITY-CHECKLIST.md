# Security checklist

WorkBud. Checked on September 27, 2026, against the `main` branch of
https://github.com/JustinNeri/WorkBud and the live Supabase project.

## Secrets and credentials

| # | Check | Yes / No / N/A | Evidence |
|---|---|---|---|
| 1 | .env is gitignored and is not in the repository | Yes | `.gitignore` lines 6 and 7 list `.env` and `.env.local`, and `git ls-files` shows only `.env.example`. |
| 2 | A .env.example with placeholder values only is committed | Yes | `.env.example` holds `https://YOUR-PROJECT-REF.supabase.co` and `your-publishable-or-anon-key`, nothing real. |
| 3 | No connection string, key, token or password is hardcoded in source, comments or commented-out code | Yes | I searched `src/`, `public/`, `supabase/`, `index.html`, `vite.config.js` and `vercel.json` for `sb_secret`, `service_role`, `postgres://`, `eyJhbGci` and my project ref, and found none. `src/lib/supabase.js` reads both values from `import.meta.env`. |
| 4 | Git history is clean: I searched git log -p for password, secret, api key and postgres:// | Yes | Across all branches `secret`, `api key`, `api_key` and `postgres://` match zero commits. `password` matches only UI text such as "Reset your password", and my real project ref and anon key appear in no commit. |
| 5 | Any credential that was ever committed has been rotated | N/A | No credential has ever been committed (row 4), so there is nothing to rotate. |
| 6 | Production credentials live only in my hosting provider's environment settings | Yes | `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in the Vercel project settings. `vercel.json` holds only rewrites and cache headers, and no server-side secret exists anywhere in the app. |

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
| 13 | Every query taking user input uses parameters, never string concatenation | Yes | The client never builds SQL. Every call goes through the supabase-js query builder (`.eq`, `.insert`, `.update`), and the one function call passes a named parameter: `rpc('email_registered', { p_email })`. |
| 14 | The database is not open to the whole internet, or is reachable only by the app | No | Supabase's REST API is reachable from anywhere by design, and its anon key ships in the app bundle. What protects the data is Row Level Security (row 19), not network isolation. I have not turned on Supabase network restrictions for the direct Postgres port. |
| 15 | The database user the app connects as has only the permissions it needs | Yes | The app connects only as Supabase's `anon` and `authenticated` roles. `schema.sql` section 6 grants `authenticated` just what each table needs: `profiles` gets select and update only, with no insert or delete. RLS scopes every row to `auth.uid()`. |
| 16 | Seed and sample data is invented, not real people's data | Yes | The only sample data is the optional snippet in the README, using `you@example.com`, "Sample OJT" and "Jeepney fare". The repo contains no data dump. |
| 17 | Debug, seed and reset routes are removed before going public | Yes | `App.jsx` defines only `/login`, `/signup`, `/forgot-password` and `/dashboard`. There is no debug, seed or reset route, and "forgot password" is a user feature that goes through Supabase Auth. |

## Access control

| # | Check | Yes / No / N/A | Evidence |
|---|---|---|---|
| 18 | The app has an access layer: Cloudflare Zero Trust, an app-level password, or a real login | Yes | It has a real login: Supabase Auth email and password, with signup confirmed by an emailed 6-digit code. `/dashboard` sits behind the `RequireSession` guard in `App.jsx`. |
| 19 | If Supabase or Firebase: Row Level Security or security rules are on, and I tested it signed out | Yes | RLS is enabled on all five tables (`schema.sql` lines 172 to 175 and 331). I tested signed out with only the anon key: all five tables returned `[]`, and an insert into `jobs` was refused with "new row violates row-level security policy". |
| 20 | If Zero Trust: tjakoen.s@gmail.com is on the access policy. If an app password: the credentials are in my private workspace project/README.md | N/A | I use neither Zero Trust nor an app password. WorkBud has a real login with open signup, so a reviewer can create their own account at https://workbud-ph.vercel.app/signup. |
| 21 | The gate covers every route, including the ones that only change data | Yes | Every table has separate RLS policies for select, insert, update and delete, each checking `auth.uid() = user_id`. Storage writes (insert, update, delete) are limited to the user's own `<user id>/` folder. |
| 22 | The credentials for the gate are environment variables, not in source | Yes | Supabase Auth is the gate, and the app reaches it through `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the environment (`src/lib/supabase.js`). No password or key is in source. |

## Input and output

| # | Check | Yes / No / N/A | Evidence |
|---|---|---|---|
| 23 | Input from the user is validated on the server, not only in the browser | Yes | Postgres check constraints in `schema.sql` enforce the rules whatever the browser sends: job name 1 to 60 characters, hours 0 to 24, amounts 0 or more, expense category from a fixed list, label up to 120 characters, age 10 to 120. RLS also rejects rows for another user. |
| 24 | User-supplied text is escaped when rendered, so it cannot inject markup or script | Yes | React escapes everything rendered in JSX, and there is no `dangerouslySetInnerHTML`. The one raw HTML path, the printable export (`document.write` in `ExportSheet.jsx`), runs every user field through `esc()` in `src/lib/export.js`: job name, notes, expense labels and occupation. |
| 25 | Error responses do not expose stack traces, file paths or connection details | Yes | I run no server of my own. The UI shows only the message text of a Supabase error, via `errorMessage()` in `src/lib/supabase.js`, never a stack trace or connection string. |
| 26 | CORS is not a wildcard on routes that change data | N/A | I have no server or API routes of my own. The only data API is Supabase's, which enforces RLS on every request whatever the origin. |

## Repository and privacy

| # | Check | Yes / No / N/A | Evidence |
|---|---|---|---|
| 27 | No student number, personal email, phone number or home address in the repository or in commit messages | No | No tracked file and no commit message contains any of these. However, the author email on every commit is my personal Gmail address, and it is visible in the public history. |
| 28 | No classmate's personal data in the repository | Yes | The repo holds only code, the schema and docs. No names, screenshots or records of anyone else. |
| 29 | Dependencies come from official registries, and node_modules is gitignored | Yes | All 458 `resolved` entries in `package-lock.json` point to `https://registry.npmjs.org`, and `node_modules` is line 1 of `.gitignore`. |
| 30 | Images, fonts and other assets are mine, licensed, or credited | Yes | The logo and icons in `design/logo/` and `public/` are my own. UI icons come from `lucide-react` (ISC licence). The font is the device's system font stack in `src/index.css`, so no font files are bundled. |
| 31 | Repository visibility is deliberate, and I checked it after my last push | Yes | The repo is public on purpose so it can be reviewed. The GitHub API reported `"visibility": "public"` when I checked on September 27. |

## Anything I found and fixed

The checklist caught something I did not know about. The `avatars` storage bucket can be listed by anyone who is not signed in, and because each user's folder is named after their user ID, that listing exposes every account's ID. The cause is the `avatars_read_all` policy in `schema.sql`, which gives signed-out users SELECT on the bucket. The app never needs that, because profile pictures load through public URLs, which work without any policy. I have not fixed it yet: the fix is to limit that policy to each user's own folder. It also caught that my personal email is the author address on every commit; the fix going forward is GitHub's no-reply address, since changing existing commits would mean rewriting public history.
