import { createClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js'
import { HttpError, unwrap } from './errors.js'

// The server holds no session of its own, so nothing is stored or refreshed.
const options = { auth: { persistSession: false, autoRefreshToken: false } }

/** Signed-out client: verifies tokens and answers the health check. */
export const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, options)

/**
 * A client that queries as the signed-in user. Forwarding their token rather
 * than using a service-role key means Row Level Security still applies to
 * every query the server runs: a bug in a route can't leak another user's rows.
 */
export function clientFor(token) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    ...options,
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

/**
 * The DELETE /:id handler for one table. Row Level Security hides other
 * users' rows, so a delete that matched nothing means the row is missing or is
 * not the caller's. Either way the answer is a 404.
 */
export const removeById = (table) => async (req, res) => {
  const gone = unwrap(await req.db.from(table).delete().eq('id', req.params.id).select('id'))
  if (gone.length === 0) throw new HttpError(404, 'Not found.')
  res.status(204).end()
}
