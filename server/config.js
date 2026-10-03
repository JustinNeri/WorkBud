// Local runs read the same .env.local the Vite app does, so there is one file
// to fill in. On Vercel the file doesn't exist and the values come from the
// project's environment variables instead.
try {
  process.loadEnvFile('.env.local')
} catch {
  /* no .env.local: rely on the real environment */
}

// The VITE_ names are accepted as a fallback so the two values only have to be
// set once. Both are public by design: the anon key grants nothing on its own,
// and every table is behind Row Level Security.
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
    'Supabase is not configured. Copy .env.example to .env.local and fill in the project URL and anon key.',
  )
}
