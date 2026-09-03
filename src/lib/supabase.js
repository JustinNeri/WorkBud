import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * False when .env.local is missing or still holds the placeholder values.
 * App.jsx shows a setup card instead of a blank screen when this is false.
 */
export const isConfigured = Boolean(
  url && anonKey && !url.includes('YOUR-PROJECT-REF'),
)

export const supabase = isConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

/** Supabase errors are objects; pull something a human can read out of them. */
export function errorMessage(error, fallback = 'Something went wrong.') {
  if (!error) return fallback
  return error.message || error.error_description || fallback
}
