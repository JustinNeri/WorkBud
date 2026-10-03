/** An error that already knows which HTTP status it should become. */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

// Postgres and PostgREST error codes that are the caller's fault, and the
// status each one maps to. Anything not listed is treated as a server fault.
const DB_STATUS = {
  PGRST116: 404, // .single() matched no row: missing, or not the caller's
  PGRST301: 401, // token rejected by the database
  42501: 403, // insufficient privilege
  23505: 409, // unique violation
  23502: 400, // not-null violation
  23503: 400, // foreign key points at nothing
  23514: 400, // check constraint
  22003: 400, // number out of range
  22007: 400, // malformed date or time
  22008: 400, // date or time out of range
  '22P02': 400, // malformed uuid, number, etc.
}

const DB_MESSAGE = {
  404: 'Not found.',
  401: 'Your session has expired. Sign in again.',
  403: 'You are not allowed to do that.',
  409: 'That already exists.',
  400: 'The database rejected those values.',
}

/**
 * Unwrap a Supabase result: hand back the data, or throw the HTTP error its
 * failure maps to. The raw database message is logged, never sent, so table
 * and constraint names don't reach the client.
 */
export function unwrap({ data, error }) {
  if (!error) return data
  const status = DB_STATUS[error.code]
  if (status) throw new HttpError(status, DB_MESSAGE[status])
  console.error('Database error:', error)
  throw new HttpError(500, 'Something went wrong on our side.')
}

/** Unmatched /api path. */
export function notFound(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` })
}

/** Last middleware: every thrown error ends up here as JSON. */
// Express recognises an error handler by its four arguments.
// oxlint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res
      .status(err.status)
      .json({ error: err.message, ...(err.details && { details: err.details }) })
  }
  // Thrown by express.json() for a body it can't parse or that is too large.
  if (err.type === 'entity.parse.failed')
    return res.status(400).json({ error: 'The request body is not valid JSON.' })
  if (err.type === 'entity.too.large')
    return res.status(413).json({ error: 'The request body is too large.' })

  console.error(err)
  res.status(500).json({ error: 'Something went wrong on our side.' })
}
