import path from 'node:path'

// Local runs read server/.env, found from this file rather than from wherever
// the process was started, so `npm start` works from the repository root too.
// On Vercel the file doesn't exist and the values come from the project's
// environment variables instead.
try {
  process.loadEnvFile(path.join(import.meta.dirname, '.env'))
} catch {
  /* no .env: rely on the real environment */
}

// The VITE_ names are accepted as a fallback so a host that already has them
// set for the client build needs nothing more. Both are public by design: the
// anon key grants nothing on its own, and every table is behind Row Level
// Security.
export const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY

export const PORT = Number(process.env.PORT) || 3001

if (
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY ||
  SUPABASE_URL.includes('YOUR-PROJECT-REF')
) {
  throw new Error(
    'Supabase is not configured. Copy server/.env.example to server/.env and fill in the project URL and anon key.',
  )
}
