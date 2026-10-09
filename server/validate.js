import { HttpError } from './errors.js'

/* ---------------------------------------------------------------------------
   Request validation.

   A schema is a plain object of field name -> check. A check takes the raw
   value and returns either { value } (cleaned) or { error } (a short reason).
   parse() runs a body through a schema and returns only the fields the schema
   names, so a client can never set a column it wasn't offered (user_id, id,
   created_at and so on).

   The limits mirror the check constraints and column sizes in
   db/schema.sql. The database would refuse the same values, but checking
   here means the caller gets a 400 that names the field instead of a bare
   constraint failure.
--------------------------------------------------------------------------- */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

const ok = (value) => ({ value })
const bad = (error) => ({ error })

/** Wrap a check so that null is either passed through or refused up front. */
const field = (nullable, check) => (raw) => {
  if (raw === null || raw === undefined)
    return nullable ? ok(null) : bad('is required')
  return check(raw)
}

export const text = ({ min = 0, max, nullable = false }) =>
  field(nullable, (raw) => {
    if (typeof raw !== 'string') return bad('must be text')
    const value = raw.trim()
    if (value.length < min || value.length > max)
      return bad(
        min > 0 ? `must be ${min} to ${max} characters` : `must be at most ${max} characters`,
      )
    return ok(value)
  })

export const number = ({ min, max, integer = false, nullable = false }) =>
  field(nullable, (raw) => {
    // Numbers only: "8" from a form should have been converted by the client,
    // and accepting strings here would let "" slip through as 0.
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return bad('must be a number')
    if (integer && !Number.isInteger(raw)) return bad('must be a whole number')
    if (raw < min || raw > max) return bad(`must be between ${min} and ${max}`)
    return ok(raw)
  })

export const boolean = () =>
  field(false, (raw) => (typeof raw === 'boolean' ? ok(raw) : bad('must be true or false')))

export const oneOf = (allowed) =>
  field(false, (raw) =>
    allowed.includes(raw) ? ok(raw) : bad(`must be one of: ${allowed.join(', ')}`),
  )

export const uuid = () =>
  field(false, (raw) =>
    typeof raw === 'string' && UUID.test(raw) ? ok(raw) : bad('must be a valid id'),
  )

/** A calendar date as YYYY-MM-DD. Rejects well-formed nonsense like 2025-02-30. */
export const date = ({ nullable = false } = {}) =>
  field(nullable, (raw) => {
    if (typeof raw !== 'string' || !DATE.test(raw)) return bad('must be a date (YYYY-MM-DD)')
    const parsed = new Date(`${raw}T00:00:00Z`)
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw)
      return bad('is not a real date')
    return ok(raw)
  })

/** A time of day as HH:MM or HH:MM:SS. */
export const time = ({ nullable = false } = {}) =>
  field(nullable, (raw) =>
    typeof raw === 'string' && TIME.test(raw) ? ok(raw) : bad('must be a time (HH:MM)'),
  )

/** A full ISO timestamp, normalised to UTC. */
export const timestamp = ({ nullable = false } = {}) =>
  field(nullable, (raw) => {
    const parsed = typeof raw === 'string' ? Date.parse(raw) : NaN
    return Number.isNaN(parsed) ? bad('must be a timestamp') : ok(new Date(parsed).toISOString())
  })

/** Mark a field as one a create request must include. */
export const required = (check) => Object.assign((raw) => check(raw), { required: true })

/** Throw a 400 that names each offending field. */
export function invalid(details) {
  const summary = Object.entries(details)
    .map(([name, reason]) => `${name} ${reason}`)
    .join('; ')
  throw new HttpError(400, `Invalid input: ${summary}.`, details)
}

/**
 * Validate `body` against `schema` and return the cleaned fields.
 * With `partial` (PATCH), missing fields are simply left out; without it
 * (POST), fields marked required() must be present. A PATCH that changes
 * nothing is refused unless `allowEmpty` says the body carries something else.
 */
export function parse(schema, body, { partial = false, allowEmpty = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new HttpError(400, 'The request body must be a JSON object.')

  const values = {}
  const details = {}
  for (const [name, check] of Object.entries(schema)) {
    if (!(name in body)) {
      if (!partial && check.required) details[name] = 'is required'
      continue
    }
    const result = check(body[name])
    if (result.error) details[name] = result.error
    else values[name] = result.value
  }

  if (Object.keys(details).length) invalid(details)
  if (partial && !allowEmpty && Object.keys(values).length === 0)
    throw new HttpError(400, 'Nothing to update: send at least one field.')
  return values
}

/** Route param guard: a malformed id is a 400, not a database error. */
export function checkId(req, res, next, id) {
  if (!UUID.test(id)) throw new HttpError(400, 'That id is not valid.')
  next()
}

/** Validate optional query-string filters with the same checks as a body. */
export function parseQuery(schema, query) {
  const present = Object.fromEntries(
    Object.keys(schema)
      .filter((name) => query[name] !== undefined)
      .map((name) => [name, query[name]]),
  )
  return Object.keys(present).length ? parse(schema, present, { partial: true }) : {}
}
