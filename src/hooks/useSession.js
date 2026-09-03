import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * The persisted Supabase session.
 *
 * getSession() reads the token supabase-js already restored from localStorage,
 * so a returning user never sees the auth screen flash before the dashboard.
 */
export function useSession() {
  const [session, setSession] = useState(null)
  // Nothing to restore without a client, so start settled in that case.
  const [loading, setLoading] = useState(() => Boolean(supabase))

  useEffect(() => {
    if (!supabase) return

    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })

    // Fires on sign-in, sign-out, and silent token refresh.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return
      setSession(next)
      setLoading(false)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return { session, loading }
}
