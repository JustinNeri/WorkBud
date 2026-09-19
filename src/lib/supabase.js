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

/* ---------------------------------------------------------------------------
   "Remember me"

   supabase-js decides where a session is written once, when the client is
   built — there is no per-sign-in switch to flip. So the checkbox can't be
   passed to signInWithPassword; it has to change what the client's storage
   does. The adapter below routes to localStorage when the box is ticked and
   sessionStorage when it isn't, which is the actual difference the user is
   asking for: a token in sessionStorage dies with the browser.

   The preference itself lives in localStorage, because it has to outlive the
   browser it is describing. Absent means remembered — every existing session
   predates this flag, and reading a missing flag as "false" would sign the
   whole userbase out on deploy.

   Every access is wrapped: Storage throws outright in some privacy modes, and
   being unable to remember someone is never worth a crash on the sign-in
   screen.
--------------------------------------------------------------------------- */

const REMEMBER_KEY = 'wb-remember'

/** supabase-js names its token keys sb-<project-ref>-auth-token. */
const isAuthKey = (key) => key.startsWith('sb-') && key.includes('-auth-token')

/** Drop any Supabase token sitting in the store we're no longer using. */
function clearTokens(store) {
  try {
    // Object.keys snapshots first, so removing while iterating is safe.
    for (const key of Object.keys(store)) {
      if (isAuthKey(key)) store.removeItem(key)
    }
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

export function isRemembered() {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== 'false'
  } catch {
    return true
  }
}

/**
 * Record the choice and evict the token from the store that is now the wrong
 * one. Call this BEFORE signing in — the adapter reads the flag at write
 * time, so setting it afterwards would file the new token in the old place.
 */
export function rememberSession(value) {
  try {
    localStorage.setItem(REMEMBER_KEY, value ? 'true' : 'false')
  } catch {
    /* can't persist the preference; the session still lands correctly below */
  }
  clearTokens(value ? sessionStorage : localStorage)
}

const activeStore = () => (isRemembered() ? localStorage : sessionStorage)

const rememberAwareStorage = {
  getItem: (key) => {
    try {
      return activeStore().getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key, value) => {
    try {
      activeStore().setItem(key, value)
    } catch {
      /* unwritable storage: the session stays in memory for this tab */
    }
  },
  // Always clear both. Signing out must not leave a copy behind in whichever
  // store happens to be inactive right now.
  removeItem: (key) => {
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
    try {
      sessionStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  },
}

export const supabase = isConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: rememberAwareStorage,
      },
    })
  : null

/** Supabase errors are objects; pull something a human can read out of them. */
export function errorMessage(error, fallback = 'Something went wrong.') {
  if (!error) return fallback
  return error.message || error.error_description || fallback
}
