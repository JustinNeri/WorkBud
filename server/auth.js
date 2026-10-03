import { anon, clientFor } from './db.js'
import { HttpError } from './errors.js'

/**
 * Every data route sits behind this. The browser sends the access token that
 * Supabase Auth issued at sign-in; it is checked with Supabase here, and the
 * route then gets `req.user` and a database client acting as that user.
 */
export async function requireAuth(req, res, next) {
  const [scheme, token] = (req.get('authorization') ?? '').split(' ')
  if (scheme !== 'Bearer' || !token)
    throw new HttpError(401, 'Sign in to continue.')

  const { data, error } = await anon.auth.getUser(token)
  if (error || !data?.user) {
    // A rejected token carries a 4xx. Anything else is the auth service being
    // unreachable, which must not read as "you are signed out".
    if (error?.status >= 400 && error.status < 500)
      throw new HttpError(401, 'Your session has expired. Sign in again.')
    console.error('Auth check failed:', error)
    throw new HttpError(503, 'Could not verify your session. Try again shortly.')
  }

  req.user = data.user
  req.db = clientFor(token)
  next()
}
